/** Une question secrète proposée à la création du compte. L'`id` est stocké ; le libellé peut évoluer. */
export type SecretQuestion = { id: string; label: string };

/** Les questions secrètes, communes aux jeux. Ne jamais retirer ni renuméroter un `id` déjà utilisé. */
export const SECRET_QUESTIONS = [
  { id: "premier-animal", label: "Comment s'appelait ton premier animal ?" },
  { id: "doudou", label: "Comment s'appelait ton doudou ?" },
  { id: "ami-enfance", label: "Comment s'appelait ton meilleur ami ou ta meilleure amie d'enfance ?" },
  { id: "rue-enfance", label: "Dans quelle rue as-tu grandi ?" },
  { id: "plat-enfance", label: "Quel était ton plat préféré quand tu étais enfant ?" },
  { id: "premier-film", label: "Quel est le premier film que tu as vu au cinéma ?" },
  { id: "surnom-enfance", label: "Quel surnom te donnait-on quand tu étais enfant ?" },
] as const satisfies readonly SecretQuestion[];

export type SecretQuestionId = (typeof SECRET_QUESTIONS)[number]["id"];

export const SECRET_QUESTION_IDS = SECRET_QUESTIONS.map((question) => question.id) as [SecretQuestionId, ...SecretQuestionId[]];

/** Le libellé d'une question à partir de son `id`, ou `undefined` si l'`id` est inconnu. */
export function getSecretQuestion(id: string): SecretQuestion | undefined {
  return SECRET_QUESTIONS.find((question) => question.id === id);
}
