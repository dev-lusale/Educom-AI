/**
 * POST /api/quiz-generator
 *
 * AI-powered quiz generation for Zambian teachers (ECZ-aligned).
 * Uses EduCom AI via OpenRouter (deepseek/deepseek-chat).
 * Falls back to the FastAPI AI backend, then to a template builder.
 *
 * Request body:
 *   grade            string  — e.g. "Form 2", "Grade 7"
 *   subject          string  — e.g. "Mathematics"
 *   topic            string  — e.g. "Fractions"
 *   difficulty       string  — "easy" | "medium" | "hard" | "mixed"  (default: "mixed")
 *   num_mcq          number  — multiple-choice questions (default: 5)
 *   num_short_answer number  — short-answer questions   (default: 5)
 *   num_structured   number  — structured questions     (default: 0)
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

const QUIZ_SYSTEM_PROMPT = `You are EduCom AI, an expert assessment designer for the Zambian education system.

You generate high-quality quizzes that are:
- Fully aligned with the Zambia Competency-Based Curriculum (CBC) and ECZ standards
- Appropriate for the specified grade level and subject
- Pedagogically sound — testing understanding, application, and analysis (not just recall)
- Practical for Zambian classroom contexts

Output format: strict JSON only. No markdown, no explanation outside the JSON.`;

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildQuizPrompt(params: {
  grade: string;
  subject: string;
  topic: string;
  difficulty: string;
  numMcq: number;
  numShortAnswer: number;
  numStructured: number;
  learningObjectives: string;
}): string {
  const totalMcqMarks = params.numMcq * 2;
  const totalShortMarks = params.numShortAnswer * 3;
  const totalStructuredMarks = params.numStructured * 5;
  const totalMarks = totalMcqMarks + totalShortMarks + totalStructuredMarks;

  return `Generate a ${params.difficulty} difficulty quiz for ${params.grade} ${params.subject} on the topic: "${params.topic}".

Requirements:
- ${params.numMcq} multiple-choice questions (2 marks each) — 4 options (A, B, C, D), one correct answer
- ${params.numShortAnswer} short-answer questions (3 marks each) — require 1–3 sentence answers
- ${params.numStructured} structured questions (5 marks each) — multi-part with mark allocation
- Total marks: ${totalMarks}
- ECZ-aligned question style
- Zambian context where possible${params.learningObjectives ? `\n- Learning objectives: ${params.learningObjectives}` : ""}

Return this exact JSON structure:
{
  "grade": "${params.grade}",
  "subject": "${params.subject}",
  "topic": "${params.topic}",
  "difficulty": "${params.difficulty}",
  "duration": "40 minutes",
  "total_marks": ${totalMarks},
  "instructions": "Answer ALL questions. Each question carries marks as indicated. Write clearly and legibly.",
  "sections": [
    {
      "name": "Section A — Multiple Choice",
      "description": "Circle the letter of the best answer.",
      "section_marks": ${totalMcqMarks},
      "questions": [
        {
          "number": 1,
          "type": "mcq",
          "question": "...",
          "marks": 2,
          "options": [
            { "letter": "A", "text": "..." },
            { "letter": "B", "text": "..." },
            { "letter": "C", "text": "..." },
            { "letter": "D", "text": "..." }
          ],
          "answer": "A",
          "section": "A"
        }
      ]
    },
    {
      "name": "Section B — Short Answer",
      "description": "Answer all questions in full sentences.",
      "section_marks": ${totalShortMarks},
      "questions": [
        {
          "number": ${params.numMcq + 1},
          "type": "short_answer",
          "question": "...",
          "marks": 3,
          "answer_guide": "...",
          "section": "B"
        }
      ]
    }
  ],
  "answer_key": [
    { "question_number": 1, "answer": "A", "marks": 2 }
  ],
  "learning_objectives": ["...", "..."]
}`;
}

// ── Fallback builder ──────────────────────────────────────────────────────────

function buildFallbackQuiz(body: Record<string, unknown>) {
  const { grade, subject, topic, difficulty = "mixed" } = body as Record<string, string>;
  const numMcq = Number(body.num_mcq ?? 5);
  const numShort = Number(body.num_short_answer ?? 5);
  const totalMarks = numMcq * 2 + numShort * 3;

  return {
    grade, subject, topic, difficulty,
    duration: "40 minutes",
    total_marks: totalMarks,
    instructions: "Answer ALL questions. Each question carries marks as indicated. Write clearly.",
    sections: [
      {
        name: "Section A — Multiple Choice",
        description: "Circle the letter of the best answer.",
        section_marks: numMcq * 2,
        questions: Array.from({ length: numMcq }, (_, i) => ({
          number: i + 1,
          type: "mcq",
          question: `Question ${i + 1}: [AI model unavailable — regenerate when online]`,
          marks: 2,
          options: [
            { letter: "A", text: "Option A" },
            { letter: "B", text: "Option B" },
            { letter: "C", text: "Option C" },
            { letter: "D", text: "Option D" },
          ],
          answer: "A",
          section: "A",
        })),
      },
      {
        name: "Section B — Short Answer",
        description: "Answer all questions in full sentences.",
        section_marks: numShort * 3,
        questions: Array.from({ length: numShort }, (_, i) => ({
          number: numMcq + i + 1,
          type: "short_answer",
          question: `Question ${numMcq + i + 1}: [AI model unavailable — regenerate when online]`,
          marks: 3,
          answer_guide: "See teacher's guide.",
          section: "B",
        })),
      },
    ],
    answer_key: Array.from({ length: numMcq }, (_, i) => ({
      question_number: i + 1,
      answer: "A",
      marks: 2,
    })),
    learning_objectives: [`Understand key concepts of ${topic}`, `Apply knowledge to real-world contexts`],
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
          error: "Quiz generation requires a Premium subscription. Upgrade to unlock unlimited assessments.",
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
      difficulty = "mixed",
      num_mcq = 5,
      num_short_answer = 5,
      num_structured = 0,
      learning_objectives = "",
    } = body as {
      grade: string;
      subject: string;
      topic: string;
      difficulty?: string;
      num_mcq?: number;
      num_short_answer?: number;
      num_structured?: number;
      learning_objectives?: string;
    };

    if (!grade || !subject || !topic) {
      return NextResponse.json(
        { error: "grade, subject, and topic are required." },
        { status: 400 }
      );
    }

    // ── 1. OpenRouter (primary) ─────────────────────────────────────────────
    try {
      const prompt = buildQuizPrompt({
        grade, subject, topic, difficulty,
        numMcq: num_mcq,
        numShortAnswer: num_short_answer,
        numStructured: num_structured,
        learningObjectives: learning_objectives,
      });

      const messages = buildMessages(QUIZ_SYSTEM_PROMPT, prompt);
      const data = await callOpenRouterJSON({
        task: "quiz",
        messages,
        maxTokens: 4096,
        temperature: 0.5,
      });

      return NextResponse.json(data);
    } catch (err) {
      if (err instanceof OpenRouterAuthError) {
        console.error("[QuizGenerator] OpenRouter auth error:", err.message);
      } else {
        console.warn("[QuizGenerator] OpenRouter failed:", err instanceof Error ? err.message : String(err));
      }
    }

    // ── 2. FastAPI AI backend ────────────────────────────────────────────────
    if (AI_BACKEND_URL) {
      try {
        const aiRes = await fetch(`${AI_BACKEND_URL}/api/ai/generate-quiz`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, user_id: session.user.id }),
          signal: AbortSignal.timeout(120_000),
        });

        if (aiRes.ok) {
          return NextResponse.json(await aiRes.json());
        }
        console.warn(`[QuizGenerator] AI backend: ${aiRes.status}`);
      } catch (err) {
        console.warn("[QuizGenerator] AI backend unavailable:", err instanceof Error ? err.message : err);
      }
    }

    // ── 3. Template fallback ─────────────────────────────────────────────────
    return NextResponse.json(buildFallbackQuiz(body));
  } catch {
    return NextResponse.json({ error: "Failed to generate quiz." }, { status: 500 });
  }
}
