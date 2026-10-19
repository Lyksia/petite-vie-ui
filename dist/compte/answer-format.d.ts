/**
 * Met une réponse secrète sous une forme stable avant empreinte :
 * minuscules, sans accents ni ligatures, ponctuation et symboles remplacés par des espaces, espaces réduits.
 * « Jean-Pierre ! » et « jean pierre » donnent la même chose.
 */
export declare function normalizeAnswer(answer: string): string;
/** Longueur maximale d'une réponse secrète saisie. */
export declare const ANSWER_MAX_LENGTH = 100;
