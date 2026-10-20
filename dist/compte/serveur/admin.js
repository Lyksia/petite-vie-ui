import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { ADMIN_CODE_LENGTH, normalizeAdminCode } from "../admin-code-format.js";
import { createAttemptLimiter } from "./rate-limit.js";
import { scryptHash, scryptVerify } from "./scrypt.js";
import { limiterKeyForIp } from "./sign-in-guard.js";
/** Nom du cookie de session admin, le même dans les trois jeux. */
export const ADMIN_SESSION_COOKIE = "petite-vie-admin";
/** Réglages conseillés de l'accès admin. */
export const ADMIN_GUARD = {
    /** Par adresse (IPv6 regroupées par /64) : 5 essais / 15 min. */
    perIp: { max: 5, windowMs: 15 * 60 * 1000 },
    /**
     * Toutes adresses confondues : 20 essais / heure. Un seul compte admin, et 100 millions de codes : sans ce plafond,
     * une attaque répartie sur beaucoup d'adresses finirait par trouver. Le prix : une attaque peut bloquer l'accès
     * admin jusqu'à une heure (les sessions déjà ouvertes continuent de marcher). Les joueurs ne sont jamais touchés.
     */
    global: { max: 20, windowMs: 60 * 60 * 1000 },
    /** Durée d'une session admin : 12 h. */
    sessionMs: 12 * 60 * 60 * 1000,
};
/** Tire un code admin de 8 chiffres au hasard (générateur cryptographique). */
export function generateAdminCode() {
    return Array.from({ length: ADMIN_CODE_LENGTH }, () => randomInt(0, 10)).join("");
}
/**
 * L'empreinte d'un code admin s'écrit avec des points (`scrypt.N.r.p.sel.empreinte`) et non des `$` :
 * Next lit `.env*` avec dotenv-expand, qui prend chaque `$` pour une variable, même entre apostrophes.
 * Le sel et l'empreinte sont en base64url, sans point possible. La forme à `$` reste acceptée.
 */
const toEnvForm = (stored) => stored.split("$").join(".");
const fromEnvForm = (stored) => stored.trim().split(".").join("$");
/** Empreinte scrypt d'un code admin, à mettre dans `ADMIN_CODE_HASH`. Lève une erreur si ce ne sont pas 8 chiffres. */
export async function hashAdminCode(code) {
    const normalized = normalizeAdminCode(code);
    if (!normalized)
        throw new Error("Code admin invalide : 8 chiffres attendus");
    return toEnvForm(await scryptHash(normalized));
}
/** Compare un code admin saisi à son empreinte (forme à points ou à `$`), à temps constant. */
export async function verifyAdminCode(code, stored) {
    const normalized = normalizeAdminCode(code);
    if (!normalized)
        return false;
    return scryptVerify(normalized, fromEnvForm(stored));
}
const SESSION_PATTERN = /^v1\.(\d{1,15})\.([\w-]{43})$/;
/**
 * Accès à l'interface admin par code à 8 chiffres, commun aux trois jeux.
 *
 * - `codeHash` : `ADMIN_CODE_HASH`, l'empreinte scrypt du code (jamais le code lui-même).
 * - `sessionSecret` : `ADMIN_SESSION_SECRET`, au moins 32 caractères, propre à chaque jeu.
 *
 * La session est un jeton signé (HMAC-SHA256) qui porte son échéance ; il est lié à l'empreinte du code :
 * changer le code ferme toutes les sessions ouvertes. Les essais sont comptés AVANT la vérification (pas de
 * TOCTOU) ; une réussite ne rembourse que son propre essai.
 * Limiteurs en mémoire, propres à un processus : sur un hébergement à plusieurs instances, chaque instance
 * a ses propres compteurs.
 */
export function createAdminGuard({ codeHash, sessionSecret, settings = ADMIN_GUARD, now = Date.now, }) {
    if (!/^scrypt[.$]\d+[.$]\d+[.$]\d+[.$][\w-]+[.$][\w-]+$/.test(codeHash.trim()))
        throw new Error("ADMIN_CODE_HASH invalide : le générer avec `pnpm exec petite-vie-admin-code`");
    if (sessionSecret.length < 32)
        throw new Error("ADMIN_SESSION_SECRET trop court : 32 caractères au moins");
    const perIp = createAttemptLimiter({ ...settings.perIp, now });
    const everyone = createAttemptLimiter({ ...settings.global, now });
    const sign = (expiresAt) => createHmac("sha256", sessionSecret).update(`petite-vie-admin:v1:${expiresAt}:${fromEnvForm(codeHash)}`).digest("base64url");
    return {
        async signIn(code, ip) {
            const key = limiterKeyForIp(ip);
            // Les deux plafonds sont lus puis comptés dans le même tour synchrone, avant tout await
            const ipStatus = perIp.peek(key);
            const allStatus = everyone.peek("admin");
            if (!ipStatus.allowed || !allStatus.allowed) {
                return { ok: false, reason: "too-many-attempts", retryAfterMs: Math.max(ipStatus.retryAfterMs, allStatus.retryAfterMs) };
            }
            perIp.attempt(key);
            everyone.attempt("admin");
            if (!(await verifyAdminCode(code, codeHash)))
                return { ok: false, reason: "invalid-code", retryAfterMs: 0 };
            perIp.succeed(key);
            everyone.succeed("admin");
            const expiresAt = now() + settings.sessionMs;
            return { ok: true, session: `v1.${expiresAt}.${sign(expiresAt)}`, expiresAt };
        },
        verifySession(session) {
            const match = session?.match(SESSION_PATTERN);
            if (!match)
                return false;
            const expiresAt = Number(match[1]);
            if (!(expiresAt > now()))
                return false;
            const expected = Buffer.from(sign(expiresAt));
            const actual = Buffer.from(match[2]);
            return actual.length === expected.length && timingSafeEqual(actual, expected);
        },
    };
}
