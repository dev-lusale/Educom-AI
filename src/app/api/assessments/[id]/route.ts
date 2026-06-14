import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const assessment = await prisma.assessment.findUnique({ where: { id } });

  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (assessment.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(assessment);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const assessment = await prisma.assessment.findUnique({ where: { id } });

  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (assessment.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.assessment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
