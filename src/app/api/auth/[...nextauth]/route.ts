import { NextRequest, NextResponse } from "next/server";

async function getHandlers() {
  const { handlers } = await import("@/lib/auth");
  return handlers;
}

export async function GET(req: NextRequest) {
  try {
    const handlers = await getHandlers();
    return await handlers.GET(req);
  } catch (err: unknown) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error("[nextauth:GET]", msg);
    return NextResponse.redirect(new URL(`/auth/error?error=Configuration`, req.url));
  }
}

export async function POST(req: NextRequest) {
  try {
    const handlers = await getHandlers();
    return await handlers.POST(req);
  } catch (err: unknown) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error("[nextauth:POST]", msg);
    return NextResponse.redirect(new URL(`/auth/error?error=Configuration`, req.url));
  }
}
