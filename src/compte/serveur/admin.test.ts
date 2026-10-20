import { describe, expect, it } from "vitest";
import { ADMIN_GUARD, createAdminGuard, generateAdminCode, hashAdminCode, normalizeAdminCode, verifyAdminCode } from "./index.js";

const SECRET = "s".repeat(32);

describe("normalizeAdminCode", () => {
  it("accepte 8 chiffres, avec espaces, tirets ou points", () => {
    expect(normalizeAdminCode("1234 5678")).toBe("12345678");
    expect(normalizeAdminCode(" 1234-5678 ")).toBe("12345678");
    expect(normalizeAdminCode("12.34.56.78")).toBe("12345678");
  });

  it("refuse tout le reste", () => {
    for (const input of ["1234567", "123456789", "1234 567a", "", "K7M4 QXT2", "１２３４５６７８"]) expect(normalizeAdminCode(input)).toBeNull();
  });
});

describe("generateAdminCode", () => {
  it("tire 8 chiffres", () => {
    for (let index = 0; index < 50; index++) expect(generateAdminCode()).toMatch(/^\d{8}$/);
  });
});

describe("hashAdminCode / verifyAdminCode", () => {
  it("vérifie le bon code, même saisi avec un espace, et refuse les autres", async () => {
    const stored = await hashAdminCode("12345678");
    expect(stored).not.toContain("12345678");
    expect(await verifyAdminCode("1234 5678", stored)).toBe(true);
    expect(await verifyAdminCode("12345679", stored)).toBe(false);
    expect(await verifyAdminCode("abc", stored)).toBe(false);
    expect(await verifyAdminCode("12345678", "pas-une-empreinte")).toBe(false);
  });

  it("refuse d'empreindre un code invalide", async () => {
    await expect(hashAdminCode("1234")).rejects.toThrow();
  });
});

describe("createAdminGuard", () => {
  const setup = async () => {
    let time = 1_000_000;
    const codeHash = await hashAdminCode("12345678");
    const guard = createAdminGuard({ codeHash, sessionSecret: SECRET, now: () => time });
    return { guard, codeHash, advance: (ms: number) => (time += ms) };
  };

  it("refuse une configuration mal faite", () => {
    expect(() => createAdminGuard({ codeHash: "12345678", sessionSecret: SECRET })).toThrow(/ADMIN_CODE_HASH/);
    expect(() => createAdminGuard({ codeHash: "scrypt$x", sessionSecret: "court" })).toThrow(/ADMIN_SESSION_SECRET/);
  });

  it("ouvre une session avec le bon code, valable 12 h", async () => {
    const { guard, advance } = await setup();
    const result = await guard.signIn("1234 5678", "1.2.3.4");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(guard.verifySession(result.session)).toBe(true);
    advance(ADMIN_GUARD.sessionMs - 1);
    expect(guard.verifySession(result.session)).toBe(true);
    advance(1);
    expect(guard.verifySession(result.session)).toBe(false);
  });

  it("refuse un mauvais code", async () => {
    const { guard } = await setup();
    expect(await guard.signIn("00000000", "1.2.3.4")).toEqual({ ok: false, reason: "invalid-code", retryAfterMs: 0 });
  });

  it("refuse une session falsifiée, prolongée ou signée par un autre jeu", async () => {
    const { guard, codeHash } = await setup();
    const result = await guard.signIn("12345678", "1.2.3.4");
    if (!result.ok) throw new Error("connexion attendue");
    const [version, expiresAt, signature] = result.session.split(".") as [string, string, string];
    expect(guard.verifySession(`${version}.${Number(expiresAt) + 1}.${signature}`)).toBe(false);
    const forged = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
    expect(guard.verifySession(`${version}.${expiresAt}.${forged}`)).toBe(false);
    for (const bad of [undefined, null, "", "v1..", "v2.1.x", result.session + "x"]) expect(guard.verifySession(bad)).toBe(false);
    const otherGame = createAdminGuard({ codeHash, sessionSecret: "t".repeat(32) });
    expect(otherGame.verifySession(result.session)).toBe(false);
  });

  it("ferme les sessions quand le code change", async () => {
    const { guard } = await setup();
    const result = await guard.signIn("12345678", "1.2.3.4");
    if (!result.ok) throw new Error("connexion attendue");
    const renewed = createAdminGuard({ codeHash: await hashAdminCode("87654321"), sessionSecret: SECRET });
    expect(renewed.verifySession(result.session)).toBe(false);
  });

  it("bloque une adresse après 5 essais, même avec le bon code ensuite, sans compter les essais refusés", async () => {
    const { guard, advance } = await setup();
    for (let index = 0; index < 5; index++) expect((await guard.signIn("00000000", "1.2.3.4")).ok).toBe(false);
    const blocked = await guard.signIn("12345678", "1.2.3.4");
    expect(blocked).toMatchObject({ ok: false, reason: "too-many-attempts" });
    // Une autre adresse passe encore
    expect((await guard.signIn("12345678", "5.6.7.8")).ok).toBe(true);
    advance(ADMIN_GUARD.perIp.windowMs);
    expect((await guard.signIn("12345678", "1.2.3.4")).ok).toBe(true);
  });

  it("ne laisse pas passer plus de 5 essais simultanés par adresse (pas de TOCTOU)", async () => {
    const { guard } = await setup();
    const results = await Promise.all(Array.from({ length: 12 }, () => guard.signIn("00000000", "1.2.3.4")));
    expect(results.filter((result) => !result.ok && result.reason === "invalid-code")).toHaveLength(5);
  });

  it("plafonne les essais toutes adresses confondues (attaque répartie)", async () => {
    const { guard } = await setup();
    for (let index = 0; index < ADMIN_GUARD.global.max; index++) await guard.signIn("00000000", `10.0.0.${index}`);
    expect(await guard.signIn("12345678", "10.0.1.1")).toMatchObject({ ok: false, reason: "too-many-attempts" });
  });

  it("une connexion réussie ne rend que son propre essai", async () => {
    const { guard } = await setup();
    for (let index = 0; index < 4; index++) await guard.signIn("00000000", "1.2.3.4");
    expect((await guard.signIn("12345678", "1.2.3.4")).ok).toBe(true);
    expect((await guard.signIn("00000000", "1.2.3.4")).ok).toBe(false);
    expect(await guard.signIn("12345678", "1.2.3.4")).toMatchObject({ ok: false, reason: "too-many-attempts" });
  });
});
