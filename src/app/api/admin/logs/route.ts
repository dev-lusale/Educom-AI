import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 30;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.adminLog.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        admin: { select: { name: true, email: true } },
      },
    }),
    prisma.adminLog.count(),
  ]);

  return NextResponse.json({ logs, total, page, pages: Math.ceil(total / limit) });
}
