"""OpenAI Agents SDK integration: log every tool call with no per-tool code.

    from agents import add_trace_processor
    from tracyn import Tracyn
    from tracyn.integrations.openai_agents import TracynTracingProcessor

    audit = Tracyn(api_key="al_live_...", agent_name="support-bot")
    add_trace_processor(TracynTracingProcessor(audit))

A tracing processor only sees a tool call after it has run, so it can record
but never pause one. For tools that need a human yes first, put
`@audit.track(...)` under `@function_tool`; this processor then skips them,
since the decorator already logs them (approval outcome included).
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

try:
    from agents.tracing import Span, Trace, TracingProcessor
except ImportError as exc:  # pragma: no cover - exercised only without the extra
    raise ImportError(
        "tracyn.integrations.openai_agents needs the OpenAI Agents SDK: pip install 'tracyn[openai-agents]'"
    ) from exc

from tracyn.client import Tracyn
from tracyn.hashing import hash_prompt


class TracynTracingProcessor(TracingProcessor):
    def __init__(self, audit: Tracyn, action_type: str = "tool"):
        self.audit = audit
        self.action_type = action_type

    def on_trace_start(self, trace: Trace) -> None:
        pass

    def on_trace_end(self, trace: Trace) -> None:
        pass

    def on_span_start(self, span: Span[Any]) -> None:
        pass

    def on_span_end(self, span: Span[Any]) -> None:
        data = span.span_data
        if data.type != "function" or data.name in self.audit.tracked_action_names:
            return
        inputs = _parse_inputs(data.input)
        error = span.error
        if error:
            output: Any = {"error": error.get("message"), "data": error.get("data")}
        else:
            output = _jsonable(data.output)
        self.audit._enqueue_event(
            agent_name=self.audit.agent_name,
            action_type=self.action_type,
            action_name=data.name,
            inputs=inputs,
            output=output,
            model=None,
            prompt_hash=hash_prompt(inputs),
            cost_usd=None,
            latency_ms=_latency_ms(span.started_at, span.ended_at),
            status="error" if error else "completed",
        )

    def shutdown(self) -> None:
        self.audit.flush()

    def force_flush(self) -> None:
        self.audit.flush()


def _parse_inputs(raw: str | None) -> dict[str, Any]:
    # The SDK records tool arguments as the model's raw JSON string.
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except ValueError:
        return {"raw": raw}
    return parsed if isinstance(parsed, dict) else {"value": parsed}


def _jsonable(value: Any) -> Any:
    try:
        json.dumps(value)
        return value
    except (TypeError, ValueError):
        return str(value)


def _latency_ms(started_at: str | None, ended_at: str | None) -> int | None:
    if not started_at or not ended_at:
        return None
    try:
        delta = datetime.fromisoformat(ended_at) - datetime.fromisoformat(started_at)
    except ValueError:
        return None
    return int(delta.total_seconds() * 1000)
