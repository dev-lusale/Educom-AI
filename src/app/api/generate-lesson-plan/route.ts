import { NextRequest, NextResponse } from "next/server";
import { buildLessonPlan } from "@/lib/lesson-plan-builder";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * AI Lesson Plan Generation Route
 *
 * Strategy:
 * 1. Try the FastAPI AI backend (Ollama + RAG) if AI_BACKEND_URL is configured
 *    — includes teacher's own uploaded resources in the RAG context
 * 2. Fall back to the local template builder if the AI backend is unavailable
 *
 * This ensures the frontend always gets a valid response, even when the
 * Python backend is not running.
 */

const AI_BACKEND_URL = process.env.AI_BACKEND_URL ?? "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      school,
      department,
      teacherName,
      grade,
      subject,
      lessonTitle,
      topic,
      duration,
      enrollment,
      date,
    } = body;

    if (!grade || !subject || !lessonTitle || !topic) {
      return NextResponse.json(
        { error: "Grade, subject, lesson title, and topic are required." },
        { status: 400 }
      );
    }

    // Check if the teacher has uploaded resources relevant to this subject/grade
    const session = await auth();
    let hasUserResources = false;
    if (session) {
      const resourceCount = await prisma.resource.count({
        where: {
          userId: session.user.id,
          ...(subject ? { subject } : {}),
        },
      });
      hasUserResources = resourceCount > 0;
    }

    // ── Attempt AI Backend (FastAPI + Ollama) ──────────────────────────────
    if (AI_BACKEND_URL) {
      try {
        const aiResponse = await fetch(
          `${AI_BACKEND_URL}/api/ai/generate-lesson-plan`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              grade,
              subject,
              lesson_title: lessonTitle,
              topic,
              duration: duration ?? "40",
              school: school ?? "",
              department: department ?? "",
              teacher_name: teacherName ?? "",   // FastAPI expects snake_case
              enrollment: enrollment ?? "",
              date: date ?? new Date().toISOString().split("T")[0],
              // Pass user ID so the backend can include teacher's uploaded resources
              user_id: session?.user?.id ?? null,
              use_user_resources: hasUserResources,
            }),
            // Timeout after 300 seconds (tinyllama on CPU can take 2-3 min)
            signal: AbortSignal.timeout(300_000),
          }
        );

        if (aiResponse.ok) {
          const plan = await aiResponse.json();
          return NextResponse.json(plan);
        }

        // Log non-OK responses but continue to fallback
        console.warn(
          `[AI Backend] Non-OK response: ${aiResponse.status} ${aiResponse.statusText}`
        );
      } catch (aiError) {
        // Network error or timeout — fall through to template builder
        console.warn(
          "[AI Backend] Unavailable, using template fallback:",
          aiError instanceof Error ? aiError.message : aiError
        );
      }
    }

    // ── Fallback: Local Template Builder ──────────────────────────────────
    const plan = buildLessonPlan({
      school: school ?? "",
      department: department ?? "",
      teacherName: teacherName ?? "",
      grade,
      subject,
      lessonTitle: lessonTitle ?? "",
      topic,
      duration: duration ?? "40",
      enrollment: enrollment ?? "",
      date: date ?? new Date().toISOString().split("T")[0],
    });

    return NextResponse.json(plan);
  } catch {
    return NextResponse.json(
      { error: "Failed to generate lesson plan." },
      { status: 500 }
    );
  }
}
