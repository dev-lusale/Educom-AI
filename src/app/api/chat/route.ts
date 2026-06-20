/**
 * POST /api/chat
 * GET  /api/chat
 *
 * Conversational AI assistant for Zambian teachers and students.
 * Powered by EduCom AI (OpenRouter) — provider identity is never exposed.
 *
 * Strategy:
 *   1. Call OpenRouter directly (qwen/qwen3-8b, fallback: llama-3.3-70b)
 *   2. Optionally enrich with user resource context from AI backend (best-effort, 3s timeout)
 *   3. If OpenRouter fails, proxy to the FastAPI AI backend
 *   4. Built-in static fallback as last resort
 *
 * NOTE: The AI backend RAG call is fire-and-forget with a 3s cap.
 * OpenRouter ALWAYS runs first and independently — a dead AI backend
 * never blocks or breaks the chat.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  callOpenRouter,
  buildMessages,
  OpenRouterAuthError,
  OpenRouterRateLimitError,
} from "@/lib/openrouter";

const AI_BACKEND_URL = process.env.AI_BACKEND_URL ?? "";
const HISTORY_LIMIT  = 20;

// ── Rate limiter: max 30 messages per user per minute ────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now   = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

// ── System prompt ─────────────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are EduCom AI, a friendly and knowledgeable teaching assistant built for the Zambian education system.

Your expertise covers:
- The Zambia Competency-Based Curriculum (CBC) Framework for all grades (ECE to Form 4)
- The Examinations Council of Zambia (ECZ) examination standards and formats
- All subjects taught in Zambian schools and universities
- Learner-centred, activity-based teaching methodologies
- Zambian classroom contexts — both rural and urban schools
- Lesson planning, scheme of work development, and assessment design
- CBC competencies: Critical Thinking, Communication, Cooperation, Creativity, Self-Management
- University-level academic support for Zambian students

How you respond:
- Be warm, supportive, and professional — like a knowledgeable colleague
- Give practical, actionable advice that works in real Zambian classrooms
- Use Zambian examples, contexts, and terminology where relevant
- Keep responses clear and well-structured using bullet points or numbered lists when helpful
- When asked for lesson plan IDEAS, provide 3–5 specific, concrete ideas directly
- When asked about teaching strategies, give specific practical techniques with Zambian examples
- When asked about assessments, give ECZ-aligned question types and marking tips
- Never say "go to the Lesson Planner" unless the teacher explicitly asks to generate a full formatted plan
- Keep responses concise but complete — aim for 150–300 words
- Always answer the actual question being asked
- When TEACHER RESOURCES are provided below, use them to ground your answer — cite the source document`;

// ── Best-effort RAG context (non-blocking) ────────────────────────────────────
// Only called when AI_BACKEND_URL is set and healthy.
// Hard 3-second timeout — a slow or dead backend never delays the response.

async function tryGetUserResourceContext(
  userId: string,
  message: string
): Promise<string> {
  if (!AI_BACKEND_URL) return "";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3_000);

    const res = await fetch(`${AI_BACKEND_URL}/api/curriculum/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query:      message,
        collection: "user_resources",
        user_id:    userId,
        top_k:      4,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return "";

    const data = await res.json();
    const results = (data.results ?? []).filter(
      (r: { relevance_score: number }) => r.relevance_score > 0.2
    );

    if (results.length === 0) return "";

    return results
      .map((r: { source: string; content: string }) =>
        `[${r.source}]\n${r.content.slice(0, 350)}`
      )
      .join("\n\n");
  } catch {
    return ""; // timeout, network error, or backend down — silent fallback
  }
}

function buildSystemPrompt(userContext: string): string {
  if (!userContext) return BASE_SYSTEM_PROMPT;
  return (
    BASE_SYSTEM_PROMPT +
    "\n\n────────────────────────────────────────\n" +
    "TEACHER'S UPLOADED RESOURCES (use these to personalise your answer):\n\n" +
    userContext +
    "\n────────────────────────────────────────"
  );
}

// ── Fallback responses ────────────────────────────────────────────────────────

const FALLBACK_RESPONSES: { pattern: RegExp; reply: string }[] = [
  {
    pattern: /lesson plan idea|lesson idea|suggest.*lesson|engaging.*lesson|teach.*fraction|teach.*topic/i,
    reply:
      "Here are some engaging lesson plan ideas — the AI assistant is temporarily at capacity. Try again in a moment!\n\n**For fractions (Grade 5):**\n• Use local market scenarios — dividing nsima portions equally\n• Pizza/bread sharing activities to visualise halves and quarters\n• Fraction walls made from strips of paper\n• Number line jumps on the chalkboard\n• Group games where learners sort fraction cards",
  },
  {
    pattern: /assessment|ecz.*align|design.*exam|exam.*design/i,
    reply:
      "For ECZ-aligned assessments, the AI is briefly offline. Key tips:\n\n• Section A: Multiple choice (1 mark each)\n• Section B: Short structured (3–5 marks)\n• Section C: Long structured / problem-solving (10–15 marks)\n• Always include a worked-example style marking guide\n• Align each question to a specific syllabus learning outcome",
  },
  {
    pattern: /hello|hi\b|hey\b|good morning|good afternoon/i,
    reply:
      "Hello! I'm EduCom AI, your educational assistant. I'm here to help with lesson planning, assessments, CBC guidance, and teaching strategies. What can I help you with today?",
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
    "I'm temporarily at capacity. Please try again in 30 seconds.\n\n" +
    "I can help you with lesson planning, assessments, CBC guidance, and teaching strategies."
  );
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const userId   = session.user.id;
  const userName = session.user.name ?? "Teacher";

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

  // Load recent history
  const historyRows = await prisma.chatMessage.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    take:    HISTORY_LIMIT + 1,
    select:  { role: true, content: true },
  });
  const history = historyRows.reverse().slice(0, -1);

  // Fetch user resource context — best-effort, 3s max, never blocks
  const userContext = await tryGetUserResourceContext(userId, message.trim());

  let reply = "";

  // ── 1. OpenRouter (primary — always runs, never gated on backend) ─────────
  try {
    const systemPrompt = buildSystemPrompt(userContext);
    const messages     = buildMessages(systemPrompt, message.trim(), history);

    const result = await callOpenRouter({
      task:        "chat",
      messages,
      temperature: 0.8,
      maxTokens:   1024,
      timeoutMs:   30_000,
    });
    reply = result.content;
  } catch (err) {
    if (err instanceof OpenRouterAuthError) {
      console.error("[Chat] OpenRouter auth error:", err.message);
    } else if (err instanceof OpenRouterRateLimitError) {
      console.warn("[Chat] OpenRouter rate limited");
    } else {
      console.error("[Chat] OpenRouter failed:", err instanceof Error ? err.message : String(err));
    }
  }

  // ── 2. FastAPI AI backend (only if OpenRouter failed and backend is up) ───
  if (!reply && AI_BACKEND_URL) {
    try {
      const aiRes = await fetch(`${AI_BACKEND_URL}/api/ai/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          message:            message.trim(),
          history,
          user_name:          userName,
          user_id:            userId,
          use_user_resources: true,
        }),
        signal: AbortSignal.timeout(20_000),
      });

      if (aiRes.ok) {
        const data = await aiRes.json();
        reply = data.reply ?? data.message ?? "";
      }
    } catch {
      // backend down — silent
    }
  }

  // ── 3. Static fallback ────────────────────────────────────────────────────
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
    where:   { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    take:    100,
    select:  { id: true, role: true, content: true, createdAt: true },
  });

  return NextResponse.json({ messages });
}
