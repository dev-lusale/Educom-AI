"""
Educom AI Backend — AI Provider Resolver
Returns the configured AI service: Gemini (primary) or Ollama (fallback).

Priority:
  1. Google Gemini  — when GEMINI_API_KEY is set in .env
  2. Ollama         — local fallback for offline / self-hosted setups

Both services expose the same interface:
    await service.generate_json(prompt, system_prompt) -> dict
    await service.generate_text(prompt, system_prompt) -> str
    await service.is_available()                        -> bool
"""

import logging
from typing import Union

from services.gemini_service import GeminiService, get_gemini_service
from services.ollama_service import OllamaService, get_ollama_service

logger = logging.getLogger(__name__)

AIService = Union[GeminiService, OllamaService]


async def get_ai_service() -> AIService:
    """
    Resolve and return the best available AI service.

    Returns GeminiService if the API key is configured and reachable,
    otherwise falls back to OllamaService.
    """
    gemini = get_gemini_service()

    if gemini.is_configured():
        available = await gemini.is_available()
        if available:
            logger.info("[AI Provider] Using Google Gemini")
            return gemini
        else:
            logger.warning(
                "[AI Provider] Gemini API key configured but unreachable — "
                "check your key or network. Falling back to Ollama."
            )

    logger.info("[AI Provider] Using Ollama (local fallback)")
    return get_ollama_service()


def get_ai_service_sync() -> AIService:
    """
    Synchronous version — returns GeminiService if configured, else Ollama.
    Does NOT check network availability (use in non-async contexts only).
    """
    gemini = get_gemini_service()
    if gemini.is_configured():
        return gemini
    return get_ollama_service()
