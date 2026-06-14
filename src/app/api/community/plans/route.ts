import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const subject = searchParams.get("subject") ?? undefined;
  const grade = searchParams.get("grade") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 12;

  const where = {
    isPublic: true,
    ...(subject ? { subject } : {}),
    ...(grade ? { grade } : {}),
  };

  const [plans, total] = await Promise.all([
    prisma.sharedPlan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { name: true, image: true, school: true } },
        _count: { select: { likes: true, saves: true } },
        ...(session ? {
          likes: { where: { userId: session.user.id }, select: { id: true } },
          saves: { where: { userId: session.user.id }, select: { id: true } },
        } : {}),
      },
    }),
    prisma.sharedPlan.count({ where }),
  ]);

  return NextResponse.json({ plans, total, page, pages: Math.ceil(total / limit) });
}
