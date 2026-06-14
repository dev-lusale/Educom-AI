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

  const plan = await prisma.lessonPlan.findUnique({ where: { id } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (plan.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(plan);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify the plan exists and belongs to the current user
  const plan = await prisma.lessonPlan.findUnique({
    where: { id },
    include: { sharedPlan: { select: { id: true } } },
  });

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (plan.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Delete in a transaction: shared plan first (FK constraint), then lesson plan
  await prisma.$transaction(async (tx) => {
    if (plan.sharedPlan) {
      await tx.sharedPlan.delete({ where: { id: plan.sharedPlan.id } });
    }
    await tx.lessonPlan.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
