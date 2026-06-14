import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { QuizData, ExamData, MarkingSchemeData } from "@/types/assessment";

const AI_BACKEND_URL = process.env.AI_BACKEND_URL ?? "";

// ── Endpoint mappings ────────────────────────────────────────────
const ENDPOINT_MAP: Record<string, string> = {
  quiz: "/api/ai/generate-quiz",
  exam: "/api/ai/generate-exam",
  marking_scheme: "/api/ai/generate-marking-scheme",
};

// ── Fallback builders ────────────────────────────────────────────
function buildFallbackQuiz(body: Record<string, unknown>): QuizData {
  const { grade, subject, topic, difficulty = "mixed" } = body as Record<string, string>;
  return {
    grade,
    subject,
    topic,
    duration: "40 minutes",
    total_marks: 20,
    instructions: `Answer ALL questions. Each question carries marks as indicated. Write clearly.`,
    difficulty: (difficulty as QuizData["difficulty"]) ?? "mixed",
    sections: [
      {
        name: "Section A — Multiple Choice",
        description: "Circle the letter of the best answer.",
        section_marks: 10,
        questions: Array.from({ length: 5 }, (_, i) => ({
          number: i + 1,
          type: "mcq" as const,
          question: `Question ${i + 1}: [AI model unavailable — regenerate when online]`,
          marks: 2,
          options: [
            { letter: "A" as const, text: "Option A" },
            { letter: "B" as const, text: "Option B" },
            { letter: "C" as const, text: "Option C" },
            { letter: "D" as const, text: "Option D" },
          ],
          answer: "A",
          section: "A" as const,
        })),
      },
      {
        name: "Section B — Short Answer",
        description: "Answer all questions in full sentences.",
        section_marks: 10,
        questions: Array.from({ length: 5 }, (_, i) => ({
          number: i + 6,
          type: "short_answer" as const,
          question: `Question ${i + 6}: [AI model unavailable — regenerate when online]`,
          marks: 2,
          answer_guide: "See teacher's guide.",
          section: "B" as const,
        })),
      },
    ],
    answer_key: Array.from({ length: 5 }, (_, i) => ({
      question_number: i + 1,
      answer: "A",
      marks: 2,
    })),
    learning_objectives: [`Understand key concepts of ${topic}`, `Apply knowledge to real-world contexts`],
  };
}

function buildFallbackExam(body: Record<string, unknown>): ExamData {
  const { grade, subject, topic, exam_type = "End of Term", term = "Term 1" } = body as Record<string, string>;
  const year = new Date().getFullYear().toString();
  return {
    grade,
    subject,
    topic,
    exam_type,
    duration: "2 hours",
    total_marks: 100,
    year,
    term,
    instructions_to_candidates: [
      "Answer ALL questions in Section A.",
      "Answer THREE questions from Section B.",
      "Answer TWO questions from Section C.",
      "Write your name and centre number on the answer booklet.",
      "Silent, non-programmable calculators may be used where applicable.",
    ],
    sections: [
      {
        label: "SECTION A",
        title: "Multiple Choice Questions",
        instructions: "Circle the letter of the correct answer. Each question carries 1 mark.",
        marks: 20,
        questions: Array.from({ length: 5 }, (_, i) => ({
          number: i + 1,
          type: "mcq" as const,
          question: `[AI model unavailable — regenerate when online]`,
          marks: 1,
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
  const { grade, subject, topic, exam_type = "Class Test" } = body as Record<string, string>;
  return {
    grade,
    subject,
    topic,
    exam_type,
    total_marks: 100,
    sections: [],
    general_examiner_notes: [
      "AI model unavailable — regenerate marking scheme when online.",
      `Award marks generously for ${topic}-related responses that demonstrate understanding.`,
      "Accept all reasonable and relevant responses.",
    ],
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Premium gate for assessments
    if (session.user.plan !== "PREMIUM") {
      return NextResponse.json(
        { error: "Assessment generation requires a Premium subscription. Upgrade to unlock unlimited assessments.", premium_required: true },
        { status: 403 }
      );
    }

    const body = await req.json();
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

    const endpoint = ENDPOINT_MAP[assessment_type];
    if (!endpoint) {
      return NextResponse.json({ error: `Unknown assessment_type: ${assessment_type}` }, { status: 400 });
    }

    // ── Attempt AI Backend ──────────────────────────────────────
    if (AI_BACKEND_URL) {
      try {
        const aiResponse = await fetch(`${AI_BACKEND_URL}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, user_id: session.user.id }),
          signal: AbortSignal.timeout(300_000),
        });

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          return NextResponse.json(data);
        }

        console.warn(`[AI Backend] Assessment generation: ${aiResponse.status} ${aiResponse.statusText}`);
      } catch (err) {
        console.warn("[AI Backend] Unavailable for assessments, using fallback:", err instanceof Error ? err.message : err);
      }
    }

    // ── Fallback ────────────────────────────────────────────────
    let fallback: QuizData | ExamData | MarkingSchemeData;
    if (assessment_type === "quiz") fallback = buildFallbackQuiz(body);
    else if (assessment_type === "exam") fallback = buildFallbackExam(body);
    else fallback = buildFallbackMarkingScheme(body);

    return NextResponse.json(fallback);
  } catch {
    return NextResponse.json({ error: "Failed to generate assessment." }, { status: 500 });
  }
}
