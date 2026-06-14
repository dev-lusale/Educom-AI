import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminAccount } from "@/lib/admin-auth";

// One-time setup endpoint — disable after first use by setting ADMIN_SETUP_DONE=true
export async function POST(req: NextRequest) {
  if (process.env.ADMIN_SETUP_DONE === "true") {
    return NextResponse.json({ error: "Setup already completed." }, { status: 403 });
  }

  const setupKey = req.headers.get("x-setup-key");
  if (setupKey !== process.env.ADMIN_SETUP_KEY) {
    return NextResponse.json({ error: "Invalid setup key." }, { status: 401 });
  }

  const existing = await prisma.admin.findFirst();
  if (existing) {
    return NextResponse.json({ error: "Admin account already exists." }, { status: 409 });
  }

  const { name, email, password } = await req.json();

  if (!name || !email || !password || password.length < 12) {
    return NextResponse.json(
      { error: "Name, email, and password (min 12 chars) are required." },
      { status: 422 }
    );
  }

  await createAdminAccount(name, email, password);

  return NextResponse.json({ success: true, message: "Admin account created successfully." });
}
