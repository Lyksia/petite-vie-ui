/**
 * Met une réponse secrète sous une forme stable avant empreinte :
 * minuscules, sans accents ni ligatures, ponctuation et symboles remplacés par des espaces, espaces réduits.
 * « Jean-Pierre ! » et « jean pierre » donnent la même chose.
 */
export function normalizeAnswer(answer: string): string {
  return answer
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .replace(/[\p{P}\p{S}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Longueur maximale d'une réponse secrète saisie. */
export const ANSWER_MAX_LENGTH = 100;
