"""Covers the graceful-degradation contract in draft_answer: one question's
LLM failure (or no API key at all) must produce a fallback answer, never an
unhandled exception that would abort every other question in the same
questionnaire (see worker/tasks.py::process_questionnaire's single
try/except around the whole file). Runs against Ollama Cloud's
OpenAI-compatible endpoint, same as policy_drafter.py -- mocks
httpx.AsyncClient accordingly."""

import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services import evidence_drafter
from app.services.evidence_drafter import draft_answer

CANDIDATES = [
    {"id": "evt_1", "action_type": "external", "action_name": "send_email", "status": "completed", "created_at": "2026-01-01T00:00:00Z"},
]


def _settings(api_key: str) -> SimpleNamespace:
    return SimpleNamespace(ollama_api_key=api_key, ollama_base_url="https://ollama.com/v1", ollama_model="gemma4:31b")


def _mock_ollama_response(payload: dict) -> MagicMock:
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
    return patch("app.services.evidence_drafter.httpx.AsyncClient", return_value=mock_client)


@pytest.mark.anyio
async def test_draft_answer_degrades_gracefully_with_no_api_key(monkeypatch):
    monkeypatch.setattr(evidence_drafter, "get_settings", lambda: _settings(""))

    result = await draft_answer("Do you log all actions?", CANDIDATES)

    assert result.cited_event_ids == []
    assert "manually" in result.answer.lower()
    assert "ollama" in result.answer.lower()


@pytest.mark.anyio
async def test_draft_answer_degrades_gracefully_on_api_error(monkeypatch):
    monkeypatch.setattr(evidence_drafter, "get_settings", lambda: _settings("sk-fake"))

    with _patch_client(side_effect=RuntimeError("simulated Ollama outage")):
        result = await draft_answer("Do you log all actions?", CANDIDATES)

    assert result.cited_event_ids == []
    assert "manually" in result.answer.lower()


@pytest.mark.anyio
async def test_draft_answer_parses_a_successful_response(monkeypatch):
    monkeypatch.setattr(evidence_drafter, "get_settings", lambda: _settings("sk-fake"))

    fake_response = _mock_ollama_response({"answer": "Yes, logged automatically.", "cited_event_ids": ["evt_1", "evt_bogus"]})

    with _patch_client(fake_response=fake_response):
        result = await draft_answer("Do you log all actions?", CANDIDATES)

    assert result.answer == "Yes, logged automatically."
    # A cited id that isn't one of the real candidates must be dropped.
    assert result.cited_event_ids == ["evt_1"]


@pytest.mark.anyio
async def test_draft_answer_sends_the_api_key_and_model_to_ollama(monkeypatch):
    monkeypatch.setattr(evidence_drafter, "get_settings", lambda: _settings("sk-fake-key"))
    fake_response = _mock_ollama_response({"answer": "Yes.", "cited_event_ids": []})

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = False
    mock_client.post = AsyncMock(return_value=fake_response)

    with patch("app.services.evidence_drafter.httpx.AsyncClient", return_value=mock_client):
        await draft_answer("Do you log all actions?", CANDIDATES)

    args, kwargs = mock_client.post.call_args
    assert args[0] == "https://ollama.com/v1/chat/completions"
    assert kwargs["headers"]["Authorization"] == "Bearer sk-fake-key"
    assert kwargs["json"]["model"] == "gemma4:31b"


@pytest.mark.anyio
async def test_draft_answer_degrades_gracefully_on_unparseable_response(monkeypatch):
    monkeypatch.setattr(evidence_drafter, "get_settings", lambda: _settings("sk-fake"))

    fake_response = MagicMock()
    fake_response.raise_for_status = MagicMock()
    fake_response.json.return_value = {"choices": [{"message": {"content": "not json at all"}}]}

    with _patch_client(fake_response=fake_response):
        result = await draft_answer("Do you log all actions?", CANDIDATES)

    assert result.cited_event_ids == []
    assert "manually" in result.answer.lower()
