import { describe, expect, it } from "vitest";
import { hashAnswer, normalizeAnswer, verifyAnswer } from "./index.js";

describe("normalizeAnswer", () => {
  it("met en minuscules, retire accents et ponctuation, réduit les espaces", () => {
    expect(normalizeAnswer("  Éléonore  ")).toBe("eleonore");
    expect(normalizeAnswer("Jean-Pierre !")).toBe("jean pierre");
    expect(normalizeAnswer("rue   de l'Église")).toBe("rue de l eglise");
    expect(normalizeAnswer("Cœur & Âme")).toBe("coeur ame");
    expect(normalizeAnswer("Ça va ?")).toBe("ca va");
  });

  it("rend une chaîne vide pour une réponse sans lettre", () => {
    expect(normalizeAnswer(" ?! ")).toBe("");
  });
});

describe("hashAnswer / verifyAnswer", () => {
  it("vérifie la bonne réponse, même écrite autrement", async () => {
    const stored = await hashAnswer("Pépette");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(stored).not.toContain("pepette");
    await expect(verifyAnswer("pepette", stored)).resolves.toBe(true);
    await expect(verifyAnswer("  PÉPETTE. ", stored)).resolves.toBe(true);
  });

  it("refuse une mauvaise réponse", async () => {
    const stored = await hashAnswer("Pépette");
    await expect(verifyAnswer("Pepito", stored)).resolves.toBe(false);
    await expect(verifyAnswer("", stored)).resolves.toBe(false);
  });

  it("sale chaque empreinte", async () => {
    expect(await hashAnswer("Pépette")).not.toBe(await hashAnswer("Pépette"));
  });

  it("refuse une réponse vide à la création", async () => {
    await expect(hashAnswer(" ... ")).rejects.toThrow();
  });

  it("renvoie false pour une empreinte mal formée", async () => {
    await expect(verifyAnswer("pepette", "")).resolves.toBe(false);
    await expect(verifyAnswer("pepette", "bcrypt$1$2$3$a$b")).resolves.toBe(false);
    await expect(verifyAnswer("pepette", "scrypt$x$8$1$abc$def")).resolves.toBe(false);
    await expect(verifyAnswer("pepette", "scrypt$16384$8$1$$")).resolves.toBe(false);
  });
});
