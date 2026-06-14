import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sharedPlanId } = await req.json();

  const existing = await prisma.planLike.findUnique({
    where: { userId_sharedPlanId: { userId: session.user.id, sharedPlanId } },
  });

  if (existing) {
    await prisma.planLike.delete({ where: { id: existing.id } });
    return NextResponse.json({ liked: false });
  }

  await prisma.planLike.create({ data: { userId: session.user.id, sharedPlanId } });
  return NextResponse.json({ liked: true });
}
