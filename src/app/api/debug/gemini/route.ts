/**
 * GET /api/debug/gemini
 * Temporary debug endpoint — tests the Gemini API key and returns the exact error.
 * Remove this file once Gemini is working correctly.
 */
import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.GEMINI_API_KEY ?? "";
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

  if (!key) {
    return NextResponse.json({ ok: false, error: "GEMINI_API_KEY is not set in .env.local" });
  }

  // 1. Check key format — Gemini keys start with AIza OR AQ. (regional variant)
  const keyPreview = `${key.slice(0, 6)}...${key.slice(-4)}`;
  const looksValid = key.startsWith("AIza") || key.startsWith("AQ.");

  // 2. Try models list (lightweight — no generation)
  let modelsStatus = "";
  try {
    const modelsRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    const modelsBody = await modelsRes.text();
    modelsStatus = `HTTP ${modelsRes.status}: ${modelsBody.slice(0, 300)}`;
  } catch (e) {
    modelsStatus = `Network error: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 3. Try a minimal generation
  let generateStatus = "";
  try {
    const genRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Say hello in one word." }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
        signal: AbortSignal.timeout(15_000),
      }
    );
    const genBody = await genRes.text();
    generateStatus = `HTTP ${genRes.status}: ${genBody.slice(0, 300)}`;
  } catch (e) {
    generateStatus = `Network error: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json({
    keyPreview,
    looksValid,
    model,
    modelsStatus,
    generateStatus,
    hint: looksValid
      ? "Key format looks correct (starts with AIza or AQ.)"
      : "Key format looks wrong. Get your key at https://aistudio.google.com/app/apikey",
  });
}
