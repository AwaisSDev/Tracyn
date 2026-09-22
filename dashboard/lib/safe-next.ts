// Where to send someone after they sign in, taken from a `?next=` query
// param (set by the middleware when it bounces a signed-out visitor, and by
// the pricing page's plan buttons). Only same-site paths are allowed:
// anything that isn't a single-slash relative path ("//evil.com",
// "/\evil.com", "https://...") would make this an open redirect, so it
// falls back to the dashboard instead.
export const DEFAULT_AFTER_LOGIN = "/dashboard";

export function safeNext(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_AFTER_LOGIN;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return DEFAULT_AFTER_LOGIN;
  // Never bounce back into the login page itself.
  if (raw === "/login" || raw.startsWith("/login?") || raw.startsWith("/login/")) return DEFAULT_AFTER_LOGIN;
  return raw;
}
