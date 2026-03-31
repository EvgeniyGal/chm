import { headers } from "next/headers";

/**
 * Server actions that `fetch` same-origin `/api/*` must forward the incoming Cookie header,
 * otherwise NextAuth sees no session on that inner request (JWT lives in cookies).
 */
function requestOrigin(h: Headers): string {
  const forwardedProto = h.get("x-forwarded-proto");
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost ?? h.get("host");
  if (!host) return "http://localhost:3000";
  const proto = forwardedProto ?? (host.startsWith("localhost:") || host.startsWith("127.0.0.1:") ? "http" : "https");
  return `${proto}://${host}`;
}

function normalizeInternalUrl(input: string | URL, origin: string): string | URL {
  if (input instanceof URL) return input;
  if (/^https?:\/\//i.test(input)) return input;
  if (input.startsWith("/")) return `${origin}${input}`;
  const withProtocol = input.startsWith("localhost:") || input.startsWith("127.0.0.1:")
    ? `http://${input}`
    : `https://${input}`;
  return withProtocol;
}

export async function internalApiFetch(input: string | URL, init?: RequestInit): Promise<Response> {
  const h = await headers();
  const origin = requestOrigin(h);
  const cookie = h.get("cookie");
  const merged = new Headers(init?.headers);
  if (cookie) {
    merged.set("cookie", cookie);
  }
  return fetch(normalizeInternalUrl(input, origin), { ...init, headers: merged });
}
