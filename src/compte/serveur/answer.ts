import { normalizeAnswer } from "../answer-format.js";
import { scryptHash, scryptVerify } from "./scrypt.js";

/**
 * Empreinte d'une réponse secrète : normalisation, puis scrypt avec un sel aléatoire.
 * Format stocké : `scrypt$N$r$p$sel$empreinte` (sel et empreinte en base64url). Lève une erreur si la réponse est vide.
 */
export async function hashAnswer(answer: string): Promise<string> {
  const normalized = normalizeAnswer(answer);
  if (!normalized) throw new Error("Réponse secrète vide");
  return scryptHash(normalized);
}

/** Compare une réponse à son empreinte stockée, à temps constant. Renvoie `false` si l'empreinte est mal formée. */
export async function verifyAnswer(answer: string, stored: string): Promise<boolean> {
  const normalized = normalizeAnswer(answer);
  if (!normalized) return false;
  return scryptVerify(normalized, stored);
}
