"""
Educom AI Backend — Groq Service
Fast cloud AI generation via Groq's free API (llama3-70b at ~500 tok/s).

Get a free API key at: https://console.groq.com
Add to ai-backend/.env:  GROQ_API_KEY=gsk_...

When GROQ_API_KEY is set, Groq is used instead of Ollama.
Falls back to Ollama automatically if Groq is unavailable.
"""

import json
import logging
import re
from typing import Optional

import httpx

from config.settings import get_settings

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


class GroqService:
    """
    Wraps the Groq Chat Completions API.
    Drop-in replacement for OllamaService — same interface.
    """

    def __init__(self):
        settings = get_settings()
        self.api_key: str = getattr(settings, "groq_api_key", "")
        self.model: str = getattr(settings, "groq_model", "llama3-70b-8192")
        self.max_tokens: int = settings.ai_max_tokens
        self.temperature: float = settings.ai_temperature
        self.timeout: int = settings.ai_timeout

    def is_configured(self) -> bool:
        """Return True if a Groq API key is set."""
        return bool(self.api_key and self.api_key.startswith("gsk_"))

    async def is_available(self) -> bool:
        """Check if Groq API is reachable and the key is valid."""
        if not self.is_configured():
            return False
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get(
                    "https://api.groq.com/openai/v1/models",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
                return r.status_code == 200
        except Exception:
            return False

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Generate text via Groq Chat Completions API."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature or self.temperature,
            "max_tokens": max_tokens or self.max_tokens,
        }

        logger.info(f"Groq generating | model={self.model} | prompt={len(prompt)} chars")

        async with httpx.AsyncClient(timeout=float(self.timeout)) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if response.status_code != 200:
            raise RuntimeError(
                f"Groq API error {response.status_code}: {response.text[:300]}"
            )

        data = response.json()
        text = data["choices"][0]["message"]["content"].strip()
        usage = data.get("usage", {})
        logger.info(
            f"Groq done | {usage.get('completion_tokens', '?')} tokens "
            f"| {usage.get('total_tokens', '?')} total"
        )
        return text

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> dict:
        """Generate and parse JSON response from Groq."""
        raw = await self.generate(prompt, system_prompt)

        # Direct parse
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass

        # Strip markdown code fences
        fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
        if fence:
            try:
                return json.loads(fence.group(1))
            except json.JSONDecodeError:
                pass

        # Find first {...} block
        brace = re.search(r"\{.*\}", raw, re.DOTALL)
        if brace:
            try:
                return json.loads(brace.group(0))
            except json.JSONDecodeError:
                pass

        raise ValueError(
            f"Could not parse JSON from Groq response.\nRaw:\n{raw[:500]}"
        )

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> str:
        """Generate free-form text (for chat)."""
        return await self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature or min(self.temperature + 0.1, 1.0),
        )


_groq_service: Optional[GroqService] = None


def get_groq_service() -> GroqService:
    """Returns a cached GroqService instance."""
    global _groq_service
    if _groq_service is None:
        _groq_service = GroqService()
    return _groq_service
