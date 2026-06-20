/**
 * DELETE /api/user/account
 *
 * Permanently deletes the authenticated user's account and all associated
 * data via Prisma's onDelete: Cascade relations.
 *
 * Data deleted (cascade):
 *   - User record
 *   - LessonPlans, Assessments, Resources, ChatMessages
 *   - SharedPlans, PlanLikes, PlanSaves
 *   - Subscriptions, Transactions
 *   - OAuth Accounts, Sessions
 *
 * The request body must contain { confirmation: "DELETE MY ACCOUNT" }
 * as a server-side safety check — the client UI enforces the same.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const REQUIRED_PHRASE = "DELETE MY ACCOUNT";

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Require typed confirmation in the request body
  let confirmation = "";
  try {
    const body = await req.json();
    confirmation = body?.confirmation ?? "";
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  if (confirmation !== REQUIRED_PHRASE) {
    return NextResponse.json(
      { error: `Confirmation phrase must be exactly: "${REQUIRED_PHRASE}"` },
      { status: 400 }
    );
  }

  try {
    // Prisma onDelete: Cascade handles all related rows automatically.
    // The single user delete triggers cascade deletion of every related model.
    await prisma.user.delete({
      where: { id: session.user.id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[DeleteAccount] Failed:", err);
    return NextResponse.json(
      { error: "Failed to delete account. Please try again or contact support." },
      { status: 500 }
    );
  }
}
