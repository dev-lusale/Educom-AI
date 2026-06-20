/**
 * POST /api/marking-scheme
 *
 * AI-powered marking scheme generation for Zambian teachers (ECZ-aligned).
 * Uses EduCom AI via OpenRouter (qwen/qwen3-8b).
 * Falls back to the FastAPI AI backend, then to a template builder.
 *
 * Request body:
 *   grade            string  — e.g. "Form 3"
 *   subject          string  — e.g. "Chemistry"
 *   topic            string  — e.g. "Chemical Bonding"
 *   exam_type        string  — "End of Term" | "Mid-Term" | "Mock" | "Class Test"
 *   term             string  — "Term 1" | "Term 2" | "Term 3"
 *   total_marks      number  — default 100
 *   duration_minutes number  — default 120
 *   questions        array   — optional: existing question list to generate answers for
 *   learning_objectives string (optional)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  callOpenRouterJSON,
  buildMessages,
  OpenRouterAuthError,
} from "@/lib/openrouter";

const AI_BACKEND_URL = process.env.AI_BACKEND_URL ?? "";

// ── System prompt ─────────────────────────────────────────────────────────────

const MARKING_SCHEME_SYSTEM_PROMPT = `You are EduCom AI, an expert ECZ examination marking scheme writer for the Zambian education system.

You produce detailed, accurate marking schemes that:
- Follow official ECZ marking conventions (max marks, award marks, accept alternatives)
- Include model answers, key points, and mark allocation per point
- Use the standard ECZ examiner language ("Award 1 mark for...", "Accept any reasonable answer")
- Cover all sections of the examination (A, B, C)
- Include general examiner notes and common errors to watch for
- Are suitable for both experienced and newly trained markers

Output format: strict JSON only. No markdown, no explanation outside the JSON.`;

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildMarkingSchemePrompt(params: {
  grade: string;
  subject: string;
  topic: string;
  examType: string;
  term: string;
  totalMarks: number;
  durationMinutes: number;
  learningObjectives: string;
  questions?: unknown[];
}): string {
  const year = new Date().getFullYear();

  return `Generate a complete ECZ marking scheme for a ${params.examType} in ${params.grade} ${params.subject}.

Details:
- Topic/Scope: ${params.topic}
- Term: ${params.term}, ${year}
- Total marks: ${params.totalMarks}
- Duration: ${params.durationMinutes} minutes${params.learningObjectives ? `\n- Learning objectives: ${params.learningObjectives}` : ""}${params.questions?.length ? `\n\nQuestions to mark:\n${JSON.stringify(params.questions, null, 2)}` : ""}

Return this exact JSON structure:
{
  "grade": "${params.grade}",
  "subject": "${params.subject}",
  "topic": "${params.topic}",
  "exam_type": "${params.examType}",
  "term": "${params.term}",
  "year": "${year}",
  "total_marks": ${params.totalMarks},
  "sections": [
    {
      "label": "SECTION A",
      "title": "Multiple Choice — Answer Key",
      "questions": [
        {
          "number": 1,
          "answer": "B",
          "marks": 1,
          "explanation": "Brief explanation of why B is correct"
        }
      ]
    },
    {
      "label": "SECTION B",
      "title": "Short Structured — Mark Allocation",
      "questions": [
        {
          "number": 21,
          "total_marks": 10,
          "sub_questions": [
            {
              "part": "a",
              "marks": 4,
              "model_answer": "...",
              "mark_points": [
                "Award 1 mark for: ...",
                "Award 1 mark for: ...",
                "Award 1 mark for: ...",
                "Award 1 mark for: ..."
              ],
              "accept_alternatives": ["...", "..."]
            }
          ]
        }
      ]
    },
    {
      "label": "SECTION C",
      "title": "Long Structured / Essays — Mark Allocation",
      "questions": [
        {
          "number": 26,
          "total_marks": 20,
          "model_answer": "...",
          "mark_points": [
            "Award 2 marks for: ...",
            "Award 2 marks for: ..."
          ],
          "accept_alternatives": [],
          "examiner_note": "Accept any well-reasoned response that demonstrates understanding."
        }
      ]
    }
  ],
  "general_examiner_notes": [
    "Mark positively — award marks for what candidates know, not what they omit.",
    "Accept all reasonable and relevant responses unless the question demands a specific answer.",
    "Do not penalise candidates for poor spelling or grammar unless communication is seriously impaired.",
    "Where a candidate makes an error in part (a) but correctly applies it in parts (b) and (c), award marks for the follow-through (own figure rule)."
  ]
}`;
}

// ── Fallback builder ──────────────────────────────────────────────────────────

function buildFallbackMarkingScheme(body: Record<string, unknown>) {
  const {
    grade, subject, topic,
    exam_type = "End of Term",
    term = "Term 1",
  } = body as Record<string, string>;
  const totalMarks = Number(body.total_marks ?? 100);
  const year = new Date().getFullYear().toString();

  return {
    grade, subject, topic, exam_type, term, year,
    total_marks: totalMarks,
    sections: [],
    general_examiner_notes: [
      "AI model unavailable — regenerate marking scheme when online.",
      `Award marks generously for ${topic}-related responses that demonstrate understanding.`,
      "Accept all reasonable and relevant responses.",
      "Mark positively — award marks for what candidates know.",
    ],
  };
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.plan !== "PREMIUM") {
      return NextResponse.json(
        {
          error: "Marking scheme generation requires a Premium subscription. Upgrade to unlock this feature.",
          premium_required: true,
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      grade,
      subject,
      topic,
      exam_type = "End of Term",
      term = "Term 1",
      total_marks = 100,
      duration_minutes = 120,
      learning_objectives = "",
      questions,
    } = body as {
      grade: string;
      subject: string;
      topic: string;
      exam_type?: string;
      term?: string;
      total_marks?: number;
      duration_minutes?: number;
      learning_objectives?: string;
      questions?: unknown[];
    };

    if (!grade || !subject || !topic) {
      return NextResponse.json(
        { error: "grade, subject, and topic are required." },
        { status: 400 }
      );
    }

    // ── 1. OpenRouter (primary) ─────────────────────────────────────────────
    try {
      const prompt = buildMarkingSchemePrompt({
        grade, subject, topic,
        examType: exam_type,
        term,
        totalMarks: total_marks,
        durationMinutes: duration_minutes,
        learningObjectives: learning_objectives,
        questions,
      });

      const messages = buildMessages(MARKING_SCHEME_SYSTEM_PROMPT, prompt);
      const data = await callOpenRouterJSON({
        task: "markingScheme",
        messages,
        maxTokens: 5120,
        temperature: 0.3,
      });

      return NextResponse.json(data);
    } catch (err) {
      if (err instanceof OpenRouterAuthError) {
        console.error("[MarkingScheme] OpenRouter auth error:", err.message);
      } else {
        console.warn("[MarkingScheme] OpenRouter failed:", err instanceof Error ? err.message : String(err));
      }
    }

    // ── 2. FastAPI AI backend ────────────────────────────────────────────────
    if (AI_BACKEND_URL) {
      try {
        const aiRes = await fetch(`${AI_BACKEND_URL}/api/ai/generate-marking-scheme`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, user_id: session.user.id }),
          signal: AbortSignal.timeout(180_000),
        });

        if (aiRes.ok) {
          return NextResponse.json(await aiRes.json());
        }
        console.warn(`[MarkingScheme] AI backend: ${aiRes.status}`);
      } catch (err) {
        console.warn("[MarkingScheme] AI backend unavailable:", err instanceof Error ? err.message : err);
      }
    }

    // ── 3. Template fallback ─────────────────────────────────────────────────
    return NextResponse.json(buildFallbackMarkingScheme(body));
  } catch {
    return NextResponse.json({ error: "Failed to generate marking scheme." }, { status: 500 });
  }
}
