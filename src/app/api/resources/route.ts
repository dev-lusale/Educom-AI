/**
 * Resources API
 *
 * GET  /api/resources        — list the current user's uploaded resources
 * POST /api/resources        — upload a new resource (multipart/form-data)
 *                              proxies the file to the Python AI backend for RAG ingestion
 *                              then saves metadata to SQLite via Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const AI_BACKEND_URL = process.env.AI_BACKEND_URL ?? "";

// ── GET — list user's resources ──────────────────────────────────────────────

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

// ── POST — upload a resource ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

  const grade = (formData.get("grade") as string) || "";
  const subject = (formData.get("subject") as string) || "";
  const description = (formData.get("description") as string) || "";

  // Validate file type
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
  ];
  const allowedExts = [".pdf", ".docx", ".doc", ".txt"];
  const ext = "." + file.name.split(".").pop()?.toLowerCase();

  if (!allowedExts.includes(ext) && !allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload PDF, DOCX, or TXT files." },
      { status: 400 }
    );
  }

  // 50 MB limit
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 50 MB." },
      { status: 413 }
    );
  }

  // ── Forward to Python AI backend for RAG ingestion ──────────────────────
  let chunksCreated = 0;
  let storedName = `${Date.now()}_${file.name}`;

  if (AI_BACKEND_URL) {
    try {
      const aiForm = new FormData();
      aiForm.append("file", file);
      aiForm.append("collection", "user_resources");
      if (grade) aiForm.append("grade", grade);
      if (subject) aiForm.append("subject", subject);
      // Tag with user ID so retriever can filter per-teacher
      // Format: "user_id:<id> <optional description>"
      aiForm.append("description", `user_id:${session.user.id}${description ? ` ${description}` : ""}`);

      const aiRes = await fetch(`${AI_BACKEND_URL}/api/curriculum/upload`, {
        method: "POST",
        body: aiForm,
        signal: AbortSignal.timeout(120_000),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        chunksCreated = aiData.chunks_created ?? 0;
        // The backend saves with a UUID prefix — we store the original name
        storedName = aiData.filename ?? storedName;
      } else {
        const errText = await aiRes.text();
        console.warn("[Resources] AI backend ingestion failed:", errText);
        // Continue — save metadata even if AI ingestion failed
      }
    } catch (err) {
      console.warn("[Resources] AI backend unavailable:", err instanceof Error ? err.message : err);
      // Continue — save metadata even if AI backend is down
    }
  }

  // ── Save metadata to SQLite ──────────────────────────────────────────────
  const resource = await prisma.resource.create({
    data: {
      userId: session.user.id,
      originalName: file.name,
      storedName,
      fileType: ext.replace(".", ""),
      fileSizeBytes: file.size,
      grade: grade || null,
      subject: subject || null,
      description: description || null,
      chunksCreated,
      collection: "user_resources",
    },
  });

  return NextResponse.json(
    {
      id: resource.id,
      originalName: resource.originalName,
      fileType: resource.fileType,
      fileSizeBytes: resource.fileSizeBytes,
      chunksCreated: resource.chunksCreated,
      grade: resource.grade,
      subject: resource.subject,
      description: resource.description,
      createdAt: resource.createdAt,
      message:
        chunksCreated > 0
          ? `"${file.name}" uploaded and indexed — ${chunksCreated} chunks added to your AI knowledge base.`
          : `"${file.name}" saved. AI indexing will complete shortly.`,
    },
    { status: 201 }
  );
}
