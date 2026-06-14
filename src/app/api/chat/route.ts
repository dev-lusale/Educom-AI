/**
 * POST /api/chat
 *
 * Conversational AI assistant for Zambian teachers.
 * Calls Google Gemini directly from Next.js — no Python backend needed.
 * Falls back to the FastAPI backend if configured, then to built-in responses.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const AI_BACKEND_URL = process.env.AI_BACKEND_URL ?? "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const HISTORY_LIMIT = 20;

// Simple in-memory rate limiter: max 30 messages per user per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

// ── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Educom AI, a friendly and knowledgeable teaching assistant for Zambian teachers.

Your expertise covers:
- The Zambia Competency-Based Curriculum (CBC) Framework for all grades (ECE to Form 4)
- The Examinations Council of Zambia (ECZ) examination standards and formats
- All subjects taught in Zambian schools
- Learner-centered, activity-based teaching methodologies
- Zambian classroom contexts — both rural and urban schools
- Lesson planning, scheme of work development, and assessment design
- CBC competencies: Critical Thinking, Communication, Cooperation, Creativity, Self-Management

How you respond:
- Be warm, supportive, and professional — like a knowledgeable colleague
- Give practical, actionable advice that works in real Zambian classrooms
- Use Zambian examples, contexts, and terminology where relevant
- Keep responses clear and well-structured using bullet points or numbered lists when helpful
- When a teacher asks for lesson plan IDEAS or SUGGESTIONS, provide 3-5 specific, concrete ideas directly
- When a teacher asks about teaching strategies, give specific practical techniques with Zambian examples
- When asked about assessments, give specific ECZ-aligned question types and marking tips
- Never say "go to the Lesson Planner" unless the teacher explicitly asks to generate a full formatted plan
- Keep responses concise but complete — aim for 150-300 words
- Always answer the actual question being asked`;

// ── Call Gemini directly ──────────────────────────────────────────────────────

async function callGemini(
  message: string,
  history: { role: string; content: string }[]
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  // Build conversation contents — Gemini uses "user" / "model" roles
  const contents: { role: string; parts: { text: string }[] }[] = [];

  for (const msg of history.slice(-20)) {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }

  // Add current message
  contents.push({ role: "user", parts: [{ text: message }] });

  const payload = {
    contents,
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 1024,
      topP: 0.95,
    },
  };

  // Retry up to 3 times with backoff on 429 rate limit
  const MAX_RETRIES = 3;
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) throw new Error("Empty response from Gemini");
      return text;
    }

    const errBody = await res.text();
    lastError = `HTTP ${res.status}: ${errBody.slice(0, 200)}`;

    if (res.status === 429) {
      // Rate limited — wait before retry (2s, 4s, 8s)
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
        continue;
      }
    }

    throw new Error(lastError);
  }

  throw new Error(`Gemini failed after ${MAX_RETRIES} attempts: ${lastError}`);
}

// ── Fallback responses (used only when all AI options fail) ──────────────────

const FALLBACK_RESPONSES: { pattern: RegExp; reply: string }[] = [
  {
    pattern: /lesson plan idea|lesson idea|suggest.*lesson|engaging.*lesson|teach.*fraction|teach.*topic/i,
    reply:
      "Here are some engaging lesson plan ideas — though the AI assistant is temporarily offline. Try again in a moment for personalised Gemini-powered suggestions!\n\n**For fractions (Grade 5):**\n• Use local market scenarios — dividing nsima portions equally\n• Pizza/bread sharing activities to visualise halves and quarters\n• Fraction walls made from strips of paper\n• Number line jumps on the chalkboard\n• Group games where learners sort fraction cards",
  },
  {
    pattern: /assessment|ecz.*align|design.*exam|exam.*design/i,
    reply:
      "For ECZ-aligned assessments, the AI is briefly offline. Key tips:\n\n• Section A: Multiple choice (1 mark each)\n• Section B: Short structured (3–5 marks)\n• Section C: Long structured / problem-solving (10–15 marks)\n• Always include a worked-example style marking guide\n• Align each question to a specific syllabus learning outcome",
  },
  {
    pattern: /hello|hi\b|hey\b|good morning|good afternoon/i,
    reply: "Hello! I'm your Educom AI assistant. I'm here to help with lesson planning, assessments, CBC guidance, and teaching strategies. What can I help you with today?",
  },
  {
    pattern: /thank/i,
    reply: "You're welcome! Is there anything else I can help you with?",
  },
];

function getFallbackReply(message: string): string {
  for (const { pattern, reply } of FALLBACK_RESPONSES) {
    if (pattern.test(message)) return reply;
  }
  return (
    "I'm temporarily at capacity (too many requests). Please try again in 30 seconds — " +
    "the Gemini free tier allows 15 requests per minute.\n\n" +
    "I can help you with lesson planning, assessments, CBC guidance, and teaching strategies."
  );
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const userId = session.user.id;
  const userName = session.user.name ?? "Teacher";

  // Rate limit
  if (!checkRateLimit(userId)) {
    return NextResponse.json(
      { error: "Too many messages. Please wait a moment before sending again." },
      { status: 429 }
    );
  }

  // Save user message
  await prisma.chatMessage.create({
    data: { userId, role: "user", content: message.trim() },
  });

  // Load recent history (excluding the message just saved)
  const historyRows = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT + 1,
    select: { role: true, content: true },
  });
  const history = historyRows.reverse().slice(0, -1).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let reply = "";

  // ── 1. Try Gemini directly (fastest, most reliable) ──────────────────────
  if (GEMINI_API_KEY) {
    try {
      reply = await callGemini(message.trim(), history);
    } catch (err) {
      // Log the full error so we can see exactly what Gemini returns
      console.error("[Chat] Gemini direct call failed:", err instanceof Error ? err.message : String(err));
    }
  } else {
    console.warn("[Chat] GEMINI_API_KEY is not set in .env.local");
  }

  // ── 2. Try FastAPI backend (has RAG context) ──────────────────────────────
  if (!reply && AI_BACKEND_URL) {
    try {
      const aiRes = await fetch(`${AI_BACKEND_URL}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          history,
          user_name: userName,
          user_id: userId,
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (aiRes.ok) {
        const data = await aiRes.json();
        reply = data.reply ?? data.message ?? "";
      } else {
        console.warn(`[Chat] AI backend returned ${aiRes.status}: ${await aiRes.text().catch(() => "")}`);
      }
    } catch (err) {
      console.warn("[Chat] AI backend unavailable:", err instanceof Error ? err.message : err);
    }
  }

  // ── 3. Built-in fallback ──────────────────────────────────────────────────
  if (!reply) {
    reply = getFallbackReply(message);
  }

  // Save assistant reply
  await prisma.chatMessage.create({
    data: { userId, role: "assistant", content: reply },
  });

  return NextResponse.json({ reply });
}

// ── GET — load chat history ───────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { id: true, role: true, content: true, createdAt: true },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

// ── DELETE — clear chat history ───────────────────────────────────────────────

export async function DELETE() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.chatMessage.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ success: true });
}
