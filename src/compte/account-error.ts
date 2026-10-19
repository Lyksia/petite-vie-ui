/** Messages par défaut, à réutiliser par les jeux pour traduire les réponses de leur API. */
export const ACCOUNT_MESSAGES = {
  network: "Ça n'a pas marché. Vérifie ta connexion et réessaie.",
  unknownCode: "Ce code ne correspond à aucun compte. Vérifie chaque caractère.",
  tooManyAttempts: "Trop d'essais d'un coup. Attends un quart d'heure avant de réessayer.",
  invalidCode: "Un code fait 8 lettres et chiffres, comme K7M4 QXT2.",
} as const;

/**
 * Erreur dont le message s'affiche tel quel au joueur. Les callbacks (onSignIn, onCreate…) la lèvent
 * pour un refus attendu ; toute autre erreur affiche le message réseau par défaut.
 */
export class AccountFormError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountFormError";
  }
}

export function messageOf(error: unknown): string {
  return error instanceof AccountFormError ? error.message : ACCOUNT_MESSAGES.network;
}
