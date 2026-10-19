export type AttemptStatus = {
  /** `attempt` : `true` si cet essai entre dans la limite. `check`/`fail` : `true` s'il reste des essais. */
  allowed: boolean;
  remaining: number;
  /** Temps avant de pouvoir réessayer (0 si autorisé). */
  retryAfterMs: number;
};

/**
 * Ce que l'API attend d'un limiteur : l'implémentation en mémoire ci-dessous, ou une autre (Redis, base…).
 *
 * Seul usage sûr : `attempt(key)` AVANT tout `await`, puis `succeed(key)` en cas de réussite (rembourse cet essai seulement).
 * Ne jamais `reset` une clé après une réussite : avec son propre code valide, on effacerait ses faux essais et on devinerait sans fin.
 * Une autre implémentation doit garder `attempt` atomique (ex. `INCR` Redis, `UPDATE … RETURNING` en base).
 */
export type AttemptLimiter = {
  /**
   * Compte l'essai tout de suite, de façon atomique, et dit s'il est autorisé. Un essai refusé n'est pas compté.
   * À appeler avant toute vérification asynchrone : N requêtes simultanées ne peuvent pas dépasser `max`.
   */
  attempt(key: string): AttemptStatus;
  /**
   * Rembourse un essai accordé par `attempt` (réussite qui ne doit pas peser). Sans effet sur une clé passée par
   * le compteur de débordement commun : celui-ci n'est jamais remboursé.
   */
  succeed(key: string): void;
  /**
   * Efface tout le compteur d'une clé (outil d'admin, tests).
   * Jamais après une réussite : les faux essais de la même clé seraient effacés avec (contournement de la limite).
   */
  reset(key: string): void;
  /**
   * État d'une clé sans rien compter.
   * @deprecated Faille TOCTOU : `check()` → appel base async → `fail()` laisse N requêtes simultanées passer
   * toutes le `check` avant le moindre `fail`. Utiliser `attempt()`.
   */
  check(key: string): AttemptStatus;
  /**
   * Compte un essai raté et renvoie l'état après coup.
   * @deprecated Compte trop tard (après l'appel async) : contournable par la concurrence. Utiliser `attempt()`.
   */
  fail(key: string): AttemptStatus;
};

export type AttemptLimiterOptions = {
  /** Nombre d'essais acceptés dans la fenêtre. */
  max: number;
  /** Durée de la fenêtre, à partir du premier essai compté. */
  windowMs: number;
  /**
   * Nombre maximal de clés suivies (protège la mémoire). Défaut : 10 000.
   * Une fois plein : on retire les clés expirées, puis on évince une clé dont le compteur est à 0 ; sinon la clé
   * nouvelle tombe dans un compartiment de débordement choisi par empreinte de la clé. Aucune clé active
   * (compteur > 0, fenêtre en cours) n'est jamais oubliée.
   */
  maxKeys?: number;
  /** Nombre de compartiments de débordement (répartis par empreinte FNV-1a de la clé). Défaut : 1 024. */
  overflowBuckets?: number;
  /** Plafond d'un compartiment de débordement, en multiple de `max`. Défaut : 4. */
  overflowFactor?: number;
  /** Horloge, pour les tests. */
  now?: () => number;
};

/** Limites conseillées pour la connexion par code. */
/**
 * @deprecated `global` bloquait tout le monde au-delà de 200 essais (déni de service à bas prix).
 * Utiliser `createSignInGuard` (mode prudence au lieu d'un blocage général).
 */
export const SIGN_IN_LIMITS = {
  perIp: { max: 5, windowMs: 15 * 60 * 1000 },
  global: { max: 200, windowMs: 15 * 60 * 1000 },
} as const;

/** Limite conseillée pour la réponse à la question de récupération : 3 essais, puis blocage 24 h. */
export const RECOVERY_ANSWER_LIMIT = { max: 3, windowMs: 24 * 60 * 60 * 1000 } as const;

/**
 * Limiteur d'essais en mémoire, à fenêtre fixe par clé : `max` essais accordés par `attempt`, puis refus jusqu'à
 * la fin de la fenêtre ouverte par le premier essai. `attempt` est synchrone, donc atomique dans un processus Node.
 * Propre à un processus : une API sur plusieurs instances doit le remplacer.
 *
 * Mémoire bornée, sans éviction d'une clé active : quand `maxKeys` clés sont suivies, une clé nouvelle prend
 * d'abord la place d'une clé expirée, puis d'une clé dont le compteur est à 0 (remboursée par `succeed`, ou jamais
 * comptée) : en oublier une ne rend aucun essai à personne. Si toutes les clés suivies ont des essais en cours,
 * aucune n'est chassée (sinon, en inondant de clés neuves, un attaquant remettrait ses propres compteurs à zéro) :
 * la clé nouvelle tombe dans l'un des `overflowBuckets` compartiments de débordement, choisi par empreinte de la
 * clé, plafonné à `max × overflowFactor` et jamais remboursé.
 *
 * Compromis : le débordement échoue de façon fermée, mais il est réparti. Une inondation qui sature la Map ne
 * bloque pas tous les nouveaux joueurs d'un coup : chacun ne partage son compteur qu'avec ~1/1 024 des autres
 * clés nouvelles, et retrouve un compteur propre dès que des fenêtres expirent ou que des clés reviennent à 0.
 *
 * ```ts
 * if (!perIp.attempt(ip).allowed || !everyone.attempt("global").allowed) return c.json({ error: "trop-d-essais" }, 429);
 * const account = await findAccount(code); // l'essai est déjà compté
 * if (account) { perIp.succeed(ip); everyone.succeed("global"); } // rembourse cet essai, les ratés restent comptés
 * ```
 */
/** Limiteur en mémoire : l'interface commune, plus `peek` pour enchaîner plusieurs limiteurs sans rien créer à vide. */
export type MemoryAttemptLimiter = AttemptLimiter & {
  /**
   * État qu'aurait `attempt(key)` maintenant, sans rien créer ni compter. Sûr uniquement s'il est suivi, dans le
   * même tour synchrone (sans `await` entre les deux), de l'`attempt` correspondant.
   */
  peek(key: string): AttemptStatus;
  /** Nombre de clés suivies avec leur propre compteur (surveillance de la mémoire). */
  size(): number;
};

type Counter = { count: number; resetAt: number; limit: number };

/** Empreinte FNV-1a 32 bits d'une chaîne (rapide, non cryptographique : sert seulement à répartir). */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function createAttemptLimiter({
  max,
  windowMs,
  maxKeys = 10_000,
  overflowBuckets = 1024,
  overflowFactor = 4,
  now = Date.now,
}: AttemptLimiterOptions): MemoryAttemptLimiter {
  if (!(max > 0) || !(windowMs > 0)) throw new Error("Limiteur : max et windowMs doivent être positifs");
  if (!(maxKeys > 0) || !(overflowBuckets > 0) || !(overflowFactor > 0)) throw new Error("Limiteur : réglages de mémoire invalides");
  const entries = new Map<string, Counter>();
  // Clés suivies dont le compteur est à 0 : évincées en premier, sans parcourir la Map
  const zeroKeys = new Set<string>();
  // Compartiments de débordement, créés à la demande
  const buckets = new Map<number, Counter>();
  const overflowLimit = Math.max(max, Math.floor(max * overflowFactor));

  const forget = (key: string) => {
    entries.delete(key);
    zeroKeys.delete(key);
  };

  const setCount = (key: string, entry: Counter, count: number) => {
    entry.count = count;
    if (count === 0) zeroKeys.add(key);
    else zeroKeys.delete(key);
  };

  const current = (key: string, time: number) => {
    const entry = entries.get(key);
    if (entry && entry.resetAt <= time) {
      forget(key);
      return undefined;
    }
    return entry;
  };

  // Les clés sont ajoutées dans l'ordre de leur échéance (même fenêtre pour toutes) : on s'arrête à la première
  // encore active, donc le coût ne dépend que du nombre de clés expirées, même sous une inondation de clés neuves.
  const prune = (time: number) => {
    for (const [key, entry] of entries) {
      if (entry.resetAt > time) break;
      forget(key);
    }
  };

  /** Fait de la place si possible (expirées, puis une clé à 0). Renvoie `false` si la Map reste pleine. */
  const makeRoom = (time: number, evict: boolean) => {
    if (entries.size < maxKeys) return true;
    prune(time);
    if (entries.size < maxKeys) return true;
    const zero = zeroKeys.values().next();
    if (zero.done) return false;
    if (evict) forget(zero.value);
    return true;
  };

  const bucketFor = (key: string, time: number, create: boolean): Counter | undefined => {
    const index = fnv1a(key) % overflowBuckets;
    let bucket = buckets.get(index);
    if (bucket && bucket.resetAt <= time) {
      buckets.delete(index);
      bucket = undefined;
    }
    if (!bucket && create) {
      bucket = { count: 0, resetAt: time + windowMs, limit: overflowLimit };
      buckets.set(index, bucket);
    }
    return bucket;
  };

  /** Le compteur de la clé : le sien, un neuf s'il y a (ou s'il se fait) de la place, sinon son compartiment de débordement. */
  const entryFor = (key: string, time: number): { counter: Counter; own: boolean } => {
    const existing = current(key, time);
    if (existing) return { counter: existing, own: true };
    if (makeRoom(time, true)) {
      const entry = { count: 0, resetAt: time + windowMs, limit: max };
      entries.set(key, entry);
      zeroKeys.add(key);
      return { counter: entry, own: true };
    }
    return { counter: bucketFor(key, time, true) as Counter, own: false };
  };

  const status = (count: number, limit: number, resetAt: number, time: number): AttemptStatus => {
    const allowed = count < limit;
    return { allowed, remaining: Math.max(0, limit - count), retryAfterMs: allowed ? 0 : resetAt - time };
  };

  const peek = (key: string): AttemptStatus => {
    const time = now();
    const existing = current(key, time);
    if (existing) return status(existing.count, existing.limit, existing.resetAt, time);
    if (makeRoom(time, false)) return status(0, max, time + windowMs, time);
    const bucket = bucketFor(key, time, false);
    return bucket ? status(bucket.count, bucket.limit, bucket.resetAt, time) : status(0, overflowLimit, time + windowMs, time);
  };

  return {
    attempt(key) {
      const time = now();
      const { counter, own } = entryFor(key, time);
      if (counter.count >= counter.limit) return { allowed: false, remaining: 0, retryAfterMs: counter.resetAt - time };
      if (own) setCount(key, counter, counter.count + 1);
      else counter.count++;
      return { allowed: true, remaining: counter.limit - counter.count, retryAfterMs: 0 };
    },
    succeed(key) {
      // Seul le compteur propre de la clé est remboursé : le débordement ne l'est jamais (échec fermé)
      const entry = current(key, now());
      if (entry && entry.count > 0) setCount(key, entry, entry.count - 1);
    },
    reset(key) {
      forget(key);
    },
    peek,
    size: () => entries.size,
    check: peek,
    fail(key) {
      const time = now();
      const { counter, own } = entryFor(key, time);
      if (own) setCount(key, counter, counter.count + 1);
      else counter.count++;
      return status(counter.count, counter.limit, counter.resetAt, time);
    },
  };
}
