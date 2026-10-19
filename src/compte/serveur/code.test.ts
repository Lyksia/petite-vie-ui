import { describe, expect, it } from "vitest";
import { CODE_ALPHABET, CODE_LENGTH, formatCode, generateCode, hashCode, normalizeCode } from "./index.js";

describe("code de compte", () => {
  it("fait 8 caractères, sans aucun caractère ambigu", () => {
    expect(CODE_LENGTH).toBe(8);
    for (const char of "01OIL") expect(CODE_ALPHABET).not.toContain(char);
  });

  it("génère des codes de 8 caractères valables et variés", () => {
    const codes = new Set(Array.from({ length: 500 }, generateCode));
    for (const code of codes) {
      expect(code).toHaveLength(8);
      expect(normalizeCode(code)).toBe(code);
    }
    expect(codes.size).toBe(500);
  });

  it("tolère minuscules, espaces et tirets à la saisie", () => {
    expect(normalizeCode("k7m4 qxt2")).toBe("K7M4QXT2");
    expect(normalizeCode(" K7M4-QXT2 ")).toBe("K7M4QXT2");
    expect(normalizeCode("k-7.m_4 q x t 2")).toBe("K7M4QXT2");
  });

  it("refuse les saisies qui ne sont pas des codes de 8 caractères", () => {
    expect(normalizeCode("K7M4QX")).toBeNull(); // ancien format à 6
    expect(normalizeCode("K7M4QXT")).toBeNull();
    expect(normalizeCode("K7M4QXT2A")).toBeNull();
    expect(normalizeCode("K0M4QXT2")).toBeNull();
    expect(normalizeCode("KIM4QXT2")).toBeNull();
    expect(normalizeCode("")).toBeNull();
  });

  it("affiche le code en deux blocs de 4", () => {
    expect(formatCode("k7m4qxt2")).toBe("K7M4 QXT2");
    expect(formatCode("k7m4-qxt2")).toBe("K7M4 QXT2");
    expect(formatCode("n'importe quoi")).toBe("n'importe quoi");
  });

  it("donne la même empreinte quelle que soit la saisie", () => {
    const hash = hashCode("K7M4QXT2");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashCode("k7m4 qxt2")).toBe(hash);
    expect(hashCode("K7M4QXT3")).not.toBe(hash);
  });

  it("change d'empreinte avec un poivre", () => {
    expect(hashCode("K7M4QXT2", "secret")).not.toBe(hashCode("K7M4QXT2"));
    expect(hashCode("K7M4QXT2", "secret")).toBe(hashCode("k7m4-qxt2", "secret"));
  });

  it("refuse d'empreinter un code invalide", () => {
    expect(() => hashCode("abc")).toThrow();
    expect(() => hashCode("K7M4QX")).toThrow();
  });
});
