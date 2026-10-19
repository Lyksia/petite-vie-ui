import { z } from "zod";
import { ANSWER_MAX_LENGTH, normalizeAnswer } from "../answer-format.js";
import { normalizeCode } from "../code-format.js";
import { SECRET_QUESTION_IDS } from "../questions.js";
/** Un code de compte saisi librement, rendu sous forme canonique (« k7m4-qxt2 » → « K7M4QXT2 »). */
export const accountCodeSchema = z
    .string()
    .max(24)
    .transform((value, context) => {
    const code = normalizeCode(value);
    if (!code) {
        context.addIssue({ code: "custom", message: "Code invalide" });
        return z.NEVER;
    }
    return code;
});
/** Une réponse secrète : non vide une fois normalisée. Gardée telle quelle (hashAnswer normalise). */
export const secretAnswerSchema = z
    .string()
    .max(ANSWER_MAX_LENGTH)
    .refine((value) => normalizeAnswer(value).length > 0, "Réponse vide");
/** Un jeton à usage unique tel qu'il arrive dans un lien (base64url de 32 octets). */
export const oneTimeTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, "Jeton invalide");
/** POST création de compte. */
export const createAccountBodySchema = z.object({
    questionId: z.enum(SECRET_QUESTION_IDS),
    answer: secretAnswerSchema,
});
/** POST connexion par code. */
export const signInBodySchema = z.object({
    code: accountCodeSchema,
});
/** POST « J'ai perdu mon code » : identifiants propres au jeu en texte libre + e-mail utilisé une seule fois. */
export const recoveryRequestBodySchema = z.object({
    details: z.string().trim().min(1).max(500),
    email: z.email().max(254),
});
/** POST réponse à la question depuis le lien de récupération. */
export const recoveryAnswerBodySchema = z.object({
    token: oneTimeTokenSchema,
    answer: secretAnswerSchema,
});
/** POST connexion par jeton de transfert. */
export const transferBodySchema = z.object({
    token: oneTimeTokenSchema,
});
