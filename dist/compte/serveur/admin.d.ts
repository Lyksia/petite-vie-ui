/** Nom du cookie de session admin, le même dans les trois jeux. */
export declare const ADMIN_SESSION_COOKIE = "petite-vie-admin";
/** Réglages conseillés de l'accès admin. */
export declare const ADMIN_GUARD: {
    /** Par adresse (IPv6 regroupées par /64) : 5 essais / 15 min. */
    readonly perIp: {
        readonly max: 5;
        readonly windowMs: number;
    };
    /**
     * Toutes adresses confondues : 20 essais / heure. Un seul compte admin, et 100 millions de codes : sans ce plafond,
     * une attaque répartie sur beaucoup d'adresses finirait par trouver. Le prix : une attaque peut bloquer l'accès
     * admin jusqu'à une heure (les sessions déjà ouvertes continuent de marcher). Les joueurs ne sont jamais touchés.
     */
    readonly global: {
        readonly max: 20;
        readonly windowMs: number;
    };
    /** Durée d'une session admin : 12 h. */
    readonly sessionMs: number;
};
export type AdminGuardSettings = {
    perIp: {
        max: number;
        windowMs: number;
    };
    global: {
        max: number;
        windowMs: number;
    };
    sessionMs: number;
};
export type AdminSignInResult = {
    ok: true;
    session: string;
    expiresAt: number;
} | {
    ok: false;
    reason: "invalid-code" | "too-many-attempts";
    retryAfterMs: number;
};
export type AdminGuard = {
    /** Vérifie le code admin saisi. En cas de réussite, renvoie la valeur du cookie de session et son échéance. */
    signIn(code: string, ip: string): Promise<AdminSignInResult>;
    /** La valeur du cookie ouvre-t-elle une session admin valable ? */
    verifySession(session: string | null | undefined): boolean;
};
/** Tire un code admin de 8 chiffres au hasard (générateur cryptographique). */
export declare function generateAdminCode(): string;
/** Empreinte scrypt d'un code admin, à mettre dans `ADMIN_CODE_HASH`. Lève une erreur si ce ne sont pas 8 chiffres. */
export declare function hashAdminCode(code: string): Promise<string>;
/** Compare un code admin saisi à son empreinte (forme à points ou à `$`), à temps constant. */
export declare function verifyAdminCode(code: string, stored: string): Promise<boolean>;
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
export declare function createAdminGuard({ codeHash, sessionSecret, settings, now, }: {
    codeHash: string;
    sessionSecret: string;
    settings?: AdminGuardSettings;
    now?: () => number;
}): AdminGuard;
