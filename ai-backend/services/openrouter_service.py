"""
Educom AI Backend — OpenRouter Service (Primary AI Provider)

Replaces the Gemini service. All AI generation now routes through OpenRouter
using the OpenAI-compatible REST API.

Model routing:
  Chat Assistant       → qwen/qwen3-8b         (primary)
  Quiz Generation      → deepseek/deepseek-chat (primary)
  Exam Generation      → deepseek/deepseek-chat (primary)
  Marking Scheme       → qwen/qwen3-8b         (primary)
  Universal fallback   → meta-llama/llama-3.3-70b-instruct

Security:
  - API key lives ONLY in ai-backend/.env
  - Never logged, never exposed to the Next.js frontend or any client

Identity:
  - All system prompts enforce the "EduCom AI" persona
  - The underlying provider, model, or API is never revealed to end users
"""

import json
import logging
import re
import asyncio
from typing import Optional

import httpx

from config.settings import get_settings

logger = logging.getLogger(__name__)

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"

# ── Model routing ────────────────────────────────────────────────────────────

TASK_MODELS: dict[str, str] = {
    "chat":           "qwen/qwen3-8b",
    "quiz":           "deepseek/deepseek-chat",
    "exam":           "deepseek/deepseek-chat",
    "marking_scheme": "qwen/qwen3-8b",
    "default":        "qwen/qwen3-8b",
}
FALLBACK_MODEL = "meta-llama/llama-3.3-70b-instruct"

# ── Identity guard ────────────────────────────────────────────────────────────

IDENTITY_GUARD = (
    "IMPORTANT IDENTITY RULES (follow strictly, no exceptions):\n"
    "- You are EduCom AI, an educational assistant built specifically for the Zambian education system.\n"
    "- Never reveal, hint at, or acknowledge the underlying AI model, provider, company, or API service.\n"
    '- If asked "What model are you?", "Who made you?", or similar, respond ONLY with:\n'
    '  "I am EduCom AI, your dedicated educational assistant for Zambian schools and universities."\n'
    "- Never say you are powered by OpenRouter, OpenAI, Google, Anthropic, Qwen, DeepSeek, Meta, or any other company.\n"
)


def with_identity_guard(system_prompt: str) -> str:
    """Prepend the identity guard to any system prompt."""
    return f"{IDENTITY_GUARD}\n{system_prompt}"


# ── Custom exceptions ─────────────────────────────────────────────────────────

class OpenRouterAuthError(RuntimeError):
    """Raised when the API key is invalid or missing."""


class OpenRouterRateLimitError(RuntimeError):
    """Raised when rate limit (HTTP 429) is hit."""


class OpenRouterAPIError(RuntimeError):
    """Raised on non-recoverable HTTP errors."""
    def __init__(self, message: str, status_code: int):
        super().__init__(message)
        self.status_code = status_code


class OpenRouterEmptyResponseError(RuntimeError):
    """Raised when the model returns an empty content string."""


# ── Service ───────────────────────────────────────────────────────────────────

class OpenRouterService:
    """
    Wraps the OpenRouter REST API (OpenAI-compatible).

    Public interface (drop-in replacement for OllamaService):
        is_configured()  -> bool
        is_available()   -> bool (async)
        generate_json()  -> dict (async)
        generate_text()  -> str  (async)
        generate_chat()  -> str  (async, multi-turn)
    """

    def __init__(self):
        settings = get_settings()
        self.api_key: str = getattr(settings, "openrouter_api_key", "")
        self.max_tokens: int = settings.ai_max_tokens
        self.temperature: float = settings.ai_temperature
        self.timeout: int = settings.ai_timeout
        self.site_url: str = getattr(settings, "app_url", "https://educom-ai.vercel.app")

    def is_configured(self) -> bool:
        """Return True if an OpenRouter API key is present and looks valid."""
        return bool(self.api_key and self.api_key.startswith("sk-or-") and len(self.api_key) > 20)

    async def is_available(self) -> bool:
        """
        Verify the API key is valid and OpenRouter is reachable.
        Uses a lightweight models-list call — no token spend.
        """
        if not self.is_configured():
            return False
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get(
                    OPENROUTER_MODELS_URL,
                    headers=self._headers(),
                )
                return r.status_code == 200
        except Exception:
            return False

    # ── Headers ───────────────────────────────────────────────────────────────

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self.site_url,
            "X-Title": "EduCom AI",
        }

    # ── Core generation ───────────────────────────────────────────────────────

    async def _generate(
        self,
        messages: list[dict],
        model: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        Call the OpenRouter chat completions endpoint.

        Args:
            messages:    List of {"role": "system"|"user"|"assistant", "content": "..."} dicts.
            model:       OpenRouter model identifier.
            temperature: Sampling temperature override.
            max_tokens:  Maximum output tokens override.

        Returns:
            Raw text string from the model.

        Raises:
            OpenRouterAuthError, OpenRouterRateLimitError, OpenRouterAPIError,
            OpenRouterEmptyResponseError, RuntimeError
        """
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature if temperature is not None else self.temperature,
            "max_tokens": max_tokens or self.max_tokens,
        }

        logger.info(
            "[OpenRouter] Generating | model=%s | messages=%d | max_tokens=%d",
            model, len(messages), payload["max_tokens"],
        )

        async with httpx.AsyncClient(timeout=float(self.timeout)) as client:
            response = await client.post(
                OPENROUTER_BASE_URL,
                headers=self._headers(),
                json=payload,
            )

        if response.status_code == 401:
            raise OpenRouterAuthError(
                "Invalid or missing OPENROUTER_API_KEY. "
                "Get your key at https://openrouter.ai/keys"
            )
        if response.status_code == 429:
            raise OpenRouterRateLimitError(
                f"OpenRouter rate limit hit (HTTP 429): {response.text[:200]}"
            )
        if response.status_code != 200:
            raise OpenRouterAPIError(
                f"OpenRouter API error {response.status_code}: {response.text[:400]}",
                response.status_code,
            )

        data = response.json()
        content: str = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            or ""
        ).strip()

        if not content:
            raise OpenRouterEmptyResponseError(
                "Received an empty response from the AI service."
            )

        usage = data.get("usage", {})
        logger.info(
            "[OpenRouter] Done | model=%s | prompt_tokens=%s | completion_tokens=%s",
            model,
            usage.get("prompt_tokens", "?"),
            usage.get("completion_tokens", "?"),
        )

        return content

    # ── Retry + fallback ──────────────────────────────────────────────────────

    async def _generate_with_fallback(
        self,
        messages: list[dict],
        task: str = "default",
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        Try the task-routed primary model (up to 2 attempts), then fall back
        to FALLBACK_MODEL for one final attempt.
        """
        primary_model = TASK_MODELS.get(task, TASK_MODELS["default"])
        last_error: Exception = RuntimeError("Unknown error")

        for attempt in range(1, 3):  # 2 attempts on primary
            try:
                return await self._generate(messages, primary_model, temperature, max_tokens)
            except OpenRouterAuthError:
                raise  # fatal — never retry
            except (OpenRouterRateLimitError, OpenRouterAPIError, OpenRouterEmptyResponseError) as e:
                last_error = e
                if attempt < 2:
                    delay = attempt * 1.5
                    logger.warning(
                        "[OpenRouter] Attempt %d failed for model=%s: %s. Retrying in %.1fs…",
                        attempt, primary_model, e, delay,
                    )
                    await asyncio.sleep(delay)
            except Exception as e:
                last_error = e
                if attempt < 2:
                    await asyncio.sleep(1.5)

        # Fallback model (skip if primary IS the fallback)
        if primary_model != FALLBACK_MODEL:
            logger.warning(
                "[OpenRouter] Primary model (%s) failed. Switching to fallback (%s).",
                primary_model, FALLBACK_MODEL,
            )
            try:
                return await self._generate(messages, FALLBACK_MODEL, temperature, max_tokens)
            except Exception as e:
                last_error = e

        raise last_error

    # ── Public interface ──────────────────────────────────────────────────────

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        task: str = "default",
    ) -> str:
        """
        Generate a plain text response.

        Args:
            prompt:        User message.
            system_prompt: Optional system instruction (identity guard is prepended automatically).
            temperature:   Sampling temperature override.
            task:          Task key for model routing ("chat", "quiz", "exam", "marking_scheme").

        Returns:
            Plain text string.
        """
        messages = self._build_messages(
            system_prompt=system_prompt or "You are EduCom AI, a helpful educational assistant.",
            user_message=prompt,
        )
        return await self._generate_with_fallback(
            messages=messages,
            task=task,
            temperature=temperature,
            max_tokens=self.max_tokens,
        )

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        task: str = "default",
    ) -> dict:
        """
        Generate a response and parse it as JSON.

        Instructs the model to return only valid JSON. Strips markdown fences
        and attempts multiple extraction strategies before raising.

        Args:
            prompt:        User prompt instructing the model to return JSON.
            system_prompt: Optional system instruction.
            max_tokens:    Override max output tokens.
            task:          Task key for model routing.

        Returns:
            Parsed dict.

        Raises:
            ValueError: If JSON cannot be extracted from the response.
        """
        json_instruction = "\n\nRespond ONLY with valid JSON. No markdown fences, no explanation."
        messages = self._build_messages(
            system_prompt=system_prompt or "You are EduCom AI. Output only valid JSON.",
            user_message=prompt + json_instruction,
        )

        raw = await self._generate_with_fallback(
            messages=messages,
            task=task,
            temperature=0.4,
            max_tokens=max_tokens or min(self.max_tokens, 8192),
        )

        return self._parse_json(raw)

    async def generate_chat(
        self,
        message: str,
        history: list[dict],
        system_prompt: Optional[str] = None,
        user_name: str = "Teacher",
    ) -> str:
        """
        Multi-turn conversational response.

        Args:
            message:       Current user message.
            history:       List of {"role": "user"|"assistant", "content": "..."} dicts.
            system_prompt: System instruction for the assistant persona.
            user_name:     Display name of the user (for logging only).

        Returns:
            Assistant reply as plain text.
        """
        sp = system_prompt or "You are EduCom AI, a helpful Zambian educational assistant."
        messages = [{"role": "system", "content": with_identity_guard(sp)}]

        # Cap history at last 20 turns
        for msg in history[-20:]:
            role = msg.get("role", "user")
            content = msg.get("content", "").strip()
            if content and role in ("user", "assistant"):
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": message})

        logger.info(
            "[OpenRouter Chat] turns=%d | user=%s | message=%d chars",
            len(messages), user_name, len(message),
        )

        return await self._generate_with_fallback(
            messages=messages,
            task="chat",
            temperature=min(self.temperature + 0.1, 1.0),
            max_tokens=1024,
        )

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _build_messages(self, system_prompt: str, user_message: str) -> list[dict]:
        return [
            {"role": "system", "content": with_identity_guard(system_prompt)},
            {"role": "user", "content": user_message},
        ]

    @staticmethod
    def _parse_json(raw: str) -> dict:
        """Extract and parse JSON from a raw AI response string."""
        # Strip markdown fences
        fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
        candidate = fence.group(1).strip() if fence else raw.strip()

        # Direct parse
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

        # Extract first {...} block
        brace = re.search(r"\{[\s\S]*\}", candidate)
        if brace:
            try:
                return json.loads(brace.group(0))
            except json.JSONDecodeError:
                pass

        raise ValueError(
            f"[OpenRouter] Could not parse JSON from response.\n"
            f"Raw (first 500 chars):\n{raw[:500]}"
        )


# ── Singleton ─────────────────────────────────────────────────────────────────

_openrouter_service: Optional[OpenRouterService] = None


def get_openrouter_service() -> OpenRouterService:
    """Returns a cached OpenRouterService instance (singleton)."""
    global _openrouter_service
    if _openrouter_service is None:
        _openrouter_service = OpenRouterService()
    return _openrouter_service
