import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  createPendingTransaction,
  hasPendingPayment,
  initiateMobileMoneyPayment,
  initiateBankTransfer,
  PREMIUM_PRICE_ZMW,
} from "@/lib/payment";
import { canInitiatePayment } from "@/lib/subscription";
import { PaymentMethod } from "@prisma/client";

const schema = z.object({
  method: z.enum(["MTN_MOMO", "AIRTEL_MONEY", "ZAMTEL_MONEY", "BANK_TRANSFER"]),
  phoneNumber: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is allowed to initiate a new payment
  // (blocks active subscribers with > 7 days remaining, allows renewal near expiry)
  const { allowed, reason } = await canInitiatePayment(session.user.id);
  if (!allowed) {
    return NextResponse.json({ error: reason }, { status: 400 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request data.", details: parsed.error.flatten() }, { status: 422 });
  }

  const { method, phoneNumber, bankName, accountNumber } = parsed.data;

  // Validate phone for mobile money
  if (["MTN_MOMO", "AIRTEL_MONEY", "ZAMTEL_MONEY"].includes(method)) {
    if (!phoneNumber || !/^(\+?260|0)[79]\d{8}$/.test(phoneNumber.replace(/\s/g, ""))) {
      return NextResponse.json({ error: "Please provide a valid Zambian phone number." }, { status: 422 });
    }
  }

  // Prevent duplicate pending payments within 30 minutes
  const hasPending = await hasPendingPayment(session.user.id);
  if (hasPending) {
    return NextResponse.json(
      { error: "You have a pending payment. Please wait or check your transaction status." },
      { status: 409 }
    );
  }

  // Create transaction record
  const { transaction, subscription } = await createPendingTransaction(
    session.user.id,
    method as PaymentMethod,
    phoneNumber,
    bankName,
    accountNumber
  );

  // Initiate payment with gateway
  if (method === "BANK_TRANSFER") {
    const result = await initiateBankTransfer(
      transaction.transactionRef,
      bankName ?? "Any Bank",
      PREMIUM_PRICE_ZMW
    );

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "PROCESSING", metadata: JSON.stringify(result) },
    });

    return NextResponse.json({
      transactionId: transaction.id,
      transactionRef: transaction.transactionRef,
      method: "BANK_TRANSFER",
      instructions: result.instructions,
      referenceCode: result.referenceCode,
      amount: PREMIUM_PRICE_ZMW,
      currency: "ZMW",
    });
  }

  // Mobile money
  const result = await initiateMobileMoneyPayment(
    transaction.transactionRef,
    phoneNumber!,
    PREMIUM_PRICE_ZMW,
    method as PaymentMethod
  );

  if (!result.success) {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "FAILED", failureReason: result.message },
    });
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json({ error: result.message }, { status: 402 });
  }

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      status: "PROCESSING",
      externalRef: result.externalRef,
    },
  });

  return NextResponse.json({
    transactionId: transaction.id,
    transactionRef: transaction.transactionRef,
    externalRef: result.externalRef,
    method,
    message: result.message,
    amount: PREMIUM_PRICE_ZMW,
    currency: "ZMW",
  });
}
