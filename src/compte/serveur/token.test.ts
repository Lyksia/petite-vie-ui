import { describe, expect, it } from "vitest";
import { RECOVERY_TOKEN_TTL_MS, TRANSFER_TOKEN_TTL_MS, createOneTimeToken, hashToken, isTokenUsable, oneTimeTokenSchema } from "./index.js";

describe("jetons à usage unique", () => {
  const now = new Date("2026-10-19T12:00:00Z");

  it("renvoie le jeton clair, son empreinte et son expiration", () => {
    const { token, tokenHash, expiresAt } = createOneTimeToken(RECOVERY_TOKEN_TTL_MS, now);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(oneTimeTokenSchema.safeParse(token).success).toBe(true);
    expect(tokenHash).toBe(hashToken(token));
    expect(tokenHash).not.toContain(token);
    expect(expiresAt.toISOString()).toBe("2026-10-20T12:00:00.000Z");
  });

  it("ne tire jamais deux fois le même jeton", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => createOneTimeToken(TRANSFER_TOKEN_TTL_MS).token));
    expect(tokens.size).toBe(200);
  });

  it("expire après sa durée de vie", () => {
    const { expiresAt } = createOneTimeToken(TRANSFER_TOKEN_TTL_MS, now);
    expect(isTokenUsable({ expiresAt }, new Date(now.getTime() + 14 * 60 * 1000))).toBe(true);
    expect(isTokenUsable({ expiresAt }, new Date(now.getTime() + 15 * 60 * 1000))).toBe(false);
  });

  it("ne sert qu'une fois", () => {
    const { expiresAt } = createOneTimeToken(TRANSFER_TOKEN_TTL_MS, now);
    expect(isTokenUsable({ expiresAt, usedAt: null }, now)).toBe(true);
    expect(isTokenUsable({ expiresAt, usedAt: now }, now)).toBe(false);
  });

  it("refuse une durée de vie nulle", () => {
    expect(() => createOneTimeToken(0)).toThrow();
  });
});
