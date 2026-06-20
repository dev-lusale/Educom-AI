"""
Educom AI Backend — AI Provider Resolver
Returns the configured AI service: OpenRouter (primary) or Ollama (local fallback).

Priority:
  1. OpenRouter  — when OPENROUTER_API_KEY is set in .env
  2. Ollama      — local fallback for offline / self-hosted setups

Both services expose the same interface:
    await service.generate_json(prompt, system_prompt) -> dict
    await service.generate_text(prompt, system_prompt) -> str
    await service.is_available()                        -> bool
"""

import logging
from typing import Union

from services.openrouter_service import OpenRouterService, get_openrouter_service
from services.ollama_service import OllamaService, get_ollama_service

logger = logging.getLogger(__name__)

AIService = Union[OpenRouterService, OllamaService]


async def get_ai_service() -> AIService:
    """
    Resolve and return the best available AI service.

    Returns OpenRouterService if the API key is configured and reachable,
    otherwise falls back to OllamaService.
    """
    openrouter = get_openrouter_service()

    if openrouter.is_configured():
        available = await openrouter.is_available()
        if available:
            logger.info("[AI Provider] Using OpenRouter")
            return openrouter
        else:
            logger.warning(
                "[AI Provider] OpenRouter key configured but unreachable — "
                "check OPENROUTER_API_KEY or network. Falling back to Ollama."
            )

    logger.info("[AI Provider] Using Ollama (local fallback)")
    return get_ollama_service()


def get_ai_service_sync() -> AIService:
    """
    Synchronous version — returns OpenRouterService if configured, else Ollama.
    Does NOT check network availability (use in non-async contexts only).
    """
    openrouter = get_openrouter_service()
    if openrouter.is_configured():
        return openrouter
    return get_ollama_service()
