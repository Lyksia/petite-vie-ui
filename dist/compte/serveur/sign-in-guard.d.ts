import { type AttemptStatus } from "./rate-limit.js";
/**
 * Clé de limitation d'une adresse : une IPv4 telle quelle, une IPv6 regroupée par bloc /64
 * (un abonné en reçoit souvent un entier : sans regroupement, il changerait d'adresse à chaque essai).
 */
export declare function limiterKeyForIp(ip: string): string;
/** Réglages conseillés pour la connexion par code. */
export declare const SIGN_IN_GUARD: {
    /** Par adresse (IPv6 regroupées par /64) : 5 essais / 15 min. */
    readonly perIp: {
        readonly max: 5;
        readonly windowMs: number;
    };
    /** En mode prudence : 1 essai / 15 min par adresse. */
    readonly perIpCautious: {
        readonly max: 1;
        readonly windowMs: number;
    };
    /** Au-delà de 300 ratés en 15 min, toutes adresses confondues, le mode prudence s'enclenche pour 15 min. */
    readonly attack: {
        readonly failures: 300;
        readonly windowMs: number;
    };
};
export type SignInGuard = {
    /** À appeler AVANT toute recherche : compte l'essai et dit s'il passe. */
    attempt(ip: string): AttemptStatus & {
        cautious: boolean;
    };
    /** Le code était bon : rembourse cet essai (jamais de remise à zéro). */
    succeed(ip: string): void;
    /** Le code était faux : compte le raté pour la détection d'attaque. */
    failed(): void;
    /** Le mode prudence est-il actif ? */
    cautious(): boolean;
};
/**
 * Garde de la connexion par code, sans blocage général : une vague d'essais répartie sur beaucoup d'adresses
 * ne bloque pas les vrais joueurs (un blocage global offrirait un déni de service à bas prix) ; elle fait passer
 * chaque adresse à 1 essai / 15 min et prévient l'admin (`onAttack`), ce qui ralentit d'autant l'attaque.
 * Propre à un processus, comme `createAttemptLimiter`.
 */
export declare function createSignInGuard({ settings, onAttack, now, }?: {
    settings?: typeof SIGN_IN_GUARD;
    onAttack?: (failures: number) => void;
    now?: () => number;
}): SignInGuard;
