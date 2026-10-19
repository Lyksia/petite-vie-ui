// @petite-vie/ui/compte — écrans du compte par code, côté joueur. Aucun appel réseau : tout passe par les callbacks.
export { ACCOUNT_MESSAGES, AccountFormError } from "./account-error";
export { AccountCodeCard, type AccountCodeCardProps } from "./account-code-card";
export { ANSWER_MAX_LENGTH, normalizeAnswer } from "./answer-format";
export { CODE_ALPHABET, CODE_LENGTH, formatCode, normalizeCode } from "./code-format";
export { CodeDisplay } from "./code-display";
export { CreateAccount, type CreateAccountInput, type CreateAccountProps } from "./create-account";
export { LostCode, type LostCodeInput, type LostCodeProps } from "./lost-code";
export { SECRET_QUESTION_IDS, SECRET_QUESTIONS, getSecretQuestion, type SecretQuestion, type SecretQuestionId } from "./questions";
export { Recover, type RecoverProps, type RecoverResult } from "./recover";
export { SignIn, type SignInProps } from "./sign-in";
