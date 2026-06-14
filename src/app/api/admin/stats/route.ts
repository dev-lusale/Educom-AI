import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalUsers,
    activeUsers,
    premiumUsers,
    totalTransactions,
    completedTransactions,
    pendingTransactions,
    failedTransactions,
    monthlyRevenue,
    lastMonthRevenue,
    totalRevenue,
    recentTransactions,
    userGrowth,
    revenueByMethod,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { plan: "PREMIUM" } }),
    prisma.transaction.count(),
    prisma.transaction.count({ where: { status: "COMPLETED" } }),
    prisma.transaction.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),
    prisma.transaction.count({ where: { status: "FAILED" } }),
    prisma.transaction.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
    // User registrations per day for last 7 days
    prisma.$queryRaw<{ date: string; count: number }[]>`
      SELECT date(createdAt) as date, count(*) as count
      FROM User
      WHERE createdAt >= datetime('now', '-7 days')
      GROUP BY date(createdAt)
      ORDER BY date ASC
    `,
    // Revenue by payment method
    prisma.transaction.groupBy({
      by: ["paymentMethod"],
      where: { status: "COMPLETED" },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const monthlyRevenueVal = monthlyRevenue._sum.amount ?? 0;
  const lastMonthRevenueVal = lastMonthRevenue._sum.amount ?? 0;
  const revenueGrowth =
    lastMonthRevenueVal > 0
      ? ((monthlyRevenueVal - lastMonthRevenueVal) / lastMonthRevenueVal) * 100
      : 0;

  return NextResponse.json({
    users: {
      total: totalUsers,
      active: activeUsers,
      premium: premiumUsers,
      free: totalUsers - premiumUsers,
    },
    transactions: {
      total: totalTransactions,
      completed: completedTransactions,
      pending: pendingTransactions,
      failed: failedTransactions,
    },
    revenue: {
      total: totalRevenue._sum.amount ?? 0,
      thisMonth: monthlyRevenueVal,
      lastMonth: lastMonthRevenueVal,
      growth: Math.round(revenueGrowth * 10) / 10,
    },
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id,
      ref: t.transactionRef,
      user: t.user.name ?? t.user.email,
      method: t.paymentMethod,
      amount: t.amount,
      status: t.status,
      createdAt: t.createdAt,
    })),
    userGrowth,
    revenueByMethod: revenueByMethod.map((r) => ({
      method: r.paymentMethod,
      total: r._sum.amount ?? 0,
      count: r._count,
    })),
  });
}
