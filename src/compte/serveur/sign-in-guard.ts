import { createAttemptLimiter, type AttemptLimiter, type AttemptStatus } from "./rate-limit.js";

/**
 * Clé de limitation d'une adresse : une IPv4 telle quelle, une IPv6 regroupée par bloc /64
 * (un abonné en reçoit souvent un entier : sans regroupement, il changerait d'adresse à chaque essai).
 */
export function limiterKeyForIp(ip: string): string {
  const raw = ip.trim().toLowerCase();
  const mapped = raw.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped?.[1]) return mapped[1];
  if (!raw.includes(":")) return raw;
  const [head, tail = ""] = raw.split("::");
  const left = head ? head.split(":") : [];
  const right = raw.includes("::") && tail ? tail.split(":") : [];
  const zeros = Array(Math.max(0, 8 - left.length - right.length)).fill("0");
  const groups = (raw.includes("::") ? [...left, ...zeros, ...right] : left).map((group) => group.replace(/^0+(?=.)/, "") || "0");
  return `${groups.slice(0, 4).join(":")}::/64`;
}

/** Réglages conseillés pour la connexion par code. */
export const SIGN_IN_GUARD = {
  /** Par adresse (IPv6 regroupées par /64) : 5 essais / 15 min. */
  perIp: { max: 5, windowMs: 15 * 60 * 1000 },
  /** En mode prudence : 1 essai / 15 min par adresse. */
  perIpCautious: { max: 1, windowMs: 15 * 60 * 1000 },
  /** Au-delà de 300 ratés en 15 min, toutes adresses confondues, le mode prudence s'enclenche pour 15 min. */
  attack: { failures: 300, windowMs: 15 * 60 * 1000 },
} as const;

export type SignInGuard = {
  /** À appeler AVANT toute recherche : compte l'essai et dit s'il passe. */
  attempt(ip: string): AttemptStatus & { cautious: boolean };
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
export function createSignInGuard({
  settings = SIGN_IN_GUARD,
  onAttack,
  now = Date.now,
}: { settings?: typeof SIGN_IN_GUARD; onAttack?: (failures: number) => void; now?: () => number } = {}): SignInGuard {
  const normal: AttemptLimiter = createAttemptLimiter({ ...settings.perIp, now });
  const careful: AttemptLimiter = createAttemptLimiter({ ...settings.perIpCautious, now });
  let failures: number[] = [];
  let cautiousUntil = 0;
  const cautious = () => now() < cautiousUntil;
  return {
    attempt(ip) {
      const key = limiterKeyForIp(ip);
      const strict = cautious();
      // Le compteur normal compte toujours : à la fin du mode prudence, on ne repart pas de zéro
      const status = normal.attempt(key);
      if (!status.allowed) return { ...status, cautious: strict };
      if (strict) {
        const tight = careful.attempt(key);
        if (!tight.allowed) {
          normal.succeed(key);
          return { ...tight, cautious: true };
        }
      }
      return { ...status, cautious: strict };
    },
    succeed(ip) {
      const key = limiterKeyForIp(ip);
      normal.succeed(key);
      careful.succeed(key);
    },
    failed() {
      const time = now();
      failures = failures.filter((at) => time - at < settings.attack.windowMs);
      failures.push(time);
      if (failures.length >= settings.attack.failures && !cautious()) {
        cautiousUntil = time + settings.attack.windowMs;
        onAttack?.(failures.length);
      }
    },
    cautious,
  };
}
