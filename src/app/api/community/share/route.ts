import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.plan !== "PREMIUM") {
    return NextResponse.json(
      { error: "Sharing requires a Premium plan. Upgrade to share with the community." },
      { status: 403 }
    );
  }

  const { lessonPlanId, description } = await req.json();

  const plan = await prisma.lessonPlan.findFirst({
    where: { id: lessonPlanId, userId: session.user.id },
  });

  if (!plan) return NextResponse.json({ error: "Plan not found." }, { status: 404 });

  // Check not already shared
  const existing = await prisma.sharedPlan.findUnique({ where: { lessonPlanId } });
  if (existing) return NextResponse.json({ error: "Already shared." }, { status: 409 });

  const shared = await prisma.sharedPlan.create({
    data: {
      lessonPlanId,
      userId: session.user.id,
      title: plan.topic,
      description: description ?? null,
      grade: plan.grade,
      subject: plan.subject,
      topic: plan.topic,
    },
  });

  return NextResponse.json(shared, { status: 201 });
}
