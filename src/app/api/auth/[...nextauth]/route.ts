import { handlers } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    return await handlers.GET(req);
  } catch (err) {
    const msg = err instanceof Error ? err.message + "\n" + err.stack : String(err);
    console.error("[nextauth:GET]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "content-type": "application/json" } });
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handlers.POST(req);
  } catch (err) {
    const msg = err instanceof Error ? err.message + "\n" + err.stack : String(err);
    console.error("[nextauth:POST]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "content-type": "application/json" } });
  }
}
