import pytest

pytest.importorskip("agents")

from agents.tracing import custom_span, function_span, set_trace_processors, trace  # noqa: E402

from tracyn.client import Tracyn  # noqa: E402
from tracyn.integrations.openai_agents import TracynTracingProcessor  # noqa: E402


@pytest.fixture
def audit(monkeypatch):
    agent = Tracyn(api_key="test", agent_name="support-bot", policy_yaml="rules: []")
    events = []
    monkeypatch.setattr(agent, "_enqueue_event", lambda **fields: events.append(fields))
    set_trace_processors([TracynTracingProcessor(agent)])
    yield agent, events
    set_trace_processors([])


def test_logs_a_finished_tool_call(audit):
    agent, events = audit
    with trace("run"):
        with function_span("lookup_order", input='{"order_id": "A1"}') as span:
            span.span_data.output = {"status": "shipped"}

    assert len(events) == 1
    event = events[0]
    assert event["agent_name"] == "support-bot"
    assert event["action_type"] == "tool"
    assert event["action_name"] == "lookup_order"
    assert event["inputs"] == {"order_id": "A1"}
    assert event["output"] == {"status": "shipped"}
    assert event["status"] == "completed"
    assert isinstance(event["latency_ms"], int)


def test_logs_a_failed_tool_call_as_an_error(audit):
    _, events = audit
    with trace("run"):
        with function_span("charge_card", input='{"amount": 5}') as span:
            span.set_error({"message": "card declined", "data": None})

    assert events[0]["status"] == "error"
    assert events[0]["output"]["error"] == "card declined"


def test_skips_tools_already_wrapped_by_track(audit):
    agent, events = audit

    @agent.track(action_type="external", action_name="refund")
    def refund(order_id: str) -> str:
        return "ok"

    with trace("run"):
        with function_span("refund", input='{"order_id": "A1"}'):
            pass

    assert events == []


def test_ignores_non_tool_spans_and_bad_json(audit):
    _, events = audit
    with trace("run"):
        with custom_span("planning"):
            pass
        with function_span("echo", input="not json"):
            pass

    assert len(events) == 1
    assert events[0]["inputs"] == {"raw": "not json"}
