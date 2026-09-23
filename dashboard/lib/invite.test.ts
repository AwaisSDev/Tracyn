import { describe, expect, it } from "vitest";
import { joinPath, parseInvite } from "./invite";

describe("parseInvite", () => {
  it("reads a full invite link with its key", () => {
    expect(parseInvite("https://tracyn.online/join/ab3kd9xq2m?key=Tok_en-123")).toEqual({ code: "ab3kd9xq2m", key: "Tok_en-123" });
  });

  it("reads a plain workspace link", () => {
    expect(parseInvite("http://localhost:3000/join/ab3kd9xq2m")).toEqual({ code: "ab3kd9xq2m", key: null });
  });

  it("reads a bare code, ignoring case and spaces", () => {
    expect(parseInvite("  AB3KD9XQ2M ")).toEqual({ code: "ab3kd9xq2m", key: null });
  });

  it("rejects anything else", () => {
    expect(parseInvite("")).toBeNull();
    expect(parseInvite("hello there")).toBeNull();
    expect(parseInvite("https://example.com/other")).toBeNull();
  });
});

describe("joinPath", () => {
  it("adds the key only when there is one", () => {
    expect(joinPath("abc123")).toBe("/join/abc123");
    expect(joinPath("abc123", "k=1")).toBe("/join/abc123?key=k%3D1");
  });
});
