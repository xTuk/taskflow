import "server-only";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken, type SessionPayload } from "./auth";
import { prisma } from "./db";

/**
 * Reads and verifies the session cookie for the current request.
 * Returns null when there is no valid session — callers decide whether
 * that means "redirect to /login" or "return 401".
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Convenience helper for pages/route handlers that need the full,
 * up-to-date user record (not just the JWT claims).
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  return user;
}
