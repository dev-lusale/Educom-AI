import { NextResponse } from "next/server";

// TEMPORARY debug endpoint — delete after fixing env vars
export async function GET() {
  return NextResponse.json({
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID
      ? `SET (${process.env.GOOGLE_CLIENT_ID.slice(0, 20)}...)`
      : "❌ MISSING",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
      ? `SET (${process.env.GOOGLE_CLIENT_SECRET.slice(0, 10)}...)`
      : "❌ MISSING",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "❌ MISSING",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET" : "❌ MISSING",
    DATABASE_URL: process.env.DATABASE_URL
      ? `SET (${process.env.DATABASE_URL.slice(0, 30)}...)`
      : "❌ MISSING",
    NODE_ENV: process.env.NODE_ENV,
  });
}
