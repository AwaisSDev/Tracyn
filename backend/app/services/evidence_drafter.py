"""F4 -- drafts questionnaire answers, grounded in the workspace's actual
logged events. The model is only ever shown *already redacted* event data
and is explicitly told to cite by event id -- answers are drafts a human
reviews and edits before anything is exported (see routers/questionnaires.py;
nothing here ever auto-submits anywhere).

Runs on Ollama Cloud (OpenAI-compatible /v1/chat/completions), same as
policy_drafter.py -- this workspace only pays for one LLM provider, not two.
"""

import json

import httpx
from pydantic import BaseModel

from app.config import get_settings

_SYSTEM_PROMPT = """You are drafting answers to a customer security questionnaire on \
behalf of a company that uses Tracyn to log and govern its AI agents' actions. \
You will be given a question and a list of candidate log events (already PII-redacted) \
from that company's own Tracyn workspace.

Rules:
- Answer only using the provided events and general, defensible statements about how \
Tracyn's logging/approval/audit-chain features work. Never invent specifics not in \
the evidence.
- If the evidence doesn't support a confident answer, say so plainly and suggest what \
the human reviewer should add.
- Cite evidence by event id, using the exact ids given — never invent an id.
- Keep answers to 2-4 sentences; questionnaires are read by busy security reviewers.

Reply with ONLY a JSON object, no other text, no markdown fences: \
{"answer": "...", "cited_event_ids": ["...", ...]}"""


class DraftedAnswer(BaseModel):
    answer: str
    cited_event_ids: list[str]


async def draft_answer(question: str, candidate_events: list[dict]) -> DraftedAnswer:
    settings = get_settings()

    if not settings.ollama_api_key:
        # Documented as an optional, gracefully-degrading feature (see
        # config.py / backend/README.md) — without a key, still parse the
        # file and match evidence, just skip the drafted wording rather than
        # failing the whole questionnaire (worker/tasks.py::process_questionnaire
        # wraps every question in one try/except, so one hard failure here
        # used to abort every other question in the file too).
        return DraftedAnswer(
            answer="Draft generation is unavailable (no Ollama API key configured) — please write this answer manually.",
            cited_event_ids=[],
        )

    events_for_prompt = [
        {
            "event_id": e["id"],
            "action_type": e["action_type"],
            "action_name": e["action_name"],
            "status": e["status"],
            "created_at": e["created_at"],
        }
        for e in candidate_events
    ]

    user_content = json.dumps({"question": question, "candidate_events": events_for_prompt})

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
                    "temperature": 0.2,
                },
            )
            response.raise_for_status()
        text = response.json()["choices"][0]["message"]["content"].strip()
        if text.startswith("```"):
            text = text.strip("`").removeprefix("json").strip()
        parsed = json.loads(text)
        valid_ids = {e["id"] for e in candidate_events}
        cited = [eid for eid in parsed.get("cited_event_ids", []) if eid in valid_ids]
        return DraftedAnswer(answer=parsed["answer"], cited_event_ids=cited)
    except (json.JSONDecodeError, KeyError, IndexError):
        return DraftedAnswer(
            answer="Draft generation failed to parse — please write this answer manually.",
            cited_event_ids=[],
        )
    except Exception:
        # Same "fail closed, keep going" contract as classification.py's
        # redact_with_llm: a transient outage or timeout for one question
        # must not take the rest of the questionnaire down with it.
        return DraftedAnswer(
            answer="Draft generation failed (a temporary error) — please write this answer manually.",
            cited_event_ids=[],
        )
