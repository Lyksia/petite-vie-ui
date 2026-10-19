import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { normalizeAnswer } from "../answer-format.js";

const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const PARAMS = { N: 16384, r: 8, p: 1 } as const;

function derive(answer: string, salt: Buffer, options: ScryptOptions, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(answer, salt, keyLength, { ...options, maxmem: 64 * 1024 * 1024 }, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

/**
 * Empreinte d'une réponse secrète : normalisation, puis scrypt avec un sel aléatoire.
 * Format stocké : `scrypt$N$r$p$sel$empreinte` (sel et empreinte en base64url). Lève une erreur si la réponse est vide.
 */
export async function hashAnswer(answer: string): Promise<string> {
  const normalized = normalizeAnswer(answer);
  if (!normalized) throw new Error("Réponse secrète vide");
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(normalized, salt, PARAMS, KEY_LENGTH);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

/** Compare une réponse à son empreinte stockée, à temps constant. Renvoie `false` si l'empreinte est mal formée. */
export async function verifyAnswer(answer: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltText, keyText] = parts as [string, string, string, string, string, string];
  const options = { N: Number(n), r: Number(r), p: Number(p) };
  if (!Object.values(options).every((value) => Number.isSafeInteger(value) && value > 0)) return false;
  const expected = Buffer.from(keyText, "base64url");
  const salt = Buffer.from(saltText, "base64url");
  if (expected.length === 0 || salt.length === 0) return false;
  const normalized = normalizeAnswer(answer);
  if (!normalized) return false;
  try {
    const actual = await derive(normalized, salt, options, expected.length);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
