import { prisma } from "@/lib/prisma";
import { PaymentMethod, TransactionStatus, SubscriptionStatus } from "@prisma/client";
import { randomBytes } from "crypto";

export const PREMIUM_PRICE_ZMW = 150;
export const PREMIUM_DURATION_DAYS = 30;

// ── Transaction reference generator ─────────────────────────────

export function generateTransactionRef(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(4).toString("hex").toUpperCase();
  return `EDU-${timestamp}-${random}`;
}

export function generateReceiptNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(3).toString("hex").toUpperCase();
  return `RCP-${timestamp}-${random}`;
}

// ── Payment method display helpers ──────────────────────────────

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  MTN_MOMO: "MTN Mobile Money",
  AIRTEL_MONEY: "Airtel Money",
  ZAMTEL_MONEY: "Zamtel Money",
  BANK_TRANSFER: "Bank Transfer",
};

export const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
  MTN_MOMO: "#FFCC00",
  AIRTEL_MONEY: "#FF0000",
  ZAMTEL_MONEY: "#00A651",
  BANK_TRANSFER: "#1E40AF",
};

// ── Create pending transaction ───────────────────────────────────

export async function createPendingTransaction(
  userId: string,
  method: PaymentMethod,
  phoneNumber?: string,
  bankName?: string,
  accountNumber?: string
) {
  const transactionRef = generateTransactionRef();

  // Create or find pending subscription
  const subscription = await prisma.subscription.create({
    data: {
      userId,
      plan: "PREMIUM",
      status: "PENDING",
      amount: PREMIUM_PRICE_ZMW,
      currency: "ZMW",
    },
  });

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      subscriptionId: subscription.id,
      transactionRef,
      paymentMethod: method,
      amount: PREMIUM_PRICE_ZMW,
      currency: "ZMW",
      status: "PENDING",
      phoneNumber: phoneNumber ?? null,
      bankName: bankName ?? null,
      accountNumber: accountNumber ?? null,
    },
  });

  return { transaction, subscription };
}

// ── Activate subscription after successful payment ───────────────

export async function activateSubscription(transactionId: string): Promise<void> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { subscription: true },
  });

  if (!transaction || !transaction.subscription) return;

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + PREMIUM_DURATION_DAYS);

  const receiptNumber = generateReceiptNumber();

  await prisma.$transaction([
    // Update transaction
    prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "COMPLETED",
        receiptNumber,
        updatedAt: now,
      },
    }),
    // Update subscription
    prisma.subscription.update({
      where: { id: transaction.subscriptionId! },
      data: {
        status: "ACTIVE",
        startDate: now,
        endDate,
        updatedAt: now,
      },
    }),
    // Upgrade user plan
    prisma.user.update({
      where: { id: transaction.userId },
      data: { plan: "PREMIUM", updatedAt: now },
    }),
  ]);
}

// ── Mark transaction as failed ───────────────────────────────────

export async function failTransaction(
  transactionId: string,
  reason: string
): Promise<void> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });
  if (!transaction) return;

  await prisma.$transaction([
    prisma.transaction.update({
      where: { id: transactionId },
      data: { status: "FAILED", failureReason: reason },
    }),
    prisma.subscription.update({
      where: { id: transaction.subscriptionId! },
      data: { status: "CANCELLED" },
    }),
  ]);
}

// ── Simulate mobile money payment (sandbox) ──────────────────────
// In production, replace with real MTN MoMo / Airtel / Zamtel API calls

export async function initiateMobileMoneyPayment(
  transactionRef: string,
  phoneNumber: string,
  amount: number,
  method: PaymentMethod
): Promise<{ success: boolean; externalRef?: string; message: string }> {
  // Simulate API call delay
  await new Promise((r) => setTimeout(r, 1500));

  // Sandbox: numbers ending in 0 fail, rest succeed
  const lastDigit = phoneNumber.slice(-1);
  if (lastDigit === "0") {
    return { success: false, message: "Payment declined by mobile money provider." };
  }

  const externalRef = `EXT-${method.slice(0, 3)}-${Date.now()}`;
  return {
    success: true,
    externalRef,
    message: `Payment request sent to ${phoneNumber}. Please approve on your phone.`,
  };
}

export async function initiateBankTransfer(
  transactionRef: string,
  bankName: string,
  amount: number
): Promise<{ success: boolean; instructions: string; referenceCode: string }> {
  const referenceCode = `BANK-${transactionRef}`;
  return {
    success: true,
    referenceCode,
    instructions: `Transfer K${amount} to Educom Ltd. Account: 1234567890, ${bankName}. Use reference: ${referenceCode}`,
  };
}

// ── Check for duplicate pending payments ─────────────────────────

export async function hasPendingPayment(userId: string): Promise<boolean> {
  const pending = await prisma.transaction.findFirst({
    where: {
      userId,
      status: { in: ["PENDING", "PROCESSING"] },
      createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // within 30 min
    },
  });
  return !!pending;
}
