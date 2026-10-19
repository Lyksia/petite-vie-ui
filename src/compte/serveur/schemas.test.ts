import { describe, expect, it } from "vitest";
import { createAccountBodySchema, recoveryAnswerBodySchema, recoveryRequestBodySchema, signInBodySchema } from "./index.js";

describe("schémas des corps de requête", () => {
  it("normalise le code à la connexion", () => {
    expect(signInBodySchema.parse({ code: "k7m4-qxt2" })).toEqual({ code: "K7M4QXT2" });
    expect(signInBodySchema.parse({ code: " K7M4 QXT2 " })).toEqual({ code: "K7M4QXT2" });
    expect(signInBodySchema.safeParse({ code: "K0M4QXT2" }).success).toBe(false);
    expect(signInBodySchema.safeParse({ code: "K7M4QX" }).success).toBe(false);
  });

  it("valide la création", () => {
    expect(createAccountBodySchema.safeParse({ questionId: "doudou", answer: "Nounours" }).success).toBe(true);
    expect(createAccountBodySchema.safeParse({ questionId: "inconnue", answer: "Nounours" }).success).toBe(false);
    expect(createAccountBodySchema.safeParse({ questionId: "doudou", answer: " ?! " }).success).toBe(false);
  });

  it("valide la demande de récupération", () => {
    expect(recoveryRequestBodySchema.safeParse({ details: "Léa et Tom", email: "a@b.fr" }).success).toBe(true);
    expect(recoveryRequestBodySchema.safeParse({ details: "  ", email: "a@b.fr" }).success).toBe(false);
    expect(recoveryRequestBodySchema.safeParse({ details: "Léa", email: "pas-un-mail" }).success).toBe(false);
  });

  it("valide la réponse de récupération", () => {
    const token = "a".repeat(43);
    expect(recoveryAnswerBodySchema.safeParse({ token, answer: "Nounours" }).success).toBe(true);
    expect(recoveryAnswerBodySchema.safeParse({ token: "court", answer: "Nounours" }).success).toBe(false);
  });
});
