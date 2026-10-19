/** Les caractères d'un code de compte : chiffres et lettres sans les ambigus (pas de 0/O, 1/I/L). 31 caractères. */
export declare const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
/** Longueur d'un code de compte. 31^8 ≈ 852 milliards de codes possibles. */
export declare const CODE_LENGTH = 8;
/**
 * Remet une saisie de code à sa forme canonique (« k7m4-qxt2 » → « K7M4QXT2 »).
 * Tolère minuscules, espaces, tirets, points et tirets bas. Renvoie `null` si ce n'est pas un code valable.
 */
export declare function normalizeCode(input: string): string | null;
/** Affichage lisible d'un code, en deux blocs : « K7M4QXT2 » → « K7M4 QXT2 ». Une saisie non valable est renvoyée telle quelle. */
export declare function formatCode(code: string): string;
