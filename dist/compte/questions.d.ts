/** Une question secrète proposée à la création du compte. L'`id` est stocké ; le libellé peut évoluer. */
export type SecretQuestion = {
    id: string;
    label: string;
};
/** Les questions secrètes, communes aux jeux. Ne jamais retirer ni renuméroter un `id` déjà utilisé. */
export declare const SECRET_QUESTIONS: readonly [{
    readonly id: "premier-animal";
    readonly label: "Comment s'appelait ton premier animal ?";
}, {
    readonly id: "doudou";
    readonly label: "Comment s'appelait ton doudou ?";
}, {
    readonly id: "ami-enfance";
    readonly label: "Comment s'appelait ton meilleur ami ou ta meilleure amie d'enfance ?";
}, {
    readonly id: "rue-enfance";
    readonly label: "Dans quelle rue as-tu grandi ?";
}, {
    readonly id: "plat-enfance";
    readonly label: "Quel était ton plat préféré quand tu étais enfant ?";
}, {
    readonly id: "premier-film";
    readonly label: "Quel est le premier film que tu as vu au cinéma ?";
}, {
    readonly id: "surnom-enfance";
    readonly label: "Quel surnom te donnait-on quand tu étais enfant ?";
}];
export type SecretQuestionId = (typeof SECRET_QUESTIONS)[number]["id"];
export declare const SECRET_QUESTION_IDS: [SecretQuestionId, ...SecretQuestionId[]];
/** Le libellé d'une question à partir de son `id`, ou `undefined` si l'`id` est inconnu. */
export declare function getSecretQuestion(id: string): SecretQuestion | undefined;
