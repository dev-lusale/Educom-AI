import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin, setAdminSession, ADMIN_COOKIE_NAME } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// In-memory rate limiter: tracks failed attempts per IP
// In production, use Redis or a proper rate-limiting library
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const now = Date.now();

  // Check rate limit
  const attempts = failedAttempts.get(ip);
  if (attempts && attempts.lockedUntil > now) {
    const minutesLeft = Math.ceil((attempts.lockedUntil - now) / 60000);
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""}.` },
      { status: 429 }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials format." }, { status: 422 });
  }

  const { email, password } = parsed.data;

  // Consistent timing to prevent enumeration
  await new Promise((r) => setTimeout(r, 500));

  const session = await authenticateAdmin(email, password);

  if (!session) {
    // Track failed attempt
    const current = failedAttempts.get(ip) ?? { count: 0, lockedUntil: 0 };
    const newCount = current.count + 1;

    if (newCount >= MAX_ATTEMPTS) {
      failedAttempts.set(ip, { count: newCount, lockedUntil: now + LOCKOUT_MS });
    } else {
      failedAttempts.set(ip, { count: newCount, lockedUntil: 0 });
    }

    // Log failed attempt to admin logs if admin exists
    try {
      const adminRecord = await prisma.admin.findUnique({ where: { email } });
      if (adminRecord) {
        await prisma.adminLog.create({
          data: {
            adminId: adminRecord.id,
            action: `Failed login attempt from IP: ${ip}`,
            target: email,
            details: JSON.stringify({ ip, timestamp: new Date().toISOString() }),
            ipAddress: ip,
          },
        });
      }
    } catch {
      // Non-critical — don't fail the request
    }

    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // Successful login — clear failed attempts
  failedAttempts.delete(ip);

  // Log successful login
  try {
    await prisma.adminLog.create({
      data: {
        adminId: session.id,
        action: `Admin login from IP: ${ip}`,
        target: session.email,
        details: JSON.stringify({ ip, timestamp: new Date().toISOString() }),
        ipAddress: ip,
      },
    });
  } catch {
    // Non-critical
  }

  const token = await setAdminSession(session);

  const response = NextResponse.json({
    success: true,
    admin: { id: session.id, name: session.name, email: session.email },
  });

  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });

  return response;
}
