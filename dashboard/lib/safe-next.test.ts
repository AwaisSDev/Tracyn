import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_LOGIN, safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps same-site paths, including their query string", () => {
    expect(safeNext("/settings?plan=starter")).toBe("/settings?plan=starter");
    expect(safeNext("/approvals")).toBe("/approvals");
  });

  it("falls back to the dashboard when there's nothing to go to", () => {
    expect(safeNext(null)).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNext(undefined)).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNext("")).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("rejects anything that could leave the site (open redirect)", () => {
    expect(safeNext("https://evil.com")).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNext("//evil.com")).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNext("/\\evil.com")).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNext("javascript:alert(1)")).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("never sends someone back to the login page", () => {
    expect(safeNext("/login")).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNext("/login?next=/settings")).toBe(DEFAULT_AFTER_LOGIN);
  });
});
