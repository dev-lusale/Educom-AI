import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activateSubscription, failTransaction } from "@/lib/payment";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { transactionId } = await req.json();
  if (!transactionId) {
    return NextResponse.json({ error: "Transaction ID required." }, { status: 400 });
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { subscription: true },
  });

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }

  // Security: ensure transaction belongs to the requesting user
  if (transaction.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (transaction.status === "COMPLETED") {
    return NextResponse.json({
      status: "COMPLETED",
      receiptNumber: transaction.receiptNumber,
      message: "Payment already confirmed.",
    });
  }

  if (transaction.status === "FAILED" || transaction.status === "CANCELLED") {
    return NextResponse.json({
      status: transaction.status,
      message: transaction.failureReason ?? "Payment was not successful.",
    });
  }

  // Simulate verification with payment gateway
  // In production: call MTN/Airtel/Zamtel API to check status
  await new Promise((r) => setTimeout(r, 1000));

  // Sandbox: PROCESSING transactions auto-complete after verification call
  if (transaction.status === "PROCESSING") {
    await activateSubscription(transaction.id);

    const updated = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    return NextResponse.json({
      status: "COMPLETED",
      receiptNumber: updated?.receiptNumber,
      transactionRef: transaction.transactionRef,
      amount: transaction.amount,
      currency: transaction.currency,
      message: "Payment confirmed! Your Premium subscription is now active.",
    });
  }

  return NextResponse.json({
    status: transaction.status,
    message: "Payment is still being processed. Please try again shortly.",
  });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const transactionId = searchParams.get("transactionId");

  if (!transactionId) {
    return NextResponse.json({ error: "Transaction ID required." }, { status: 400 });
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { subscription: true },
  });

  if (!transaction || transaction.userId !== session.user.id) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: transaction.id,
    transactionRef: transaction.transactionRef,
    status: transaction.status,
    method: transaction.paymentMethod,
    amount: transaction.amount,
    currency: transaction.currency,
    receiptNumber: transaction.receiptNumber,
    failureReason: transaction.failureReason,
    createdAt: transaction.createdAt,
  });
}
