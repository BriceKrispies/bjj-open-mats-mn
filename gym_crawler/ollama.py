"""Minimal Ollama HTTP client for local LLM inference."""

from __future__ import annotations

import json

import httpx

from .util.log import get_logger

log = get_logger("ollama")

OLLAMA_BASE = "http://localhost:11434"
GENERATE_URL = f"{OLLAMA_BASE}/api/generate"
DEFAULT_MODEL = "llama3.2:3b"


class OllamaError(Exception):
    """Raised when the Ollama API call fails."""


def generate(
    prompt: str,
    model: str = DEFAULT_MODEL,
    *,
    timeout: float = 120.0,
) -> str:
    """Send a prompt to Ollama and return the raw response text.

    Uses JSON mode (format: "json") so Ollama constrains output to valid JSON.
    """
    body = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
    }

    try:
        resp = httpx.post(GENERATE_URL, json=body, timeout=timeout)
    except httpx.ConnectError:
        raise OllamaError(
            f"Cannot connect to Ollama at {OLLAMA_BASE}. "
            "Is Ollama running? Start it with: ollama serve"
        )
    except httpx.TimeoutException:
        raise OllamaError(
            f"Ollama request timed out after {timeout}s. "
            "The model may still be loading — try again."
        )

    if resp.status_code != 200:
        snippet = resp.text[:300]
        raise OllamaError(
            f"Ollama returned HTTP {resp.status_code}: {snippet}"
        )

    try:
        data = resp.json()
    except json.JSONDecodeError:
        raise OllamaError(f"Ollama returned non-JSON response: {resp.text[:300]}")

    return data.get("response", "")


def generate_json(
    prompt: str,
    model: str = DEFAULT_MODEL,
    *,
    timeout: float = 120.0,
) -> object:
    """Send a prompt to Ollama and parse the response as JSON.

    Retries once with a stronger instruction if the first response is not valid JSON.
    """
    raw = generate(prompt, model, timeout=timeout)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Retry with a stronger instruction
    log.warning("First Ollama response was not valid JSON, retrying with stronger instruction")
    retry_prompt = (
        "Your previous response was not valid JSON. "
        "Return ONLY a valid JSON array. No markdown, no commentary, no explanation.\n\n"
        + prompt
    )
    raw = generate(retry_prompt, model, timeout=timeout)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        log.error("Ollama returned invalid JSON after retry: %.200s", raw)
        return None
