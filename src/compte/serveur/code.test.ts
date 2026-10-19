import { describe, expect, it } from "vitest";
import { CODE_ALPHABET, formatCode, generateCode, hashCode, normalizeCode } from "./index.js";

describe("code de compte", () => {
  it("n'utilise aucun caractère ambigu", () => {
    for (const char of "01OIL") expect(CODE_ALPHABET).not.toContain(char);
  });

  it("génère des codes valables et variés", () => {
    const codes = new Set(Array.from({ length: 500 }, generateCode));
    for (const code of codes) expect(normalizeCode(code)).toBe(code);
    expect(codes.size).toBeGreaterThan(495);
  });

  it("tolère minuscules, espaces et tirets à la saisie", () => {
    expect(normalizeCode("k7m 4qx")).toBe("K7M4QX");
    expect(normalizeCode(" K7M-4QX ")).toBe("K7M4QX");
    expect(normalizeCode("k-7.m_4 q x")).toBe("K7M4QX");
  });

  it("refuse les saisies qui ne sont pas des codes", () => {
    expect(normalizeCode("K7M4Q")).toBeNull();
    expect(normalizeCode("K7M4QXA")).toBeNull();
    expect(normalizeCode("K0M4QX")).toBeNull();
    expect(normalizeCode("KIM4QX")).toBeNull();
    expect(normalizeCode("")).toBeNull();
  });

  it("affiche le code en deux groupes", () => {
    expect(formatCode("k7m4qx")).toBe("K7M 4QX");
    expect(formatCode("n'importe quoi")).toBe("n'importe quoi");
  });

  it("donne la même empreinte quelle que soit la saisie", () => {
    const hash = hashCode("K7M4QX");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashCode("k7m 4qx")).toBe(hash);
    expect(hashCode("K7M4QY")).not.toBe(hash);
  });

  it("change d'empreinte avec un poivre", () => {
    expect(hashCode("K7M4QX", "secret")).not.toBe(hashCode("K7M4QX"));
    expect(hashCode("K7M4QX", "secret")).toBe(hashCode("k7m-4qx", "secret"));
  });

  it("refuse d'empreinter un code invalide", () => {
    expect(() => hashCode("abc")).toThrow();
  });
});
