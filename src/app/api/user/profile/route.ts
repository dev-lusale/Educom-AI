import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, school, province } = body as {
    name?: string;
    school?: string;
    province?: string;
  };

  // Validate — at minimum a name is required
  if (name !== undefined && name.trim().length === 0) {
    return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(school !== undefined ? { school: school.trim() || null } : {}),
      ...(province !== undefined ? { province: province.trim() || null } : {}),
    },
    select: { name: true, school: true, province: true },
  });

  return NextResponse.json(updated);
}
