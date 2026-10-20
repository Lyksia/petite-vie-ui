// @petite-vie/ui/compte/serveur — logique serveur des comptes par code et de l'accès admin (Node, sans React ni Next).
export { ADMIN_CODE_LENGTH, ADMIN_MESSAGES, normalizeAdminCode } from "../admin-code-format.js";
export {
  ADMIN_GUARD,
  ADMIN_SESSION_COOKIE,
  createAdminGuard,
  generateAdminCode,
  hashAdminCode,
  verifyAdminCode,
  type AdminGuard,
  type AdminGuardSettings,
  type AdminSignInResult,
} from "./admin.js";
export { ANSWER_MAX_LENGTH, normalizeAnswer } from "../answer-format.js";
export { CODE_ALPHABET, CODE_LENGTH, formatCode, normalizeCode } from "../code-format.js";
export { SECRET_QUESTION_IDS, SECRET_QUESTIONS, getSecretQuestion, type SecretQuestion, type SecretQuestionId } from "../questions.js";
export { hashAnswer, verifyAnswer } from "./answer.js";
export { generateCode, hashCode } from "./code.js";
export {
  RECOVERY_ANSWER_LIMIT,
  SIGN_IN_LIMITS,
  createAttemptLimiter,
  type AttemptLimiter,
  type AttemptLimiterOptions,
  type MemoryAttemptLimiter,
  type AttemptStatus,
} from "./rate-limit.js";
export { SIGN_IN_GUARD, createSignInGuard, limiterKeyForIp, limiterKeyForIp48, type SignInGuard, type SignInGuardSettings } from "./sign-in-guard.js";
export {
  accountCodeSchema,
  createAccountBodySchema,
  oneTimeTokenSchema,
  recoveryAnswerBodySchema,
  recoveryRequestBodySchema,
  secretAnswerSchema,
  signInBodySchema,
  transferBodySchema,
  type CreateAccountBody,
  type RecoveryAnswerBody,
  type RecoveryRequestBody,
  type SignInBody,
  type TransferBody,
} from "./schemas.js";
export {
  RECOVERY_TOKEN_TTL_MS,
  TRANSFER_TOKEN_TTL_MS,
  createOneTimeToken,
  hashToken,
  isTokenUsable,
  type OneTimeToken,
} from "./token.js";
