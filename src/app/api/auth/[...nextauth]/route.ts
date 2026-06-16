import { NextRequest, NextResponse } from "next/server";

// Lazy-load auth to catch initialization errors
async function getHandlers() {
  const { handlers } = await import("@/lib/auth");
  return handlers;
}

export async function GET(req: NextRequest) {
  try {
    const handlers = await getHandlers();
    return await handlers.GET(req);
  } catch (err: unknown) {
    const msg = err instanceof Error
      ? `${err.name}: ${err.message}\n${err.stack}`
      : String(err);
    console.error("[nextauth:GET:CAUGHT]", msg);
    // Return the real error so we can see it
    return NextResponse.json({ caught: true, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const handlers = await getHandlers();
    return await handlers.POST(req);
  } catch (err: unknown) {
    const msg = err instanceof Error
      ? `${err.name}: ${err.message}\n${err.stack}`
      : String(err);
    console.error("[nextauth:POST:CAUGHT]", msg);
    return NextResponse.json({ caught: true, error: msg }, { status: 500 });
  }
}
