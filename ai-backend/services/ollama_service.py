"""
Educom AI Backend — Ollama Service
Manages communication with the local Ollama AI model server.
Handles model availability checks, fallback logic, and generation.
"""

import json
import logging
from typing import Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from config.settings import get_settings

logger = logging.getLogger(__name__)


class OllamaService:
    """
    Wraps the Ollama HTTP API for text generation.

    Supports:
    - Primary model with automatic fallback
    - Retry logic for transient failures
    - Structured JSON output parsing
    - Streaming (future use)
    """

    def __init__(self):
        settings = get_settings()
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model
        self.fallback_model = settings.ollama_fallback_model
        self.max_tokens = settings.ai_max_tokens
        self.temperature = settings.ai_temperature
        self.timeout = settings.ai_timeout

    async def is_available(self) -> bool:
        """Check if the Ollama server is running and reachable."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception:
            return False

    async def get_available_models(self) -> list[str]:
        """Return list of models currently pulled in Ollama."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                if response.status_code == 200:
                    data = response.json()
                    return [m["name"] for m in data.get("models", [])]
        except Exception as e:
            logger.warning(f"Could not fetch Ollama models: {e}")
        return []

    async def get_active_model(self) -> str:
        """
        Determine which model to use.
        Falls back to the fallback model if the primary is not available.
        """
        available = await self.get_available_models()

        # Check if primary model is available (handle version suffixes like phi3:latest)
        for model_name in available:
            if model_name.startswith(self.model):
                return model_name

        # Try fallback model
        for model_name in available:
            if model_name.startswith(self.fallback_model):
                logger.warning(
                    f"Primary model '{self.model}' not found. "
                    f"Using fallback: {model_name}"
                )
                return model_name

        # Return primary model name and let Ollama handle the error
        logger.warning(
            f"Neither '{self.model}' nor '{self.fallback_model}' found in Ollama. "
            f"Available: {available}. Attempting with '{self.model}'."
        )
        return self.model

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.TimeoutException),
        reraise=True,
    )
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        Generate text using the Ollama model.

        Args:
            prompt: The user prompt.
            system_prompt: Optional system-level instructions.
            temperature: Override default temperature.
            max_tokens: Override default max tokens.

        Returns:
            Generated text as a string.

        Raises:
            RuntimeError: If generation fails after retries.
        """
        model = await self.get_active_model()

        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature or self.temperature,
                "num_predict": max_tokens or self.max_tokens,
                "num_ctx": 512,    # minimal context = ~1.8 GB RAM for phi3 (fits on 8 GB machines)
                "top_p": 0.9,
                "repeat_penalty": 1.1,
            },
        }

        if system_prompt:
            payload["system"] = system_prompt

        logger.info(f"Generating with model: {model} | Prompt length: {len(prompt)} chars")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json=payload,
            )

            if response.status_code != 200:
                raise RuntimeError(
                    f"Ollama returned status {response.status_code}: {response.text}"
                )

            data = response.json()
            generated_text = data.get("response", "").strip()

            if not generated_text:
                raise RuntimeError("Ollama returned an empty response.")

            logger.info(f"Generation complete: {len(generated_text)} chars")
            return generated_text

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> dict:
        """
        Generate text and parse it as JSON.
        Attempts to extract JSON from the response even if surrounded by text.

        Args:
            prompt: The user prompt (should instruct the model to return JSON).
            system_prompt: Optional system instructions.

        Returns:
            Parsed JSON as a dict.

        Raises:
            ValueError: If the response cannot be parsed as JSON.
        """
        raw = await self.generate(prompt, system_prompt)

        # Try direct parse first
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass

        # Try to extract JSON block from markdown code fences
        import re
        json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        # Try to find the first { ... } block
        brace_match = re.search(r"\{.*\}", raw, re.DOTALL)
        if brace_match:
            try:
                return json.loads(brace_match.group(0))
            except json.JSONDecodeError:
                pass

        raise ValueError(
            f"Could not parse JSON from model response. Raw response:\n{raw[:500]}..."
        )

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> str:
        """
        Generate free-form text (not JSON).
        Used for conversational responses.

        Args:
            prompt: The user prompt.
            system_prompt: Optional system instructions.
            temperature: Override default temperature (use slightly higher for chat).

        Returns:
            Generated text as a string.
        """
        return await self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature or min(self.temperature + 0.1, 1.0),
        )


_ollama_service: Optional[OllamaService] = None


def get_ollama_service() -> OllamaService:
    """Returns a singleton OllamaService instance."""
    global _ollama_service
    if _ollama_service is None:
        _ollama_service = OllamaService()
    return _ollama_service
