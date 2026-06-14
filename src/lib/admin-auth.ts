import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const ADMIN_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET ?? "admin-secret-change-in-production-32chars"
);

const COOKIE_NAME = "admin_session";
const TOKEN_EXPIRY = "8h";

export interface AdminSession {
  id: string;
  email: string;
  name: string;
}

// ── Token helpers ────────────────────────────────────────────────

export async function signAdminToken(payload: AdminSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(ADMIN_SECRET);
}

export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, ADMIN_SECRET);
    return payload as unknown as AdminSession;
  } catch {
    return null;
  }
}

// ── Session helpers ──────────────────────────────────────────────

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function setAdminSession(session: AdminSession): Promise<string> {
  const token = await signAdminToken(session);
  return token;
}

// ── Auth helpers ─────────────────────────────────────────────────

export async function authenticateAdmin(
  email: string,
  password: string
): Promise<AdminSession | null> {
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin || !admin.isActive) return null;

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return null;

  return { id: admin.id, email: admin.email, name: admin.name };
}

export async function createAdminAccount(
  name: string,
  email: string,
  password: string
): Promise<void> {
  const hashed = await bcrypt.hash(password, 12);
  await prisma.admin.create({ data: { name, email, password: hashed } });
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
