/** Les caractères d'un code de compte : chiffres et lettres sans les ambigus (pas de 0/O, 1/I/L). 31 caractères. */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Longueur d'un code de compte. 31^8 ≈ 852 milliards de codes possibles. */
export const CODE_LENGTH = 8;

const VALID_CODE = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

/**
 * Remet une saisie de code à sa forme canonique (« k7m4-qxt2 » → « K7M4QXT2 »).
 * Tolère minuscules, espaces, tirets, points et tirets bas. Renvoie `null` si ce n'est pas un code valable.
 */
export function normalizeCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s\-._]/g, "");
  return VALID_CODE.test(code) ? code : null;
}

/** Affichage lisible d'un code, en deux blocs : « K7M4QXT2 » → « K7M4 QXT2 ». Une saisie non valable est renvoyée telle quelle. */
export function formatCode(code: string): string {
  const normalized = normalizeCode(code);
  if (!normalized) return code;
  const half = CODE_LENGTH / 2;
  return `${normalized.slice(0, half)} ${normalized.slice(half)}`;
}
