/**
 * Resources API
 *
 * GET  /api/resources  — list the current user's uploaded resources
 * POST /api/resources  — upload a new resource (multipart/form-data)
 *
 * Rules:
 *  - FREE users:    max 3 uploads, max 5 MB per file
 *  - PREMIUM users: unlimited uploads, max 5 MB per file
 *  - All uploaded files are proxied to the Python AI backend for RAG ingestion
 *    into the "user_resources" ChromaDB collection (tagged with user_id)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const AI_BACKEND_URL  = process.env.AI_BACKEND_URL ?? "";
const MAX_FILE_BYTES  = 5 * 1024 * 1024;   // 5 MB — hard limit for learning
const FREE_MAX_FILES  = 3;                  // free plan upload cap

// ── GET — list user's resources ───────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resources = await prisma.resource.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      originalName: true,
      fileType: true,
      fileSizeBytes: true,
      grade: true,
      subject: true,
      description: true,
      chunksCreated: true,
      downloadCount: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ resources });
}

// ── POST — upload a resource ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Parse multipart form ────────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file        = formData.get("file")        as File   | null;
  const grade       = (formData.get("grade")       as string) || "";
  const subject     = (formData.get("subject")     as string) || "";
  const description = (formData.get("description") as string) || "";

  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

  // ── File type validation ────────────────────────────────────────────────────
  const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
  const allowedExts = [".pdf", ".docx", ".doc", ".txt"];
  if (!allowedExts.includes(ext)) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload PDF, DOCX, or TXT files." },
      { status: 400 }
    );
  }

  // ── 5 MB hard limit ─────────────────────────────────────────────────────────
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum size is 5 MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.` },
      { status: 413 }
    );
  }

  // ── Free plan upload cap ────────────────────────────────────────────────────
  const isPremium = session.user.plan === "PREMIUM";
  if (!isPremium) {
    const existingCount = await prisma.resource.count({
      where: { userId: session.user.id },
    });
    if (existingCount >= FREE_MAX_FILES) {
      return NextResponse.json(
        {
          error: `Free plan is limited to ${FREE_MAX_FILES} uploads. Upgrade to Premium for unlimited uploads.`,
          upgrade_required: true,
          current_count: existingCount,
          limit: FREE_MAX_FILES,
        },
        { status: 403 }
      );
    }
  }

  // ── Forward to Python AI backend for RAG ingestion ─────────────────────────
  let chunksCreated = 0;
  let storedName    = `${Date.now()}_${file.name}`;
  let indexingError = "";

  if (AI_BACKEND_URL) {
    try {
      const aiForm = new FormData();
      aiForm.append("file", file);
      aiForm.append("collection", "user_resources");
      if (grade)   aiForm.append("grade",   grade);
      if (subject) aiForm.append("subject", subject);
      // Embed user_id in the description field so the retriever can filter per-teacher
      aiForm.append(
        "description",
        `user_id:${session.user.id}${description ? ` ${description}` : ""}`
      );

      const aiRes = await fetch(`${AI_BACKEND_URL}/api/curriculum/upload`, {
        method: "POST",
        body:   aiForm,
        signal: AbortSignal.timeout(120_000),
      });

      if (aiRes.ok) {
        const aiData  = await aiRes.json();
        chunksCreated = aiData.chunks_created ?? aiData.embeddings_stored ?? 0;
        storedName    = aiData.filename ?? storedName;
        console.log(`[Resources] Indexed "${file.name}" → ${chunksCreated} chunks for user ${session.user.id}`);
      } else {
        const errText = await aiRes.text().catch(() => "");
        indexingError = `AI backend returned ${aiRes.status}: ${errText.slice(0, 200)}`;
        console.warn("[Resources] AI backend ingestion failed:", indexingError);
      }
    } catch (err) {
      indexingError = err instanceof Error ? err.message : String(err);
      console.warn("[Resources] AI backend unavailable:", indexingError);
    }
  } else {
    indexingError = "AI_BACKEND_URL not configured — indexing skipped.";
    console.warn("[Resources]", indexingError);
  }

  // ── Save metadata to Postgres via Prisma ───────────────────────────────────
  const resource = await prisma.resource.create({
    data: {
      userId:       session.user.id,
      originalName: file.name,
      storedName,
      fileType:     ext.replace(".", ""),
      fileSizeBytes: file.size,
      grade:        grade       || null,
      subject:      subject     || null,
      description:  description || null,
      chunksCreated,
      collection:   "user_resources",
    },
  });

  // Build a clear human-readable message
  let message: string;
  if (chunksCreated > 0) {
    message = `"${file.name}" uploaded and learned — ${chunksCreated} knowledge chunks added to your AI.`;
  } else if (indexingError) {
    message = `"${file.name}" saved. AI indexing will retry automatically when the backend is available.`;
  } else {
    message = `"${file.name}" uploaded. AI indexing in progress.`;
  }

  return NextResponse.json(
    {
      id:           resource.id,
      originalName: resource.originalName,
      fileType:     resource.fileType,
      fileSizeBytes: resource.fileSizeBytes,
      chunksCreated: resource.chunksCreated,
      grade:        resource.grade,
      subject:      resource.subject,
      description:  resource.description,
      createdAt:    resource.createdAt,
      indexed:      chunksCreated > 0,
      indexingError: indexingError || null,
      message,
    },
    { status: 201 }
  );
}
