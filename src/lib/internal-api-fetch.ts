import { headers } from "next/headers";

/**
 * Server actions that `fetch` same-origin `/api/*` must forward the incoming Cookie header,
 * otherwise NextAuth sees no session on that inner request (JWT lives in cookies).
 */
export async function internalApiFetch(input: string | URL, init?: RequestInit): Promise<Response> {
  const h = await headers();
  const cookie = h.get("cookie");
  const merged = new Headers(init?.headers);
  if (cookie) {
    merged.set("cookie", cookie);
  }
  return fetch(input, { ...init, headers: merged });
}
