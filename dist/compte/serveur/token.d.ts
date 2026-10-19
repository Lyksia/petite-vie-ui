/** Durée de vie d'un lien de récupération : 24 h. */
export declare const RECOVERY_TOKEN_TTL_MS: number;
/** Durée de vie d'un jeton de transfert (arrivée depuis une autre adresse) : 15 min. */
export declare const TRANSFER_TOKEN_TTL_MS: number;
export type OneTimeToken = {
    /** Le jeton clair, à mettre dans le lien. Jamais stocké. */
    token: string;
    /** Son empreinte sha256 (hex), seule gardée en base. */
    tokenHash: string;
    expiresAt: Date;
};
/** Empreinte sha256 (hex) d'un jeton : 32 octets aléatoires n'ont pas besoin de sel ni de hachage lent. */
export declare function hashToken(token: string): string;
/** Crée un jeton à usage unique (32 octets aléatoires, base64url) valable `ttlMs` à partir de `now`. */
export declare function createOneTimeToken(ttlMs: number, now?: Date): OneTimeToken;
/** Un jeton est utilisable s'il n'a pas servi et n'a pas expiré. */
export declare function isTokenUsable(record: {
    expiresAt: Date;
    usedAt?: Date | null;
}, now?: Date): boolean;
