import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserSubscriptionInfo } from "@/lib/subscription";

/**
 * GET /api/subscription/status
 * Returns the current subscription status for the logged-in user.
 * Also triggers auto-downgrade if subscription has expired.
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const info = await getUserSubscriptionInfo(session.user.id);

  return NextResponse.json(info);
}
