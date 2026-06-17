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
    const msg = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack}` : String(err);
    console.error("[nextauth:GET:ERROR]", msg);
    // Return JSON so we can see the actual error
    const url = new URL(req.url);
    if (url.pathname.includes("callback")) {
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.redirect(new URL(`/auth/error?error=Configuration`, req.url));
  }
}

export async function POST(req: NextRequest) {
  try {
    const handlers = await getHandlers();
    return await handlers.POST(req);
  } catch (err: unknown) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack}` : String(err);
    console.error("[nextauth:POST:ERROR]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
