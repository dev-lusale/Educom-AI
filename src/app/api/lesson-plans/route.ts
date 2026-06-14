import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const FREE_MONTHLY_LIMIT = 5;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { grade, subject, lessonTitle, topic, duration, enrollment, date, planData } = await req.json();

  // Enforce free plan limit
  if (session.user.plan !== "PREMIUM") {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const count = await prisma.lessonPlan.count({
      where: { userId: session.user.id, createdAt: { gte: startOfMonth } },
    });

    if (count >= FREE_MONTHLY_LIMIT) {
      return NextResponse.json(
        { error: "Monthly limit reached. Upgrade to Premium for unlimited plans." },
        { status: 403 }
      );
    }
  }

  const plan = await prisma.lessonPlan.create({
    data: {
      userId: session.user.id,
      grade,
      subject,
      // Store "Lesson Title — Topic" so the dashboard shows both at a glance
      topic: lessonTitle ? `${lessonTitle} — ${topic}` : topic,
      duration: duration ?? "40",
      enrollment: enrollment ?? null,
      date: date ?? new Date().toISOString().split("T")[0],
      planData: JSON.stringify(planData),
    },
  });

  return NextResponse.json(plan, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await prisma.lessonPlan.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(plans);
}
