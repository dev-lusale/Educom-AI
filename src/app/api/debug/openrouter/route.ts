/**
 * GET /api/debug/openrouter
 *
 * Debug endpoint — tests the OpenRouter API key and connectivity.
 * Returns key format validation, a lightweight model list call,
 * and a minimal test generation.
 *
 * Remove or protect this endpoint before shipping to production.
 */

import { NextResponse } from "next/server";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export async function GET() {
  const key = process.env.OPENROUTER_API_KEY ?? "";

  if (!key) {
    return NextResponse.json({
      ok: false,
      error: "OPENROUTER_API_KEY is not set in .env.local",
    });
  }

  const keyPreview = `${key.slice(0, 7)}...${key.slice(-4)}`;
  // OpenRouter keys start with "sk-or-"
  const looksValid = key.startsWith("sk-or-");

  // ── 1. Fetch available models (lightweight — no generation) ───────────────
  let modelsStatus = "";
  let modelCount = 0;
  try {
    const modelsRes = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
    const modelsBody = await modelsRes.text();
    modelsStatus = `HTTP ${modelsRes.status}`;
    if (modelsRes.ok) {
      try {
        const parsed = JSON.parse(modelsBody);
        modelCount = parsed?.data?.length ?? 0;
      } catch {
        // non-JSON body
      }
    } else {
      modelsStatus += `: ${modelsBody.slice(0, 200)}`;
    }
  } catch (e) {
    modelsStatus = `Network error: ${e instanceof Error ? e.message : String(e)}`;
  }

  // ── 2. Minimal test generation (qwen/qwen3-8b) ───────────────────────────
  let generateStatus = "";
  let testReply = "";
  try {
    const genRes = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://educom-ai.vercel.app",
        "X-Title": "EduCom AI",
      },
      body: JSON.stringify({
        model: "qwen/qwen3-8b",
        messages: [
          {
            role: "system",
            content: "You are EduCom AI. Respond with exactly one sentence.",
          },
          {
            role: "user",
            content: "Say hello in one sentence.",
          },
        ],
        max_tokens: 30,
        temperature: 0.5,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const genBody = await genRes.text();
    generateStatus = `HTTP ${genRes.status}`;

    if (genRes.ok) {
      try {
        const parsed = JSON.parse(genBody);
        testReply = parsed?.choices?.[0]?.message?.content?.trim() ?? "(empty)";
      } catch {
        generateStatus += ` — could not parse JSON`;
      }
    } else {
      generateStatus += `: ${genBody.slice(0, 200)}`;
    }
  } catch (e) {
    generateStatus = `Network error: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json({
    ok: looksValid && generateStatus.startsWith("HTTP 200"),
    keyPreview,
    looksValid,
    modelsStatus,
    modelCount,
    generateStatus,
    testReply,
    hint: looksValid
      ? "Key format looks correct (starts with sk-or-)."
      : "Key format looks wrong. Get your key at https://openrouter.ai/keys",
  });
}
