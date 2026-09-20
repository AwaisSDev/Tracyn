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

_SYSTEM_PROMPT = """You edit Tracyn policy YAML from a plain-English instruction. \
Tracyn lets an AI agent's actions run automatically or blocks on a human approval, \
decided by this policy. A policy mistake either lets a risky action run unattended or \
blocks a harmless one -- getting this wrong is a real security/operational issue, not a \
cosmetic one, so be conservative rather than clever.

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
- Pattern values support `*` glob wildcards (fnmatch), e.g. "delete_*".
- Rules are evaluated top to bottom; the FIRST matching rule wins and the rest are never \
checked. An event that matches no rule runs automatically (no approval). When adding a rule \
that should override a broader existing one, place the more specific rule BEFORE the \
broader one in the list.
- `action_type` is whatever the SDK caller labels it (commonly "internal", "external", or \
"data_access", but any string is allowed). `action_name` is a free-text action label \
(e.g. "send_email", "delete_user", "send_refund").

Strictness rules -- follow these even when they make the answer more conservative than a \
literal reading of the instruction:
1. A brand-new rule with no clear stance either way defaults to `require_approval: true`. \
Never default a new rule to `false` just because the instruction didn't say "require \
approval" explicitly.
2. NEVER change an existing rule from `require_approval: true` to `false`, and never delete \
a rule that currently requires approval, unless the instruction explicitly and \
unambiguously asks to let that specific action run automatically. "Make things easier" or \
"reduce approvals" or similar vague loosening requests are NOT explicit enough -- refuse \
(set proposed_yaml to null) and explain that you need the exact action to loosen, rather \
than guessing which approval requirement to remove.
3. If an instruction could plausibly be read as either tightening or loosening a rule, \
treat it as not expressible (null) and ask for the specific action_type/action_name and \
direction, rather than picking the more permissive interpretation.

You will be given the workspace's current policy YAML and an instruction. Reply with ONLY \
a JSON object, no other text, no markdown fences:

    {"proposed_yaml": "<full new rules_yaml>" or null, "explanation": "<one or two sentences>"}

Set `proposed_yaml` to null (with `explanation` saying why, in plain English) when the \
instruction can't be expressed with only action_type/action_name matching, or when strictness \
rule 2 or 3 applies. Otherwise `proposed_yaml` must be the COMPLETE new policy (not a \
diff/fragment) -- carry over every existing rule the instruction doesn't ask to change."""


class PolicyDraft(BaseModel):
    proposed_yaml: str | None
    explanation: str


async def draft_policy(instruction: str, current_yaml: str) -> PolicyDraft:
    settings = get_settings()

    if not settings.ollama_api_key:
        return PolicyDraft(
            proposed_yaml=None,
            explanation="Plain-English policy editing is unavailable (no Ollama API key configured) -- edit the YAML directly below.",
        )

    user_content = json.dumps({"current_policy_yaml": current_yaml, "instruction": instruction})

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
