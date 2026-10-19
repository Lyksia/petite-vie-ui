/**
 * Empreinte d'une réponse secrète : normalisation, puis scrypt avec un sel aléatoire.
 * Format stocké : `scrypt$N$r$p$sel$empreinte` (sel et empreinte en base64url). Lève une erreur si la réponse est vide.
 */
export declare function hashAnswer(answer: string): Promise<string>;
/** Compare une réponse à son empreinte stockée, à temps constant. Renvoie `false` si l'empreinte est mal formée. */
export declare function verifyAnswer(answer: string, stored: string): Promise<boolean>;
