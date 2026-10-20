/** Longueur du code d'accès à l'interface admin : 8 chiffres, soit 100 millions de codes possibles. */
export const ADMIN_CODE_LENGTH = 8;

const VALID_ADMIN_CODE = new RegExp(`^\\d{${ADMIN_CODE_LENGTH}}$`);

/** Messages de l'écran admin, à réutiliser par les jeux pour traduire les refus du serveur. */
export const ADMIN_MESSAGES = {
  invalidCode: "Le code admin fait 8 chiffres, comme 1234 5678.",
  wrongCode: "Ce n'est pas le bon code.",
  tooManyAttempts: "Trop d'essais. L'accès admin est bloqué un moment, réessaie plus tard.",
} as const;

/**
 * Remet une saisie de code admin à sa forme canonique (« 1234 5678 » → « 12345678 »).
 * Tolère espaces, tirets et points. Renvoie `null` si ce ne sont pas exactement 8 chiffres.
 */
export function normalizeAdminCode(input: string): string | null {
  const code = input.replace(/[\s\-.]/g, "");
  return VALID_ADMIN_CODE.test(code) ? code : null;
}
