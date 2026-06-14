import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      transactionRef: true,
      paymentMethod: true,
      amount: true,
      currency: true,
      status: true,
      receiptNumber: true,
      createdAt: true,
      subscription: {
        select: { status: true, startDate: true, endDate: true },
      },
    },
  });

  return NextResponse.json(transactions);
}
