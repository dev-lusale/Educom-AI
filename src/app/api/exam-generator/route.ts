/**
 * POST /api/exam-generator
 *
 * AI-powered examination paper generation for Zambian teachers (ECZ-aligned).
 * Uses EduCom AI via OpenRouter (deepseek/deepseek-chat).
 * Falls back to the FastAPI AI backend, then to a template builder.
 *
 * Request body:
 *   grade            string  — e.g. "Form 3", "Grade 9"
 *   subject          string  — e.g. "Biology"
 *   topic            string  — e.g. "Cells and Cell Structure" (or "Full Syllabus")
 *   exam_type        string  — "End of Term" | "Mid-Term" | "Mock" | "Class Test" (default: "End of Term")
 *   term             string  — "Term 1" | "Term 2" | "Term 3"
 *   total_marks      number  — default 100
 *   duration_minutes number  — default 120
 *   include_marking_scheme boolean — default false
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

const EXAM_SYSTEM_PROMPT = `You are EduCom AI, an expert ECZ examination paper designer for the Zambian education system.

You generate full examination papers that are:
- Structured exactly like official ECZ papers (Section A, B, C format)
- Aligned with the Zambia Competency-Based Curriculum (CBC)
- Appropriate for the specified grade, subject, and exam type
- Professionally worded with clear candidate instructions
- Balanced across Bloom's taxonomy levels (recall, understanding, application, analysis)

Output format: strict JSON only. No markdown, no explanation outside the JSON.`;

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildExamPrompt(params: {
  grade: string;
  subject: string;
  topic: string;
  examType: string;
  term: string;
  totalMarks: number;
  durationMinutes: number;
  includeMarkingScheme: boolean;
  learningObjectives: string;
}): string {
  const year = new Date().getFullYear();
  const durationHours = Math.floor(params.durationMinutes / 60);
  const durationMins = params.durationMinutes % 60;
  const durationStr =
    durationMins === 0 ? `${durationHours} hours` : `${durationHours} hours ${durationMins} minutes`;

  return `Generate a complete ${params.examType} examination paper for ${params.grade} ${params.subject}.

Details:
- Topic/Scope: ${params.topic}
- Term: ${params.term}, ${year}
- Total marks: ${params.totalMarks}
- Duration: ${durationStr}
- ECZ format: Section A (MCQ), Section B (Short structured), Section C (Long structured/essays)${params.learningObjectives ? `\n- Learning objectives: ${params.learningObjectives}` : ""}${params.includeMarkingScheme ? "\n- Include a full marking scheme in the response" : ""}

Return this exact JSON structure:
{
  "grade": "${params.grade}",
  "subject": "${params.subject}",
  "topic": "${params.topic}",
  "exam_type": "${params.examType}",
  "term": "${params.term}",
  "year": "${year}",
  "duration": "${durationStr}",
  "total_marks": ${params.totalMarks},
  "instructions_to_candidates": [
    "Answer ALL questions in Section A.",
    "Answer THREE questions from Section B.",
    "Answer TWO questions from Section C.",
    "Write your name and centre number on the answer booklet.",
    "Silent, non-programmable calculators may be used where applicable."
  ],
  "sections": [
    {
      "label": "SECTION A",
      "title": "Multiple Choice Questions",
      "instructions": "Circle the letter of the correct answer. Each question carries 1 mark.",
      "marks": 20,
      "questions": [
        {
          "number": 1,
          "type": "mcq",
          "question": "...",
          "marks": 1,
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
      "label": "SECTION B",
      "title": "Short Structured Questions",
      "instructions": "Answer ALL questions. Show all working where applicable.",
      "marks": 40,
      "questions": [
        {
          "number": 21,
          "type": "structured",
          "question": "...",
          "marks": 10,
          "sub_questions": [
            { "part": "a", "question": "...", "marks": 4, "answer_guide": "..." },
            { "part": "b", "question": "...", "marks": 6, "answer_guide": "..." }
          ],
          "section": "B"
        }
      ]
    },
    {
      "label": "SECTION C",
      "title": "Long Structured / Essay Questions",
      "instructions": "Answer TWO questions from this section.",
      "marks": 40,
      "questions": [
        {
          "number": 26,
          "type": "essay",
          "question": "...",
          "marks": 20,
          "answer_guide": "...",
          "section": "C"
        }
      ]
    }
  ]
}`;
}

// ── Fallback builder ──────────────────────────────────────────────────────────

function buildFallbackExam(body: Record<string, unknown>) {
  const {
    grade, subject, topic,
    exam_type = "End of Term",
    term = "Term 1",
  } = body as Record<string, string>;
  const totalMarks = Number(body.total_marks ?? 100);
  const year = new Date().getFullYear().toString();

  return {
    grade, subject, topic, exam_type,
    term, year,
    duration: "2 hours",
    total_marks: totalMarks,
    instructions_to_candidates: [
      "Answer ALL questions in Section A.",
      "Answer THREE questions from Section B.",
      "Answer TWO questions from Section C.",
      "Write your name and centre number on the answer booklet.",
    ],
    sections: [
      {
        label: "SECTION A",
        title: "Multiple Choice Questions",
        instructions: "Circle the letter of the correct answer. Each question carries 1 mark.",
        marks: 20,
        questions: Array.from({ length: 5 }, (_, i) => ({
          number: i + 1,
          type: "mcq",
          question: "[AI model unavailable — regenerate when online]",
          marks: 1,
          options: [
            { letter: "A", text: "Option A" },
            { letter: "B", text: "Option B" },
            { letter: "C", text: "Option C" },
            { letter: "D", text: "Option D" },
          ],
          section: "A",
        })),
      },
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
          error: "Examination generation requires a Premium subscription. Upgrade to unlock unlimited exams.",
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
      include_marking_scheme = false,
      learning_objectives = "",
    } = body as {
      grade: string;
      subject: string;
      topic: string;
      exam_type?: string;
      term?: string;
      total_marks?: number;
      duration_minutes?: number;
      include_marking_scheme?: boolean;
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
      const prompt = buildExamPrompt({
        grade, subject, topic,
        examType: exam_type,
        term,
        totalMarks: total_marks,
        durationMinutes: duration_minutes,
        includeMarkingScheme: include_marking_scheme,
        learningObjectives: learning_objectives,
      });

      const messages = buildMessages(EXAM_SYSTEM_PROMPT, prompt);
      const data = await callOpenRouterJSON({
        task: "exam",
        messages,
        maxTokens: 6144,
        temperature: 0.4,
      });

      return NextResponse.json(data);
    } catch (err) {
      if (err instanceof OpenRouterAuthError) {
        console.error("[ExamGenerator] OpenRouter auth error:", err.message);
      } else {
        console.warn("[ExamGenerator] OpenRouter failed:", err instanceof Error ? err.message : String(err));
      }
    }

    // ── 2. FastAPI AI backend ────────────────────────────────────────────────
    if (AI_BACKEND_URL) {
      try {
        const aiRes = await fetch(`${AI_BACKEND_URL}/api/ai/generate-exam`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, user_id: session.user.id }),
          signal: AbortSignal.timeout(180_000),
        });

        if (aiRes.ok) {
          return NextResponse.json(await aiRes.json());
        }
        console.warn(`[ExamGenerator] AI backend: ${aiRes.status}`);
      } catch (err) {
        console.warn("[ExamGenerator] AI backend unavailable:", err instanceof Error ? err.message : err);
      }
    }

    // ── 3. Template fallback ─────────────────────────────────────────────────
    return NextResponse.json(buildFallbackExam(body));
  } catch {
    return NextResponse.json({ error: "Failed to generate examination paper." }, { status: 500 });
  }
}
