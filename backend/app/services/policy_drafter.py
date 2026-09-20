"""F2 -- turns a plain-English instruction into a proposed policy YAML edit.

The result is always shown to the user as a diff to confirm (see
routers/policies.py's /policy/draft endpoint and the dashboard's Policy
page) -- this module never writes to the database itself. That matters
because the policy engine (services/policy_engine.py) can only match on
an event's `action_type`/`action_name` strings via fnmatch globs; it has
no visibility into an event's `inputs` payload (amounts, customer ids,
etc.). An instruction like "require approval for refunds over $500" is
not expressible here, and silently inventing a `match` field the engine
never checks would produce a rule that looks right and does nothing --
worse than refusing. The prompt below tells the model to say so instead.

Callers should pass `known_actions` -- the workspace's actually-logged
action_type/action_name pairs (see routers/policies.py) -- so a vague,
non-technical description ("money related stuff") can be matched against
real action names by meaning, instead of the model asking the user for an
exact identifier they have no way of knowing.

Runs on Ollama Cloud (OpenAI-compatible /v1/chat/completions), same
provider as evidence_drafter.py (both features share one LLM key now --
only classification.py's per-event PII redaction pass still runs on
Anthropic Haiku, unrelated to either drafting feature). This is a backend
setting (app/config.py's ollama_* fields): the key belongs on this
service, not on the dashboard/Vercel side, which never calls an LLM
directly.
"""

import json

import httpx
from pydantic import BaseModel

from app.config import get_settings
from app.services.policy_engine import PolicyParseError, parse_policy

_SYSTEM_PROMPT = """You edit Tracyn policy YAML from a plain-English instruction. Most people \
writing these instructions are NOT engineers and have no idea what their own agent's internal \
action_type/action_name strings are -- they describe things the way a human would ("money \
related stuff", "anything that emails a customer"), not by exact identifier. Your job is to map \
that description onto the workspace's REAL, already-logged actions (given to you below) rather \
than asking the user for identifiers they don't have.

Tracyn lets an AI agent's actions run automatically or blocks on a human approval, decided by \
this policy. A policy mistake either lets a risky action run unattended or blocks a harmless \
one -- getting this wrong is a real security/operational issue, not a cosmetic one, so be \
conservative rather than clever about WHICH DIRECTION a rule goes (require_approval true/false). \
But be generous and helpful about WHICH ACTIONS a vague description should match -- that part is \
what makes this feature usable by non-technical people at all.

The exact schema (nothing else is valid):

    rules:
      - match:
          action_type: external   # and/or action_name
        require_approval: true    # or false

Rules:
- `match` may contain `action_type`, `action_name`, or both. There is NO other matchable \
field -- the engine never looks at an event's inputs/output/cost/amount/customer/etc., only \
these two strings. If the instruction needs anything else (an amount, a customer name, \
content of the request), it CANNOT be expressed here.
- Pattern values support `*` glob wildcards (fnmatch), e.g. "delete_*" or "*refund*".
- Rules are evaluated top to bottom; the FIRST matching rule wins and the rest are never \
checked. An event that matches no rule runs automatically (no approval). When adding a rule \
that should override a broader existing one, place the more specific rule BEFORE the \
broader one in the list.
- `action_type` is whatever the SDK caller labels it (commonly "internal", "external", or \
"data_access", but any string is allowed). `action_name` is a free-text action label \
(e.g. "send_email", "delete_user", "send_refund").

Exact names vs. vague descriptions -- these are handled differently:
- If the instruction directly names a specific action_type/action_name (e.g. "require approval \
for prescribe_medication", "block delete_patient_record"), use that value EXACTLY as given, even \
if it does not appear anywhere in the logged actions below. A policy governs actions before they \
happen -- a brand-new customer who has never logged a single event yet still needs to be able to \
write a rule for an action they know their own agent will take. Do not refuse or demand \
"grounding" for a name the user already typed literally.
- Only the grounding/matching process below applies to a VAGUE, non-exact description ("money \
related stuff", "anything like a background check") that contains no literal action identifier \
of its own -- there, you have nothing concrete to build a rule from except the workspace's real \
logged actions, so matching against that list is the only way to avoid inventing a match field \
that doesn't correspond to anything real.

Matching a vague description to real actions:
- You will be given a list of the action_type/action_name pairs this workspace has actually \
logged. Match the instruction's plain-English description against that list by REAL-WORLD \
MEANING -- "money related stuff" should match things like "send_refund", "process_payment", or \
"charge_card" if those appear in the list, even though none of those strings contain the word \
"money".
- Matching by meaning is NOT the same as matching by a shared word or substring. A generic word \
appearing in both the instruction and an action name (e.g. "check") is a coincidence, not \
evidence they're the same thing -- "check_system_health", "connectivity_check", and \
"check_order_status" all contain "check" but are unrelated system/infra health probes, not \
whatever a "human background check" or "bp check" instruction is describing. Before including an \
action, ask yourself: is this action ACTUALLY the real-world thing the instruction describes, or \
does it merely share a word with it? Only include it if the former.
- Never build a rule from a bare generic-word glob (e.g. `"*check*"`, `"*send*"`, `"*update*"`) \
just because that word appears in the instruction -- these match far more than intended and \
silently pull in unrelated actions the user never meant to affect. Match on the SPECIFIC shared \
concept instead (`"*refund*"` for refund-related actions is fine because "refund" itself is the \
specific concept, not a generic verb).
- If one or more logged actions truly fit the description, propose rules for exactly those \
(a glob is fine when it precisely covers a set of same-concept action names, e.g. "*refund*" \
across "send_refund"/"process_refund") and say in `explanation` which actions you matched, so \
the user can correct you if you picked the wrong ones.
- If NOTHING in the given list truly fits, do NOT ask the user for "the exact action name" -- \
they don't know it either, that's the entire reason they're using plain English. Instead set \
proposed_yaml to null and, in `explanation`, list the actual action names/types this workspace \
has logged so far, so they have something concrete to pick from or rephrase against. If the \
list is empty, say plainly that no actions have been logged in this workspace yet. This is the \
correct answer for a description that resembles a real logged action only by a shared generic \
word -- refusing and showing the real list beats silently overmatching.

Strictness rules -- follow these even when they make the answer more conservative than a \
literal reading of the instruction:
1. A brand-new rule with no clear stance either way defaults to `require_approval: true`. \
Never default a new rule to `false` just because the instruction didn't say "require \
approval" explicitly.
2. NEVER change an existing rule from `require_approval: true` to `false`, and never delete \
a rule that currently requires approval, unless the instruction explicitly and \
unambiguously asks to let that specific action run automatically. "Make things easier" or \
"reduce approvals" or similar vague loosening requests are NOT explicit enough -- refuse \
(set proposed_yaml to null) and explain that you need to know specifically which action to \
loosen, rather than guessing which approval requirement to remove. (This is about DIRECTION, \
not about which actions match -- keep matching actions by meaning as above.)
3. If an instruction could plausibly be read as either tightening or loosening a rule, \
treat it as not expressible (null) and ask which direction is intended, rather than picking \
the more permissive interpretation.

You will be given the workspace's current policy YAML, the workspace's actually-logged \
action_type/action_name pairs, and an instruction. Reply with ONLY a JSON object, no other \
text, no markdown fences:

    {"proposed_yaml": "<full new rules_yaml>" or null, "explanation": "<one or two sentences>"}

Set `proposed_yaml` to null (with `explanation` saying why, in plain English -- and, per above, \
listing real logged actions when nothing matched) when the instruction can't be expressed with \
only action_type/action_name matching, or when strictness rule 2 or 3 applies. Otherwise \
`proposed_yaml` must be the COMPLETE new policy (not a diff/fragment) -- carry over every \
existing rule the instruction doesn't ask to change."""


class PolicyDraft(BaseModel):
    proposed_yaml: str | None
    explanation: str


async def draft_policy(instruction: str, current_yaml: str, known_actions: list[dict] | None = None) -> PolicyDraft:
    settings = get_settings()

    if not settings.ollama_api_key:
        return PolicyDraft(
            proposed_yaml=None,
            explanation="Plain-English policy editing is unavailable (no Ollama API key configured) -- edit the YAML directly below.",
        )

    user_content = json.dumps(
        {
            "current_policy_yaml": current_yaml,
            "logged_actions": known_actions or [],
            "instruction": instruction,
        }
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.ollama_base_url}/chat/completions",
                headers={"Authorization": f"Bearer {settings.ollama_api_key}"},
                json={
                    "model": settings.ollama_model,
                    "messages": [
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {"role": "user", "content": user_content},
                    ],
                    "temperature": 0.2,  # low but nonzero -- this is a strict-but-generative rewrite, not classification
                },
            )
            response.raise_for_status()
        text = response.json()["choices"][0]["message"]["content"].strip()
        if text.startswith("```"):
            text = text.strip("`").removeprefix("json").strip()
        parsed = json.loads(text)
        proposed_yaml = parsed.get("proposed_yaml")
        explanation = parsed["explanation"]
    except (json.JSONDecodeError, KeyError, IndexError):
        return PolicyDraft(proposed_yaml=None, explanation="Draft generation failed to parse -- please edit the YAML directly.")
    except Exception:
        # Same "fail closed" contract as evidence_drafter.draft_answer -- a
        # transient provider outage must surface as "try again", not a 500.
        return PolicyDraft(proposed_yaml=None, explanation="Draft generation failed (a temporary error) -- please try again.")

    if proposed_yaml is None:
        return PolicyDraft(proposed_yaml=None, explanation=explanation)

    try:
        parse_policy(proposed_yaml)
    except PolicyParseError:
        # The model's own claim that this YAML is valid isn't trustworthy
        # enough to skip re-checking it against the real parser -- an
        # unconfirmed proposal must never reach the diff UI as if it were
        # ready to apply.
        return PolicyDraft(proposed_yaml=None, explanation="Draft generation produced an invalid policy -- please try rephrasing, or edit the YAML directly.")

    return PolicyDraft(proposed_yaml=proposed_yaml, explanation=explanation)
