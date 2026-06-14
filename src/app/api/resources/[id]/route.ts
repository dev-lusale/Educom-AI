/**
 * DELETE /api/resources/[id]  — delete a resource (owner only)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const resource = await prisma.resource.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!resource) {
    return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  }

  await prisma.resource.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
