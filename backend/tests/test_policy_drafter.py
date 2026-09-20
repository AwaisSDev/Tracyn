"""Covers draft_policy's graceful-degradation and validation contract: a
proposal is never handed back unless it actually parses as a valid policy
(services/policy_engine.py), and no API key / a transient failure /
unparseable output all fail closed with proposed_yaml=None rather than
crashing or returning something the dashboard would show as a ready-to-
apply diff. Runs against Ollama Cloud's OpenAI-compatible endpoint, not
Anthropic -- mocks httpx.AsyncClient accordingly."""

import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services import policy_drafter
from app.services.policy_drafter import draft_policy

CURRENT_YAML = "rules:\n  - match:\n      action_type: external\n    require_approval: true\n"


def _settings(api_key: str) -> SimpleNamespace:
    return SimpleNamespace(ollama_api_key=api_key, ollama_base_url="https://ollama.com/v1", ollama_model="gemma4:31b")


def _mock_ollama_response(payload: dict) -> MagicMock:
    """A fake httpx.Response for a successful Ollama Cloud chat completion."""
    fake_response = MagicMock()
    fake_response.raise_for_status = MagicMock()
    fake_response.json.return_value = {"choices": [{"message": {"content": json.dumps(payload)}}]}
    return fake_response


def _patch_client(fake_response=None, side_effect=None):
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = False
    if side_effect is not None:
        mock_client.post = AsyncMock(side_effect=side_effect)
    else:
        mock_client.post = AsyncMock(return_value=fake_response)
    return patch("app.services.policy_drafter.httpx.AsyncClient", return_value=mock_client)


@pytest.mark.anyio
async def test_draft_policy_degrades_gracefully_with_no_api_key(monkeypatch):
    monkeypatch.setattr(policy_drafter, "get_settings", lambda: _settings(""))

    result = await draft_policy("require approval for refunds", CURRENT_YAML)

    assert result.proposed_yaml is None
    assert "ollama" in result.explanation.lower()


@pytest.mark.anyio
async def test_draft_policy_degrades_gracefully_on_api_error(monkeypatch):
    monkeypatch.setattr(policy_drafter, "get_settings", lambda: _settings("sk-fake"))

    with _patch_client(side_effect=RuntimeError("simulated Ollama outage")):
        result = await draft_policy("require approval for deletes", CURRENT_YAML)

    assert result.proposed_yaml is None
    assert "try again" in result.explanation.lower()


@pytest.mark.anyio
async def test_draft_policy_applies_a_successful_valid_response(monkeypatch):
    monkeypatch.setattr(policy_drafter, "get_settings", lambda: _settings("sk-fake"))

    new_yaml = "rules:\n  - match:\n      action_name: delete_*\n    require_approval: true\n  - match:\n      action_type: external\n    require_approval: true\n"
    fake_response = _mock_ollama_response(
        {"proposed_yaml": new_yaml, "explanation": "Added a rule requiring approval for delete actions."}
    )

    with _patch_client(fake_response=fake_response):
        result = await draft_policy("also require approval for deletes", CURRENT_YAML)

    assert result.proposed_yaml == new_yaml
    assert "delete" in result.explanation.lower()


@pytest.mark.anyio
async def test_draft_policy_sends_the_api_key_and_model_to_ollama(monkeypatch):
    monkeypatch.setattr(policy_drafter, "get_settings", lambda: _settings("sk-fake-key"))
    fake_response = _mock_ollama_response({"proposed_yaml": None, "explanation": "no-op"})

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = False
    mock_client.post = AsyncMock(return_value=fake_response)

    with patch("app.services.policy_drafter.httpx.AsyncClient", return_value=mock_client):
        await draft_policy("do something", CURRENT_YAML)

    args, kwargs = mock_client.post.call_args
    assert args[0] == "https://ollama.com/v1/chat/completions"
    assert kwargs["headers"]["Authorization"] == "Bearer sk-fake-key"
    assert kwargs["json"]["model"] == "gemma4:31b"


@pytest.mark.anyio
async def test_draft_policy_sends_known_actions_so_vague_descriptions_can_be_matched(monkeypatch):
    # The whole point of known_actions: a non-technical instruction like
    # "money related stuff" has no exact action name in it at all -- the
    # model can only map it to something real if the workspace's actually-
    # logged actions are in the request.
    monkeypatch.setattr(policy_drafter, "get_settings", lambda: _settings("sk-fake"))
    fake_response = _mock_ollama_response({"proposed_yaml": None, "explanation": "no-op"})
    known_actions = [{"action_type": "external", "action_name": "send_refund"}]

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = False
    mock_client.post = AsyncMock(return_value=fake_response)

    with patch("app.services.policy_drafter.httpx.AsyncClient", return_value=mock_client):
        await draft_policy("any money related stuff should need approval", CURRENT_YAML, known_actions)

    sent_user_message = mock_client.post.call_args.kwargs["json"]["messages"][1]["content"]
    assert "send_refund" in sent_user_message


@pytest.mark.anyio
async def test_draft_policy_defaults_to_no_known_actions_when_omitted(monkeypatch):
    # Callers that don't pass known_actions (or an empty workspace) must
    # still produce a valid request rather than crashing on a None.
    monkeypatch.setattr(policy_drafter, "get_settings", lambda: _settings("sk-fake"))
    fake_response = _mock_ollama_response({"proposed_yaml": None, "explanation": "no-op"})

    with _patch_client(fake_response=fake_response):
        result = await draft_policy("do something", CURRENT_YAML)

    assert result.explanation == "no-op"


@pytest.mark.anyio
async def test_draft_policy_rejects_a_response_claiming_yaml_that_doesnt_actually_parse(monkeypatch):
    monkeypatch.setattr(policy_drafter, "get_settings", lambda: _settings("sk-fake"))
    fake_response = _mock_ollama_response({"proposed_yaml": "not: valid: policy: [[", "explanation": "Done."})

    with _patch_client(fake_response=fake_response):
        result = await draft_policy("do something", CURRENT_YAML)

    assert result.proposed_yaml is None
    assert "invalid" in result.explanation.lower()


@pytest.mark.anyio
async def test_draft_policy_explains_when_the_instruction_cant_be_expressed(monkeypatch):
    monkeypatch.setattr(policy_drafter, "get_settings", lambda: _settings("sk-fake"))
    fake_response = _mock_ollama_response(
        {"proposed_yaml": None, "explanation": "Refund amounts aren't something this policy engine can match on."}
    )

    with _patch_client(fake_response=fake_response):
        result = await draft_policy("require approval for refunds over $500", CURRENT_YAML)

    assert result.proposed_yaml is None
    assert "refund" in result.explanation.lower()


@pytest.mark.anyio
async def test_draft_policy_degrades_gracefully_on_unparseable_response(monkeypatch):
    monkeypatch.setattr(policy_drafter, "get_settings", lambda: _settings("sk-fake"))
    fake_response = MagicMock()
    fake_response.raise_for_status = MagicMock()
    fake_response.json.return_value = {"choices": [{"message": {"content": "not json at all"}}]}

    with _patch_client(fake_response=fake_response):
        result = await draft_policy("do something", CURRENT_YAML)

    assert result.proposed_yaml is None
    assert "parse" in result.explanation.lower()
