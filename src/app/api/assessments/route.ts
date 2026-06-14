import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.plan !== "PREMIUM") {
    return NextResponse.json(
      { error: "Assessment saving requires a Premium subscription.", premium_required: true },
      { status: 403 }
    );
  }

  const { grade, subject, topic, assessmentType, assessmentData } = await req.json();

  const saved = await prisma.assessment.create({
    data: {
      userId: session.user.id,
      grade,
      subject,
      topic,
      assessmentType,
      assessmentData: JSON.stringify(assessmentData),
    },
  });

  return NextResponse.json(saved, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assessments = await prisma.assessment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      grade: true,
      subject: true,
      topic: true,
      assessmentType: true,
      createdAt: true,
    },
  });

  return NextResponse.json(assessments);
}
