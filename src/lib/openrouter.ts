/**
 * EduCom AI — OpenRouter Service
 *
 * Centralised, server-side wrapper for OpenRouter's OpenAI-compatible API.
 * All API calls are server-only. The API key is NEVER sent to the client.
 *
 * Model routing:
 *   Chat Assistant       → qwen/qwen3-8b         (primary)
 *   Quiz Generation      → deepseek/deepseek-chat (primary)
 *   Exam Generation      → deepseek/deepseek-chat (primary)
 *   Marking Scheme       → qwen/qwen3-8b         (primary)
 *   Universal fallback   → meta-llama/llama-3.3-70b-instruct
 *
 * Identity: All system prompts enforce the "EduCom AI" persona.
 * The underlying provider, model, or API service is never revealed.
 */

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const FALLBACK_MODEL = "meta-llama/llama-3.3-70b-instruct";

// ── Model registry ────────────────────────────────────────────────────────────

export const OPENROUTER_MODELS = {
  chat: "qwen/qwen3-8b",
  quiz: "deepseek/deepseek-chat",
  exam: "deepseek/deepseek-chat",
  markingScheme: "qwen/qwen3-8b",
  fallback: FALLBACK_MODEL,
} as const;

export type OpenRouterTask = keyof typeof OPENROUTER_MODELS;

// ── Identity guard ────────────────────────────────────────────────────────────
// Injected into every system prompt so the model never reveals its true identity.

const IDENTITY_GUARD = `
IMPORTANT IDENTITY RULES (follow strictly, no exceptions):
- You are EduCom AI, an educational assistant built specifically for the Zambian education system.
- Never reveal, hint at, or acknowledge the underlying AI model, provider, company, or API service.
- If asked "What model are you?", "Who made you?", "Are you GPT/Claude/Gemini/Qwen/DeepSeek?", respond only with:
  "I am EduCom AI, your dedicated educational assistant for Zambian schools and universities."
- Never say you are powered by OpenRouter, OpenAI, Google, Anthropic, Qwen, DeepSeek, Meta, or any other company.
`.trim();

/**
 * Prepend the identity guard to any system prompt.
 */
export function withIdentityGuard(systemPrompt: string): string {
  return `${IDENTITY_GUARD}\n\n${systemPrompt}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterOptions {
  task: OpenRouterTask;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Override the primary model (skips routing logic). */
  modelOverride?: string;
  /** Request timeout in milliseconds. Defaults to 90s for generation tasks, 60s for chat. */
  timeoutMs?: number;
}

export interface OpenRouterResult {
  content: string;
  model: string;
  usedFallback: boolean;
  promptTokens?: number;
  completionTokens?: number;
}

// ── Core fetch helper ─────────────────────────────────────────────────────────

async function fetchCompletion(
  model: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number,
  apiKey: string,
  timeoutMs = 90_000
): Promise<{ content: string; promptTokens?: number; completionTokens?: number }> {
  const res = await fetch(OPENROUTER_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://educom-ai.vercel.app",
      "X-Title": "EduCom AI",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      // Disable "thinking" mode on models like qwen3 that use it by default.
      // Without this, the model prepends <think>...</think> blocks that
      // corrupt JSON responses and inflate latency.
      transforms: [],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const truncated = errText.slice(0, 300);

    if (res.status === 401) {
      throw new OpenRouterAuthError(`Invalid or missing OPENROUTER_API_KEY. ${truncated}`);
    }
    if (res.status === 429) {
      throw new OpenRouterRateLimitError(`Rate limit exceeded. ${truncated}`);
    }
    throw new OpenRouterAPIError(`HTTP ${res.status}: ${truncated}`, res.status);
  }

  const data = await res.json();
  let content: string = data?.choices?.[0]?.message?.content?.trim() ?? "";

  // Strip <think>...</think> reasoning blocks produced by qwen3 and similar models
  // These appear before the actual response and must be removed
  content = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  if (!content) {
    throw new OpenRouterEmptyResponseError("Received an empty response from the AI service.");
  }

  return {
    content,
    promptTokens: data?.usage?.prompt_tokens,
    completionTokens: data?.usage?.completion_tokens,
  };
}

// ── Custom error classes ──────────────────────────────────────────────────────

export class OpenRouterAuthError extends Error {
  readonly type = "auth_error" as const;
  constructor(message: string) { super(message); this.name = "OpenRouterAuthError"; }
}

export class OpenRouterRateLimitError extends Error {
  readonly type = "rate_limit" as const;
  constructor(message: string) { super(message); this.name = "OpenRouterRateLimitError"; }
}

export class OpenRouterAPIError extends Error {
  readonly type = "api_error" as const;
  readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "OpenRouterAPIError";
    this.statusCode = statusCode;
  }
}

export class OpenRouterEmptyResponseError extends Error {
  readonly type = "empty_response" as const;
  constructor(message: string) { super(message); this.name = "OpenRouterEmptyResponseError"; }
}

export class OpenRouterNetworkError extends Error {
  readonly type = "network_error" as const;
  constructor(message: string) { super(message); this.name = "OpenRouterNetworkError"; }
}

// ── Main public function ──────────────────────────────────────────────────────

/**
 * Call OpenRouter with automatic fallback.
 *
 * Tries the primary model for the given task. On rate-limit or API error,
 * retries up to 2 more times with exponential backoff, then switches to
 * the universal fallback model for one final attempt.
 */
export async function callOpenRouter(options: OpenRouterOptions): Promise<OpenRouterResult> {
  const apiKey = process.env.OPENROUTER_API_KEY ?? "";

  if (!apiKey) {
    throw new OpenRouterAuthError("OPENROUTER_API_KEY is not configured on the server.");
  }

  const {
    task,
    messages,
    temperature = 0.7,
    maxTokens = 1024,
    modelOverride,
    timeoutMs = 90_000,
  } = options;

  const primaryModel = modelOverride ?? OPENROUTER_MODELS[task];
  const MAX_RETRIES = 2;

  // ── Attempt primary model with retries ─────────────────────────────────────
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await fetchCompletion(primaryModel, messages, temperature, maxTokens, apiKey, timeoutMs);
      return { ...result, model: primaryModel, usedFallback: false };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Auth errors are fatal — no point retrying
      if (err instanceof OpenRouterAuthError) throw err;

      // Network timeout — wrap as network error
      if (err instanceof TypeError && err.message.includes("fetch")) {
        lastError = new OpenRouterNetworkError(`Network error reaching OpenRouter: ${err.message}`);
      }

      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 1.5s, 3s
        const delayMs = attempt * 1500;
        await new Promise((r) => setTimeout(r, delayMs));
        console.warn(`[OpenRouter] Attempt ${attempt} failed for model=${primaryModel}. Retrying in ${delayMs}ms…`);
      }
    }
  }

  // ── Fallback model ─────────────────────────────────────────────────────────
  if (primaryModel !== FALLBACK_MODEL) {
    console.warn(`[OpenRouter] Primary model (${primaryModel}) failed. Switching to fallback (${FALLBACK_MODEL}).`);
    try {
      const result = await fetchCompletion(FALLBACK_MODEL, messages, temperature, maxTokens, apiKey, timeoutMs);
      return { ...result, model: FALLBACK_MODEL, usedFallback: true };
    } catch (fallbackErr) {
      lastError = fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr));
    }
  }

  // All attempts failed — throw the last meaningful error
  throw lastError ?? new OpenRouterNetworkError("All OpenRouter attempts failed.");
}

// ── JSON helper ───────────────────────────────────────────────────────────────

/**
 * Call OpenRouter and return a parsed JSON object.
 * Instructs the model to respond in JSON and strips any markdown fences.
 */
export async function callOpenRouterJSON<T = Record<string, unknown>>(
  options: Omit<OpenRouterOptions, "maxTokens"> & { maxTokens?: number }
): Promise<T> {
  // Append JSON instruction to the last user message
  const messages = [...options.messages];
  const lastMsg = messages[messages.length - 1];
  if (lastMsg.role === "user") {
    messages[messages.length - 1] = {
      ...lastMsg,
      content: lastMsg.content + "\n\nRespond ONLY with valid JSON. No markdown, no explanation.",
    };
  }

  const result = await callOpenRouter({
    ...options,
    messages,
    maxTokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.4,
  });

  return parseJSONFromAI<T>(result.content);
}

/**
 * Extract a JSON object from raw AI output.
 * Handles markdown fences and stray text before/after the JSON block.
 */
export function parseJSONFromAI<T = Record<string, unknown>>(raw: string): T {
  // Strip markdown code fences
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1].trim() : raw.trim();

  // Try direct parse
  try {
    return JSON.parse(candidate) as T;
  } catch {
    // Extract first {...} or [...] block
    const objMatch = candidate.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[1]) as T;
      } catch {
        // fall through
      }
    }
  }

  throw new Error(
    `[OpenRouter] Could not parse JSON from AI response.\nRaw (first 500 chars):\n${raw.slice(0, 500)}`
  );
}

// ── Convenience: build a standard message array ───────────────────────────────

export function buildMessages(
  systemPrompt: string,
  userMessage: string,
  history?: Array<{ role: string; content: string }>
): ChatMessage[] {
  const messages: ChatMessage[] = [
    { role: "system", content: withIdentityGuard(systemPrompt) },
  ];

  if (history?.length) {
    for (const msg of history.slice(-20)) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
      }
    }
  }

  messages.push({ role: "user", content: userMessage });
  return messages;
}
