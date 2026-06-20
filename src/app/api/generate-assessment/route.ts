/**
 * POST /api/generate-assessment
 *
 * Unified assessment generation gateway.
 * Delegates to the correct OpenRouter-powered specialist route based on assessment_type,
 * then falls back to the FastAPI AI backend, then to template builders.
 *
 * This route exists for backwards-compatibility. The page now calls the specialist
 * routes directly (/api/quiz-generator, /api/exam-generator, /api/marking-scheme),
 * but any older code paths that POST here will still work correctly.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  callOpenRouterJSON,
  buildMessages,
  OpenRouterAuthError,
} from "@/lib/openrouter";
import type { QuizData, ExamData, MarkingSchemeData } from "@/types/assessment";

const AI_BACKEND_URL = process.env.AI_BACKEND_URL ?? "";

// ── AI Backend endpoint map ───────────────────────────────────────────────────
const AI_BACKEND_ENDPOINTS: Record<string, string> = {
  quiz:           "/api/ai/generate-quiz",
  exam:           "/api/ai/generate-exam",
  marking_scheme: "/api/ai/generate-marking-scheme",
};

// ── System prompts ────────────────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<string, string> = {
  quiz: `You are EduCom AI, an expert assessment designer for the Zambian education system.
Generate high-quality quizzes aligned with the Zambia CBC and ECZ standards.
Output format: strict JSON only. No markdown, no explanation outside the JSON.`,

  exam: `You are EduCom AI, an expert ECZ examination paper designer for the Zambian education system.
Generate full ECZ-style examination papers (Section A MCQ, Section B Short, Section C Long).
Output format: strict JSON only. No markdown, no explanation outside the JSON.`,

  marking_scheme: `You are EduCom AI, an expert ECZ marking scheme writer for the Zambian education system.
Generate detailed marking schemes using official ECZ marking conventions.
Output format: strict JSON only. No markdown, no explanation outside the JSON.`,
};

// ── Task routing ──────────────────────────────────────────────────────────────

const TASK_MAP: Record<string, "quiz" | "exam" | "markingScheme"> = {
  quiz:           "quiz",
  exam:           "exam",
  marking_scheme: "markingScheme",
};

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildQuizPrompt(body: Record<string, unknown>): string {
  const { grade, subject, topic, difficulty = "mixed", learning_objectives = "" } = body as Record<string, string>;
  const numMcq     = Number(body.num_mcq          ?? 10);
  const numShort   = Number(body.num_short_answer  ?? 5);
  const numStruct  = Number(body.num_structured    ?? 2);
  const totalMarks = numMcq * 2 + numShort * 3 + numStruct * 5;

  return `Generate a ${difficulty} quiz for ${grade} ${subject} on "${topic}".
- ${numMcq} MCQs (2 marks each), ${numShort} short-answer (3 marks), ${numStruct} structured (5 marks)
- Total: ${totalMarks} marks. ECZ-aligned, Zambian context.${learning_objectives ? `\n- Learning objectives: ${learning_objectives}` : ""}

Return JSON with: grade, subject, topic, difficulty, duration, total_marks, instructions,
sections (each with name, description, section_marks, questions array),
answer_key array, learning_objectives array.
Each question has: number, type (mcq/short_answer/structured), question, marks,
options (MCQ only: [{letter, text}]), answer (MCQ only), answer_guide, section.`;
}

function buildExamPrompt(body: Record<string, unknown>): string {
  const { grade, subject, topic, learning_objectives = "" } = body as Record<string, string>;
  const examType       = String(body.exam_type        ?? "End of Term");
  const term           = String(body.term             ?? "Term 1");
  const totalMarks     = Number(body.total_marks       ?? 100);
  const durationMins   = Number(body.duration_minutes  ?? 120);
  const year           = new Date().getFullYear();
  const durationHours  = Math.floor(durationMins / 60);
  const durationRemain = durationMins % 60;
  const durationStr    = durationRemain === 0 ? `${durationHours} hours` : `${durationHours} hours ${durationRemain} minutes`;

  return `Generate a complete ${examType} for ${grade} ${subject}.
- Topic: ${topic}, Term: ${term} ${year}, Total marks: ${totalMarks}, Duration: ${durationStr}
- Sections: A (MCQ 20 marks), B (Short structured 40 marks), C (Long structured/essays 40 marks)${learning_objectives ? `\n- Learning objectives: ${learning_objectives}` : ""}

Return JSON with: grade, subject, topic, exam_type, term, year, duration, total_marks,
instructions_to_candidates (array), sections array.
Each section: label, title, instructions, marks, questions array.
Each question: number, type, question, marks, options (MCQ), answer, section, sub_questions (structured).`;
}

function buildMarkingSchemePrompt(body: Record<string, unknown>): string {
  const { grade, subject, topic, learning_objectives = "" } = body as Record<string, string>;
  const examType    = String(body.exam_type        ?? "End of Term");
  const term        = String(body.term             ?? "Term 1");
  const totalMarks  = Number(body.total_marks       ?? 100);
  const year        = new Date().getFullYear();

  return `Generate a complete ECZ marking scheme for a ${examType} in ${grade} ${subject}.
- Topic: ${topic}, Term: ${term} ${year}, Total marks: ${totalMarks}${learning_objectives ? `\n- Learning objectives: ${learning_objectives}` : ""}

Return JSON with: grade, subject, topic, exam_type, term, year, total_marks,
sections array, general_examiner_notes array.
Each section: label, title, questions array.
Each question (Section A MCQ): number, answer, marks, explanation.
Each question (Sections B & C): number, total_marks, sub_questions array OR mark_points array,
model_answer, accept_alternatives array, examiner_note.
Use ECZ language: "Award 1 mark for:", "Accept any reasonable answer", etc.`;
}

const PROMPT_BUILDERS: Record<string, (body: Record<string, unknown>) => string> = {
  quiz:           buildQuizPrompt,
  exam:           buildExamPrompt,
  marking_scheme: buildMarkingSchemePrompt,
};

// ── Fallback builders ─────────────────────────────────────────────────────────

function buildFallbackQuiz(body: Record<string, unknown>): QuizData {
  const { grade, subject, topic, difficulty = "mixed" } = body as Record<string, string>;
  const numMcq = Number(body.num_mcq ?? 5);
  const numShort = Number(body.num_short_answer ?? 5);
  return {
    grade, subject, topic,
    duration: "40 minutes",
    total_marks: numMcq * 2 + numShort * 3,
    instructions: "Answer ALL questions.",
    difficulty: (difficulty as QuizData["difficulty"]) ?? "mixed",
    sections: [
      {
        name: "Section A — Multiple Choice",
        description: "Circle the letter of the best answer.",
        section_marks: numMcq * 2,
        questions: Array.from({ length: numMcq }, (_, i) => ({
          number: i + 1, type: "mcq" as const, marks: 2,
          question: `[AI unavailable — regenerate when online]`,
          options: [
            { letter: "A" as const, text: "Option A" },
            { letter: "B" as const, text: "Option B" },
            { letter: "C" as const, text: "Option C" },
            { letter: "D" as const, text: "Option D" },
          ],
          answer: "A", section: "A" as const,
        })),
      },
    ],
    answer_key: Array.from({ length: numMcq }, (_, i) => ({ question_number: i + 1, answer: "A", marks: 2 })),
    learning_objectives: [`Understand ${topic}`],
  };
}

function buildFallbackExam(body: Record<string, unknown>): ExamData {
  const { grade, subject, topic, exam_type = "End of Term", term = "Term 1" } = body as Record<string, string>;
  return {
    grade, subject, topic, exam_type, term,
    duration: "2 hours", total_marks: 100, year: String(new Date().getFullYear()),
    instructions_to_candidates: [
      "Answer ALL questions in Section A.",
      "Answer THREE questions from Section B.",
      "Write your name and centre number on the answer booklet.",
    ],
    sections: [
      {
        label: "SECTION A", title: "Multiple Choice Questions",
        instructions: "Circle the letter of the correct answer.",
        marks: 20,
        questions: Array.from({ length: 5 }, (_, i) => ({
          number: i + 1, type: "mcq" as const, marks: 1,
          question: `[AI unavailable — regenerate when online]`,
          options: [
            { letter: "A" as const, text: "Option A" },
            { letter: "B" as const, text: "Option B" },
            { letter: "C" as const, text: "Option C" },
            { letter: "D" as const, text: "Option D" },
          ],
          section: "A" as const,
        })),
      },
    ],
  };
}

function buildFallbackMarkingScheme(body: Record<string, unknown>): MarkingSchemeData {
  const { grade, subject, topic, exam_type = "End of Term", term = "Term 1" } = body as Record<string, string>;
  return {
    grade, subject, topic, exam_type, term,
    year: String(new Date().getFullYear()),
    total_marks: Number(body.total_marks ?? 100),
    sections: [],
    general_examiner_notes: [
      "AI model unavailable — regenerate when online.",
      "Mark positively — award marks for what candidates know.",
      "Accept all reasonable and relevant responses.",
    ],
  };
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.user.plan !== "PREMIUM") {
      return NextResponse.json(
        { error: "Assessment generation requires a Premium subscription.", premium_required: true },
        { status: 403 }
      );
    }

    const body = await req.json() as Record<string, unknown>;
    const { assessment_type, grade, subject, topic } = body as {
      assessment_type: string;
      grade: string;
      subject: string;
      topic: string;
    };

    if (!assessment_type || !grade || !subject || !topic) {
      return NextResponse.json(
        { error: "assessment_type, grade, subject, and topic are required." },
        { status: 400 }
      );
    }

    const systemPrompt  = SYSTEM_PROMPTS[assessment_type];
    const promptBuilder = PROMPT_BUILDERS[assessment_type];
    const task          = TASK_MAP[assessment_type];

    if (!systemPrompt || !promptBuilder || !task) {
      return NextResponse.json({ error: `Unknown assessment_type: ${assessment_type}` }, { status: 400 });
    }

    // ── 1. OpenRouter (primary) ─────────────────────────────────────────────
    try {
      const prompt   = promptBuilder(body);
      const messages = buildMessages(systemPrompt, prompt);
      const data     = await callOpenRouterJSON({ task, messages, maxTokens: 6144, temperature: 0.4 });
      return NextResponse.json(data);
    } catch (err) {
      if (err instanceof OpenRouterAuthError) {
        console.error("[GenerateAssessment] OpenRouter auth error:", err.message);
      } else {
        console.warn("[GenerateAssessment] OpenRouter failed:", err instanceof Error ? err.message : String(err));
      }
    }

    // ── 2. FastAPI AI backend ────────────────────────────────────────────────
    const aiEndpoint = AI_BACKEND_ENDPOINTS[assessment_type];
    if (AI_BACKEND_URL && aiEndpoint) {
      try {
        const aiRes = await fetch(`${AI_BACKEND_URL}${aiEndpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, user_id: session.user.id }),
          signal: AbortSignal.timeout(180_000),
        });
        if (aiRes.ok) return NextResponse.json(await aiRes.json());
        console.warn(`[GenerateAssessment] AI backend: ${aiRes.status}`);
      } catch (err) {
        console.warn("[GenerateAssessment] AI backend unavailable:", err instanceof Error ? err.message : err);
      }
    }

    // ── 3. Template fallback ─────────────────────────────────────────────────
    if (assessment_type === "quiz")           return NextResponse.json(buildFallbackQuiz(body));
    if (assessment_type === "exam")           return NextResponse.json(buildFallbackExam(body));
    return NextResponse.json(buildFallbackMarkingScheme(body));

  } catch {
    return NextResponse.json({ error: "Failed to generate assessment." }, { status: 500 });
  }
}
