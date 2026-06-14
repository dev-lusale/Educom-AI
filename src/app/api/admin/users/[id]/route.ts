import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  action: z.enum(["suspend", "activate", "upgrade", "downgrade"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action." }, { status: 422 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const { action } = parsed.data;
  let updateData: Record<string, unknown> = {};
  let logAction = "";

  switch (action) {
    case "suspend":
      updateData = { isActive: false };
      logAction = `Suspended user: ${user.email}`;
      break;
    case "activate":
      updateData = { isActive: true };
      logAction = `Activated user: ${user.email}`;
      break;
    case "upgrade":
      updateData = { plan: "PREMIUM" };
      logAction = `Manually upgraded user to Premium: ${user.email}`;
      break;
    case "downgrade":
      updateData = { plan: "FREE" };
      logAction = `Downgraded user to Free: ${user.email}`;
      break;
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: updateData }),
    prisma.adminLog.create({
      data: {
        adminId: session.id,
        action: logAction,
        target: id,
        details: JSON.stringify({ action, userId: id }),
      },
    }),
  ]);

  return NextResponse.json({ success: true, action });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      _count: { select: { lessonPlans: true, sharedPlans: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json(user);
}
