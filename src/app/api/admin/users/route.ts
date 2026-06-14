import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const plan = searchParams.get("plan") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { school: { contains: search } },
    ];
  }
  if (plan === "FREE" || plan === "PREMIUM") {
    where.plan = plan;
  }
  if (status === "active") {
    where.isActive = true;
  } else if (status === "suspended") {
    where.isActive = false;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        role: true,
        isActive: true,
        school: true,
        province: true,
        createdAt: true,
        _count: { select: { lessonPlans: true, transactions: true } },
        subscriptions: {
          where: { status: "ACTIVE" },
          select: { endDate: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      lessonPlanCount: u._count.lessonPlans,
      transactionCount: u._count.transactions,
      subscriptionEndDate: u.subscriptions[0]?.endDate ?? null,
      _count: undefined,
      subscriptions: undefined,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
