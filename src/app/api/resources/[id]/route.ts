/**
 * DELETE /api/resources/[id]
 *
 * Deletes a resource owned by the authenticated user.
 * Also purges the document's chunks from ChromaDB via the AI backend
 * so deleted files no longer influence AI responses.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const AI_BACKEND_URL = process.env.AI_BACKEND_URL ?? "";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Fetch the resource to get the stored filename (needed to purge ChromaDB)
  const resource = await prisma.resource.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, storedName: true, originalName: true, collection: true },
  });

  if (!resource) {
    return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  }

  // ── Purge ChromaDB chunks via AI backend ────────────────────────────────────
  if (AI_BACKEND_URL) {
    try {
      const purgeRes = await fetch(`${AI_BACKEND_URL}/api/curriculum/delete-resource`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stored_filename: resource.storedName,
          original_filename: resource.originalName,
          user_id: session.user.id,
          collection: resource.collection ?? "user_resources",
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (purgeRes.ok) {
        const data = await purgeRes.json();
        console.log(
          `[Resources] Purged ChromaDB chunks for "${resource.originalName}":`,
          data.chunks_deleted ?? "unknown"
        );
      } else {
        const errText = await purgeRes.text().catch(() => "");
        console.warn("[Resources] ChromaDB purge failed:", purgeRes.status, errText.slice(0, 200));
        // Non-fatal — still delete the Prisma record
      }
    } catch (err) {
      console.warn("[Resources] AI backend unavailable for purge:", err instanceof Error ? err.message : err);
      // Non-fatal — still delete the Prisma record
    }
  }

  // ── Delete Prisma record ────────────────────────────────────────────────────
  await prisma.resource.delete({ where: { id } });

  return NextResponse.json({
    success: true,
    message: `"${resource.originalName}" deleted from your library and AI knowledge base.`,
  });
}
