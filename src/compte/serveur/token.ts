import { createHash, randomBytes } from "node:crypto";

/** Durée de vie d'un lien de récupération : 24 h. */
export const RECOVERY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Durée de vie d'un jeton de transfert (arrivée depuis une autre adresse) : 15 min. */
export const TRANSFER_TOKEN_TTL_MS = 15 * 60 * 1000;

export type OneTimeToken = {
  /** Le jeton clair, à mettre dans le lien. Jamais stocké. */
  token: string;
  /** Son empreinte sha256 (hex), seule gardée en base. */
  tokenHash: string;
  expiresAt: Date;
};

/** Empreinte sha256 (hex) d'un jeton : 32 octets aléatoires n'ont pas besoin de sel ni de hachage lent. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Crée un jeton à usage unique (32 octets aléatoires, base64url) valable `ttlMs` à partir de `now`. */
export function createOneTimeToken(ttlMs: number, now: Date = new Date()): OneTimeToken {
  if (!(ttlMs > 0)) throw new Error("Durée de vie du jeton invalide");
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + ttlMs) };
}

/** Un jeton est utilisable s'il n'a pas servi et n'a pas expiré. */
export function isTokenUsable(record: { expiresAt: Date; usedAt?: Date | null }, now: Date = new Date()): boolean {
  return !record.usedAt && record.expiresAt.getTime() > now.getTime();
}
