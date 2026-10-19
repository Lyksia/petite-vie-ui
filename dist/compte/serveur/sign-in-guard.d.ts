import { type AttemptStatus } from "./rate-limit.js";
/**
 * Clé de limitation d'une adresse : une IPv4 telle quelle, une IPv6 regroupée par bloc /64
 * (un abonné en reçoit souvent un entier : sans regroupement, il changerait d'adresse à chaque essai).
 */
export declare function limiterKeyForIp(ip: string): string;
/**
 * Clé du bloc IPv6 /48 d'une adresse, ou `null` pour une IPv4.
 * Un abonné reçoit souvent un /48, soit 65 536 blocs /64 : sans ce second plafond, il aurait 5 essais par /64,
 * donc des centaines de milliers d'essais. Rien de plus large pour les IPv4 : derrière un NAT d'opérateur,
 * des milliers d'abonnés partagent une même adresse ou un même /24, et un plafond commun les bloquerait tous.
 */
export declare function limiterKeyForIp48(ip: string): string | null;
/** Réglages conseillés pour la connexion par code. */
export declare const SIGN_IN_GUARD: {
    /** Par adresse (IPv6 regroupées par /64) : 5 essais / 15 min. */
    readonly perIp: {
        readonly max: 5;
        readonly windowMs: number;
    };
    /** Par bloc IPv6 /48, en plus du /64 : 30 essais / 15 min (rien de tel en IPv4, à cause des NAT d'opérateur). */
    readonly perIp48: {
        readonly max: 30;
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
    /**
     * Clés suivies au plus par compteur. Au-delà (une fois les clés expirées retirées), les adresses nouvelles
     * partagent un compteur de débordement commun : aucune adresse active n'est oubliée.
     */
    readonly maxKeys: 100000;
};
export type SignInGuardSettings = {
    perIp: {
        max: number;
        windowMs: number;
    };
    perIp48: {
        max: number;
        windowMs: number;
    };
    perIpCautious: {
        max: number;
        windowMs: number;
    };
    attack: {
        failures: number;
        windowMs: number;
    };
    maxKeys: number;
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
    /** Clés suivies par chaque compteur (surveillance de la mémoire). */
    trackedKeys(): {
        perIp: number;
        perIp48: number;
        cautious: number;
    };
};
/**
 * Garde de la connexion par code, sans blocage général : une vague d'essais répartie sur beaucoup d'adresses
 * ne bloque pas les vrais joueurs (un blocage global offrirait un déni de service à bas prix) ; elle fait passer
 * chaque adresse à 1 essai / 15 min et prévient l'admin (`onAttack`), ce qui ralentit d'autant l'attaque.
 *
 * Plafonds : 5 essais / 15 min par adresse (IPv6 regroupées par /64), plus 30 / 15 min par bloc IPv6 /48.
 * Les ratés, toutes adresses confondues, sont comptés par seaux d'une minute (mémoire constante).
 * Chaque compteur suit au plus `maxKeys` clés (100 000) ; au-delà, les clés nouvelles partagent un compteur
 * de débordement commun, sans jamais oublier une clé active.
 * Propre à un processus, comme `createAttemptLimiter`.
 */
export declare function createSignInGuard({ settings, onAttack, now, }?: {
    settings?: SignInGuardSettings;
    onAttack?: (failures: number) => void;
    now?: () => number;
}): SignInGuard;
