/** Empreinte scrypt avec un sel aléatoire. Format : `scrypt$N$r$p$sel$empreinte` (sel et empreinte en base64url). */
export declare function scryptHash(secret: string): Promise<string>;
/** Compare un secret (déjà normalisé) à son empreinte, à temps constant. `false` si l'empreinte est mal formée. */
export declare function scryptVerify(secret: string, stored: string): Promise<boolean>;
