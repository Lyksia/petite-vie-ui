import { createMinuteCounter } from "./minute-counter.js";
import { createAttemptLimiter, type AttemptStatus, type MemoryAttemptLimiter } from "./rate-limit.js";

/** Les 8 groupes d'une IPv6 (sans zéros en tête), ou `null` pour une IPv4 (y compris « ::ffff:1.2.3.4 »). */
function ipv6Groups(ip: string): string[] | null {
  const raw = ip.trim().toLowerCase();
  if (!raw.includes(":") || /^::ffff:\d{1,3}(?:\.\d{1,3}){3}$/.test(raw)) return null;
  const [head, tail = ""] = raw.split("::");
  const left = head ? head.split(":") : [];
  const right = raw.includes("::") && tail ? tail.split(":") : [];
  const zeros = Array(Math.max(0, 8 - left.length - right.length)).fill("0");
  return (raw.includes("::") ? [...left, ...zeros, ...right] : left).map((group) => group.replace(/^0+(?=.)/, "") || "0");
}

function ipv4(ip: string): string {
  const raw = ip.trim().toLowerCase();
  return raw.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)?.[1] ?? raw;
}

/**
 * Clé de limitation d'une adresse : une IPv4 telle quelle, une IPv6 regroupée par bloc /64
 * (un abonné en reçoit souvent un entier : sans regroupement, il changerait d'adresse à chaque essai).
 */
export function limiterKeyForIp(ip: string): string {
  const groups = ipv6Groups(ip);
  return groups ? `${groups.slice(0, 4).join(":")}::/64` : ipv4(ip);
}

/**
 * Clé du bloc IPv6 /48 d'une adresse, ou `null` pour une IPv4.
 * Un abonné reçoit souvent un /48, soit 65 536 blocs /64 : sans ce second plafond, il aurait 5 essais par /64,
 * donc des centaines de milliers d'essais. Rien de plus large pour les IPv4 : derrière un NAT d'opérateur,
 * des milliers d'abonnés partagent une même adresse ou un même /24, et un plafond commun les bloquerait tous.
 */
export function limiterKeyForIp48(ip: string): string | null {
  const groups = ipv6Groups(ip);
  return groups ? `${groups.slice(0, 3).join(":")}::/48` : null;
}

/** Réglages conseillés pour la connexion par code. */
export const SIGN_IN_GUARD = {
  /** Par adresse (IPv6 regroupées par /64) : 5 essais / 15 min. */
  perIp: { max: 5, windowMs: 15 * 60 * 1000 },
  /** Par bloc IPv6 /48, en plus du /64 : 30 essais / 15 min (rien de tel en IPv4, à cause des NAT d'opérateur). */
  perIp48: { max: 30, windowMs: 15 * 60 * 1000 },
  /** En mode prudence : 1 essai / 15 min par adresse. */
  perIpCautious: { max: 1, windowMs: 15 * 60 * 1000 },
  /** Au-delà de 300 ratés en 15 min, toutes adresses confondues, le mode prudence s'enclenche pour 15 min. */
  attack: { failures: 300, windowMs: 15 * 60 * 1000 },
  /**
   * Clés suivies au plus par compteur. Au-delà (une fois les clés expirées retirées), les adresses nouvelles
   * partagent un compteur de débordement commun : aucune adresse active n'est oubliée.
   */
  maxKeys: 100_000,
} as const;

export type SignInGuardSettings = {
  perIp: { max: number; windowMs: number };
  perIp48: { max: number; windowMs: number };
  perIpCautious: { max: number; windowMs: number };
  attack: { failures: number; windowMs: number };
  maxKeys: number;
};

export type SignInGuard = {
  /** À appeler AVANT toute recherche : compte l'essai et dit s'il passe. */
  attempt(ip: string): AttemptStatus & { cautious: boolean };
  /** Le code était bon : rembourse cet essai (jamais de remise à zéro). */
  succeed(ip: string): void;
  /** Le code était faux : compte le raté pour la détection d'attaque. */
  failed(): void;
  /** Le mode prudence est-il actif ? */
  cautious(): boolean;
  /** Clés suivies par chaque compteur (surveillance de la mémoire). */
  trackedKeys(): { perIp: number; perIp48: number; cautious: number };
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
export function createSignInGuard({
  settings = SIGN_IN_GUARD,
  onAttack,
  now = Date.now,
}: { settings?: SignInGuardSettings; onAttack?: (failures: number) => void; now?: () => number } = {}): SignInGuard {
  const { maxKeys } = settings;
  const normal: MemoryAttemptLimiter = createAttemptLimiter({ ...settings.perIp, maxKeys, now });
  const block48: MemoryAttemptLimiter = createAttemptLimiter({ ...settings.perIp48, maxKeys, now });
  const careful: MemoryAttemptLimiter = createAttemptLimiter({ ...settings.perIpCautious, maxKeys, now });
  const failures = createMinuteCounter(settings.attack.windowMs, now);
  let cautiousUntil = 0;
  const cautious = () => now() < cautiousUntil;
  return {
    attempt(ip) {
      const key = limiterKeyForIp(ip);
      const wide = limiterKeyForIp48(ip);
      const strict = cautious();
      // 1. Vérifier tous les plafonds SANS rien créer ni compter : un refus ne laisse aucune entrée à 0
      //    (sinon une inondation remplirait les compteurs à vide). Tout est synchrone : pas de TOCTOU.
      const perAddress = normal.peek(key);
      if (!perAddress.allowed) return { ...perAddress, cautious: strict };
      if (wide) {
        const block = block48.peek(wide);
        if (!block.allowed) return { ...block, cautious: strict };
      }
      if (strict) {
        const tight = careful.peek(key);
        if (!tight.allowed) return { ...tight, cautious: true };
      }
      // 2. Tout passe : compter partout. Le compteur normal compte toujours (pas de remise à zéro en fin de prudence).
      const status = normal.attempt(key);
      if (wide) block48.attempt(wide);
      if (strict) careful.attempt(key);
      return { ...status, cautious: strict };
    },
    succeed(ip) {
      const key = limiterKeyForIp(ip);
      normal.succeed(key);
      const wide = limiterKeyForIp48(ip);
      if (wide) block48.succeed(wide);
      careful.succeed(key);
    },
    failed() {
      const total = failures.add();
      if (total >= settings.attack.failures && !cautious()) {
        cautiousUntil = now() + settings.attack.windowMs;
        onAttack?.(total);
      }
    },
    cautious,
    trackedKeys: () => ({ perIp: normal.size(), perIp48: block48.size(), cautious: careful.size() }),
  };
}
