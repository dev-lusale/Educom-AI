"""
Educom AI Backend — Google Gemini Service (Primary AI Provider)
Fast, high-quality AI generation via Google AI Studio (Gemini API).

Architecture:
  - PRIMARY AI provider for ALL requests when GEMINI_API_KEY is configured
  - Uses native JSON mode (responseMimeType=application/json) for structured output
  - Uses multi-turn generate_chat() for the conversational assistant
  - Falls back to Ollama only when Gemini is completely unreachable

Security:
  - API key lives ONLY on the backend (ai-backend/.env)
  - Never exposed to the Next.js frontend or any client
  - Key is never logged or included in error messages

Get a free key at: https://aistudio.google.com/app/apikey
"""

import json
import logging
import re
from typing import Optional

import httpx

from config.settings import get_settings

logger = logging.getLogger(__name__)

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
DEFAULT_MODEL = "gemini-2.0-flash"


class GeminiService:
    """
    Wraps the Google Gemini (AI Studio) REST API.

    Public interface (same as OllamaService — drop-in replacement):
        is_configured()  -> bool
        is_available()   -> bool (async)
        generate_json()  -> dict (async)
        generate_text()  -> str  (async)
        generate_chat()  -> str  (async, multi-turn)
    """

    def __init__(self):
        settings = get_settings()
        self.api_key: str = getattr(settings, "gemini_api_key", "")
        self.model: str = getattr(settings, "gemini_model", DEFAULT_MODEL)
        self.max_tokens: int = settings.ai_max_tokens
        self.temperature: float = settings.ai_temperature
        self.timeout: int = settings.ai_timeout

    def is_configured(self) -> bool:
        """Return True if a Gemini API key is present."""
        return bool(self.api_key and len(self.api_key) > 10)

    async def is_available(self) -> bool:
        """
        Verify the API key is valid and Gemini is reachable.
        Uses a lightweight models list call — avoids billing a generation.
        """
        if not self.is_configured():
            return False
        try:
            url = f"{GEMINI_BASE_URL}?key={self.api_key}"
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get(url)
                return r.status_code == 200
        except Exception:
            return False

    # ── Core generation ──────────────────────────────────────────────────────

    async def _generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        response_mime_type: str = "text/plain",
    ) -> str:
        """
        Call the Gemini generateContent endpoint.

        Args:
            prompt: User content to send to the model.
            system_prompt: Optional system instruction.
            temperature: Sampling temperature override.
            max_tokens: Maximum output tokens override.
            response_mime_type: "text/plain" for chat, "application/json" for JSON mode.

        Returns:
            Raw text string from Gemini.

        Raises:
            RuntimeError: On API errors or unexpected response shapes.
        """
        url = f"{GEMINI_BASE_URL}/{self.model}:generateContent?key={self.api_key}"

        payload: dict = {
            "contents": [
                {"role": "user", "parts": [{"text": prompt}]}
            ],
            "generationConfig": {
                "temperature": temperature if temperature is not None else self.temperature,
                "maxOutputTokens": max_tokens or self.max_tokens,
                "topP": 0.95,
                "responseMimeType": response_mime_type,
            },
        }

        if system_prompt:
            payload["systemInstruction"] = {
                "parts": [{"text": system_prompt}]
            }

        logger.info(
            f"[Gemini] Generating | model={self.model} | "
            f"prompt={len(prompt)} chars | mime={response_mime_type}"
        )

        async with httpx.AsyncClient(timeout=float(self.timeout)) as client:
            response = await client.post(
                url,
                headers={"Content-Type": "application/json"},
                json=payload,
            )

        if response.status_code != 200:
            # Avoid logging the API key — only show status and truncated body
            raise RuntimeError(
                f"Gemini API error {response.status_code}: {response.text[:400]}"
            )

        data = response.json()

        # Check for blocked content
        finish_reason = (
            data.get("candidates", [{}])[0].get("finishReason", "STOP")
        )
        if finish_reason in ("SAFETY", "RECITATION", "BLOCKED"):
            raise RuntimeError(
                f"Gemini blocked the response: finishReason={finish_reason}. "
                "Try rephrasing the prompt."
            )

        # Extract text from candidates[0].content.parts[0].text
        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except (KeyError, IndexError) as e:
            raise RuntimeError(
                f"Unexpected Gemini response shape: {str(e)}\n"
                f"Response (first 400 chars): {str(data)[:400]}"
            )

        usage = data.get("usageMetadata", {})
        logger.info(
            f"[Gemini] Done | finishReason={finish_reason} | "
            f"outputTokens={usage.get('candidatesTokenCount', '?')} | "
            f"totalTokens={usage.get('totalTokenCount', '?')}"
        )

        return text

    # ── Public interface ─────────────────────────────────────────────────────

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
    ) -> dict:
        """
        Generate and return a parsed JSON dict.

        Uses Gemini's native JSON mode (responseMimeType=application/json) for
        reliable structured output — no regex hacks needed as primary path.
        Falls back to manual extraction if the response has stray text.

        Args:
            prompt: User prompt instructing Gemini to return JSON.
            system_prompt: Optional system instruction.
            max_tokens: Override max output tokens (default: 8192).

        Returns:
            Parsed dict from Gemini's JSON response.

        Raises:
            ValueError: If JSON cannot be extracted from the response.
        """
        raw = await self._generate(
            prompt=prompt,
            system_prompt=system_prompt,
            response_mime_type="application/json",
            max_tokens=max_tokens or min(self.max_tokens, 8192),
        )

        # Native JSON mode should always return valid JSON
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass

        # Fallback: strip markdown code fences
        fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
        if fence:
            try:
                return json.loads(fence.group(1))
            except json.JSONDecodeError:
                pass

        # Fallback: find first {...} block
        brace = re.search(r"\{.*\}", raw, re.DOTALL)
        if brace:
            try:
                return json.loads(brace.group(0))
            except json.JSONDecodeError:
                pass

        raise ValueError(
            f"[Gemini] Could not parse JSON from response.\n"
            f"Raw response (first 500 chars):\n{raw[:500]}"
        )

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> str:
        """
        Generate free-form text — used for the conversational chat assistant.
        Slightly higher temperature for natural-sounding replies.

        Args:
            prompt: User prompt.
            system_prompt: Optional system instruction.
            temperature: Override temperature (default: settings.temperature + 0.1).

        Returns:
            Generated text string.
        """
        return await self._generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature if temperature is not None else min(self.temperature + 0.1, 1.0),
            response_mime_type="text/plain",
        )

    async def generate_chat(
        self,
        message: str,
        history: list[dict],
        system_prompt: Optional[str] = None,
        user_name: str = "Teacher",
    ) -> str:
        """
        Multi-turn chat using Gemini's native conversation format.
        Passes full message history as alternating user/model turns.

        Args:
            message: Current user message.
            history: List of {"role": "user"|"assistant", "content": "..."} dicts.
            system_prompt: System instruction for the assistant persona.
            user_name: Display name of the teacher (for logging).

        Returns:
            Assistant reply as plain text.
        """
        url = f"{GEMINI_BASE_URL}/{self.model}:generateContent?key={self.api_key}"

        # Build contents — Gemini uses "user" and "model" roles
        contents = []
        for msg in history[-20:]:  # cap at last 20 messages to manage token budget
            role = "model" if msg.get("role") == "assistant" else "user"
            content_text = msg.get("content", "").strip()
            if content_text:
                contents.append({"role": role, "parts": [{"text": content_text}]})

        # Append current user message
        contents.append({"role": "user", "parts": [{"text": message}]})

        payload: dict = {
            "contents": contents,
            "generationConfig": {
                "temperature": min(self.temperature + 0.1, 1.0),
                "maxOutputTokens": 1024,
                "topP": 0.95,
            },
        }

        if system_prompt:
            payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

        logger.info(
            f"[Gemini Chat] turns={len(contents)} | "
            f"user={user_name} | message={len(message)} chars"
        )

        async with httpx.AsyncClient(timeout=float(self.timeout)) as client:
            response = await client.post(
                url,
                headers={"Content-Type": "application/json"},
                json=payload,
            )

        if response.status_code != 200:
            raise RuntimeError(
                f"Gemini Chat API error {response.status_code}: {response.text[:400]}"
            )

        data = response.json()

        finish_reason = (
            data.get("candidates", [{}])[0].get("finishReason", "STOP")
        )
        if finish_reason in ("SAFETY", "RECITATION", "BLOCKED"):
            raise RuntimeError(
                f"Gemini blocked the chat response: finishReason={finish_reason}."
            )

        try:
            reply = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except (KeyError, IndexError) as e:
            raise RuntimeError(f"Unexpected Gemini chat response shape: {e}")

        return reply


# ── Singleton ────────────────────────────────────────────────────────────────

_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """Returns a cached GeminiService instance (singleton)."""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
