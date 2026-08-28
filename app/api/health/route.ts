import { NextResponse } from "next/server";

/**
 * Liveness endpoint for the App Runner health check. Deliberately does not
 * touch the database — a health check should confirm "the Node process is
 * up and can serve requests", not "the database is reachable right now".
 * A slow/unreachable DB would otherwise cause App Runner to kill and
 * restart healthy instances in a loop.
 */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
