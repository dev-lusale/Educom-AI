/**
 * Subscription management utilities.
 * Handles expiry checks, renewal logic, and status computation.
 */

import { prisma } from "@/lib/prisma";

export const RENEWAL_WINDOW_DAYS = 7; // allow renewal this many days before expiry

export type SubscriptionStatus =
  | "ACTIVE"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "NONE";

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  plan: "FREE" | "PREMIUM";
  startDate: Date | null;
  endDate: Date | null;
  daysRemaining: number | null;
  canRenew: boolean;
  receiptNumber: string | null;
  paymentMethod: string | null;
  transactionRef: string | null;
}

/**
 * Get the current subscription status for a user.
 * Also auto-downgrades expired premium users.
 */
export async function getUserSubscriptionInfo(userId: string): Promise<SubscriptionInfo> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  const activeSub = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: {
      transactions: {
        where: { status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { receiptNumber: true, paymentMethod: true, transactionRef: true },
      },
    },
  });

  const now = new Date();

  // No active subscription
  if (!activeSub) {
    // If user is still marked PREMIUM but has no active sub, downgrade them
    if (user?.plan === "PREMIUM") {
      await prisma.user.update({
        where: { id: userId },
        data: { plan: "FREE" },
      });
    }
    return {
      status: "NONE",
      plan: "FREE",
      startDate: null,
      endDate: null,
      daysRemaining: null,
      canRenew: true,
      receiptNumber: null,
      paymentMethod: null,
      transactionRef: null,
    };
  }

  const endDate = activeSub.endDate;
  const lastTx = activeSub.transactions[0] ?? null;

  // Subscription has an end date — check if expired
  if (endDate) {
    const msRemaining = endDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
      // Expired — downgrade
      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: activeSub.id },
          data: { status: "EXPIRED" },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { plan: "FREE" },
        }),
      ]);

      return {
        status: "EXPIRED",
        plan: "FREE",
        startDate: activeSub.startDate,
        endDate,
        daysRemaining: 0,
        canRenew: true,
        receiptNumber: lastTx?.receiptNumber ?? null,
        paymentMethod: lastTx?.paymentMethod ?? null,
        transactionRef: lastTx?.transactionRef ?? null,
      };
    }

    const expiringSoon = daysRemaining <= RENEWAL_WINDOW_DAYS;

    return {
      status: expiringSoon ? "EXPIRING_SOON" : "ACTIVE",
      plan: "PREMIUM",
      startDate: activeSub.startDate,
      endDate,
      daysRemaining,
      canRenew: expiringSoon,
      receiptNumber: lastTx?.receiptNumber ?? null,
      paymentMethod: lastTx?.paymentMethod ?? null,
      transactionRef: lastTx?.transactionRef ?? null,
    };
  }

  // Active subscription with no end date (manual/admin upgrade)
  return {
    status: "ACTIVE",
    plan: "PREMIUM",
    startDate: activeSub.startDate,
    endDate: null,
    daysRemaining: null,
    canRenew: false,
    receiptNumber: lastTx?.receiptNumber ?? null,
    paymentMethod: lastTx?.paymentMethod ?? null,
    transactionRef: lastTx?.transactionRef ?? null,
  };
}

/**
 * Check if a user can initiate a new payment.
 * Blocks if they have an active sub with > RENEWAL_WINDOW_DAYS remaining.
 */
export async function canInitiatePayment(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const info = await getUserSubscriptionInfo(userId);

  if (info.status === "ACTIVE" && info.daysRemaining !== null && info.daysRemaining > RENEWAL_WINDOW_DAYS) {
    return {
      allowed: false,
      reason: `Your Premium subscription is active for ${info.daysRemaining} more days. Renewal opens ${RENEWAL_WINDOW_DAYS} days before expiry.`,
    };
  }

  return { allowed: true };
}
