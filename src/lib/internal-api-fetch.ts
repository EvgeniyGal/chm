import { headers } from "next/headers";

/**
 * Server actions that `fetch` same-origin `/api/*` must forward the incoming Cookie header,
 * otherwise NextAuth sees no session on that inner request (JWT lives in cookies).
 */
function normalizeInternalUrl(input: string | URL): string | URL {
  if (input instanceof URL) return input;
  if (/^https?:\/\//i.test(input) || input.startsWith("/")) return input;
  const withProtocol = input.startsWith("localhost:") || input.startsWith("127.0.0.1:")
    ? `http://${input}`
    : `https://${input}`;
  return withProtocol;
}

export async function internalApiFetch(input: string | URL, init?: RequestInit): Promise<Response> {
  const h = await headers();
  const cookie = h.get("cookie");
  const merged = new Headers(init?.headers);
  if (cookie) {
    merged.set("cookie", cookie);
  }
  return fetch(normalizeInternalUrl(input), { ...init, headers: merged });
}
