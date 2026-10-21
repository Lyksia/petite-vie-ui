/** Longueur du code d'accès à l'interface admin : 8 chiffres, soit 100 millions de codes possibles. */
export declare const ADMIN_CODE_LENGTH = 8;
/** Messages de l'écran admin, à réutiliser par les jeux pour traduire les refus du serveur. */
export declare const ADMIN_MESSAGES: {
    readonly invalidCode: "Accès refusé";
    readonly wrongCode: "Accès refusé";
    readonly tooManyAttempts: "Trop d'essais. L'accès admin est bloqué un moment, réessaie plus tard.";
};
/**
 * Remet une saisie de code admin à sa forme canonique (« 1234 5678 » → « 12345678 »).
 * Tolère espaces, tirets et points. Renvoie `null` si ce ne sont pas exactement 8 chiffres.
 */
export declare function normalizeAdminCode(input: string): string | null;
