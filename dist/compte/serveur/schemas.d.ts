import { z } from "zod";
/** Un code de compte saisi librement, rendu sous forme canonique (« k7m-4qx » → « K7M4QX »). */
export declare const accountCodeSchema: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
/** Une réponse secrète : non vide une fois normalisée. Gardée telle quelle (hashAnswer normalise). */
export declare const secretAnswerSchema: z.ZodString;
/** Un jeton à usage unique tel qu'il arrive dans un lien (base64url de 32 octets). */
export declare const oneTimeTokenSchema: z.ZodString;
/** POST création de compte. */
export declare const createAccountBodySchema: z.ZodObject<{
    questionId: z.ZodEnum<{
        "premier-animal": "premier-animal";
        doudou: "doudou";
        "ami-enfance": "ami-enfance";
        "rue-enfance": "rue-enfance";
        "plat-enfance": "plat-enfance";
        "premier-film": "premier-film";
        "surnom-enfance": "surnom-enfance";
    }>;
    answer: z.ZodString;
}, z.core.$strip>;
/** POST connexion par code. */
export declare const signInBodySchema: z.ZodObject<{
    code: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
}, z.core.$strip>;
/** POST « J'ai perdu mon code » : identifiants propres au jeu en texte libre + e-mail utilisé une seule fois. */
export declare const recoveryRequestBodySchema: z.ZodObject<{
    details: z.ZodString;
    email: z.ZodEmail;
}, z.core.$strip>;
/** POST réponse à la question depuis le lien de récupération. */
export declare const recoveryAnswerBodySchema: z.ZodObject<{
    token: z.ZodString;
    answer: z.ZodString;
}, z.core.$strip>;
/** POST connexion par jeton de transfert. */
export declare const transferBodySchema: z.ZodObject<{
    token: z.ZodString;
}, z.core.$strip>;
export type CreateAccountBody = z.infer<typeof createAccountBodySchema>;
export type SignInBody = z.infer<typeof signInBodySchema>;
export type RecoveryRequestBody = z.infer<typeof recoveryRequestBodySchema>;
export type RecoveryAnswerBody = z.infer<typeof recoveryAnswerBodySchema>;
export type TransferBody = z.infer<typeof transferBodySchema>;
