/**
 * POST /api/export-pdf
 *
 * Proxies PDF export requests to the FastAPI backend.
 * Keeps the AI_BACKEND_URL internal — the frontend never talks to the
 * Python server directly.
 *
 * Body: { type: "quiz" | "exam" | "marking_scheme" | "lesson_plan", data: object }
 * Returns: application/pdf stream
 *
 * Premium gate: quiz/exam/marking_scheme require a PREMIUM plan.
 * Lesson plan PDFs are available to all plans.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const AI_BACKEND_URL = process.env.AI_BACKEND_URL ?? "";

const ENDPOINT_MAP: Record<string, string> = {
  quiz:           "/api/pdf/export-quiz",
  exam:           "/api/pdf/export-exam",
  marking_scheme: "/api/pdf/export-marking-scheme",
  lesson_plan:    "/api/pdf/export-lesson-plan",
};

const PREMIUM_TYPES = new Set(["quiz", "exam", "marking_scheme"]);

export async function POST(req: NextRequest) {
  // Auth 
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body 
  let body: { type?: string; data?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { type, data } = body;

  if (!type || !data) {
    return NextResponse.json(
      { error: "Both 'type' and 'data' fields are required." },
      { status: 400 }
    );
  }

  // Premium gate
  if (PREMIUM_TYPES.has(type) && session.user.plan !== "PREMIUM") {
    return NextResponse.json(
      {
        error:
          "PDF export of assessments requires a Premium subscription. Upgrade to unlock.",
        premium_required: true,
      },
      { status: 403 }
    );
  }

  // Route validation 
  const endpoint = ENDPOINT_MAP[type];
  if (!endpoint) {
    return NextResponse.json(
      { error: `Unknown export type: ${type}. Valid: quiz, exam, marking_scheme, lesson_plan` },
      { status: 400 }
    );
  }

  // Backend check 
  if (!AI_BACKEND_URL) {
    return NextResponse.json(
      {
        error:
          "Server-side PDF export requires the AI backend to be running. " +
          "Use the browser print button (Save as PDF) as an alternative.",
      },
      { status: 503 }
    );
  }

  // Proxy to FastAPI PDF service 
  try {
    const backendRes = await fetch(`${AI_BACKEND_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(60_000), // 60s — PDF generation should be fast
    });

    if (!backendRes.ok) {
      const errText = await backendRes.text().catch(() => "");
      console.error(`[PDF Export] Backend error ${backendRes.status}: ${errText}`);
      return NextResponse.json(
        { error: `PDF generation failed: ${backendRes.statusText}` },
        { status: backendRes.status }
      );
    }

    // Stream the PDF back to the browser
    const pdfBuffer = await backendRes.arrayBuffer();
    const contentDisposition =
      backendRes.headers.get("Content-Disposition") ??
      `attachment; filename="${type}_export.pdf"`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition,
        "Content-Length": String(pdfBuffer.byteLength),
        // Prevent caching of sensitive exam documents
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[PDF Export] Request failed: ${msg}`);

    if (msg.includes("timeout") || msg.includes("abort")) {
      return NextResponse.json(
        { error: "PDF generation timed out. Please try again." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate PDF. Please try again or use browser print." },
      { status: 500 }
    );
  }
}
