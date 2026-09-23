// Links for joining a shared workspace. Both go to /join/<code>; the invite
// link adds ?key=<token> and joins in one click, the plain one asks for the
// workspace password.

export function joinPath(code: string, key?: string | null): string {
  const base = `/join/${encodeURIComponent(code)}`;
  return key ? `${base}?key=${encodeURIComponent(key)}` : base;
}

/** Reads what someone pasted to join a workspace: a full invite link, a
 * plain workspace link, or just the code. Returns null if it's none of those. */
export function parseInvite(raw: string): { code: string; key: string | null } | null {
  const text = raw.trim();
  if (!text) return null;

  const match = text.match(/\/join\/([A-Za-z0-9]+)(?:\/)?(?:\?([^#\s]*))?/);
  if (match) {
    const key = new URLSearchParams(match[2] ?? "").get("key");
    return { code: match[1].toLowerCase(), key: key || null };
  }
  if (/^[A-Za-z0-9]{6,20}$/.test(text)) return { code: text.toLowerCase(), key: null };
  return null;
}
