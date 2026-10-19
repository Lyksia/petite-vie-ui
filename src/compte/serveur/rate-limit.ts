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
  /** Rembourse un essai accordé par `attempt` (réussite qui ne doit pas peser, ex. sur le compteur global). */
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
  /** Au-delà, les clés expirées sont purgées (protège la mémoire). Défaut : 10 000. */
  maxKeys?: number;
  /** Horloge, pour les tests. */
  now?: () => number;
};

/** Limites conseillées pour la connexion par code. */
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
 * ```ts
 * if (!perIp.attempt(ip).allowed || !everyone.attempt("global").allowed) return c.json({ error: "trop-d-essais" }, 429);
 * const account = await findAccount(code); // l'essai est déjà compté
 * if (account) { perIp.succeed(ip); everyone.succeed("global"); } // rembourse cet essai, les ratés restent comptés
 * ```
 */
export function createAttemptLimiter({ max, windowMs, maxKeys = 10_000, now = Date.now }: AttemptLimiterOptions): AttemptLimiter {
  if (!(max > 0) || !(windowMs > 0)) throw new Error("Limiteur : max et windowMs doivent être positifs");
  const entries = new Map<string, { count: number; resetAt: number }>();

  const current = (key: string, time: number) => {
    const entry = entries.get(key);
    if (entry && entry.resetAt <= time) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  };

  const status = (count: number, resetAt: number, time: number): AttemptStatus => {
    const allowed = count < max;
    return { allowed, remaining: Math.max(0, max - count), retryAfterMs: allowed ? 0 : resetAt - time };
  };

  const prune = (time: number) => {
    for (const [key, entry] of entries) if (entry.resetAt <= time) entries.delete(key);
  };

  const entryFor = (key: string, time: number) => {
    let entry = current(key, time);
    if (!entry) {
      if (entries.size >= maxKeys) prune(time);
      // Toujours plein : on oublie la plus ancienne clé (le compteur « global » reste le garde-fou).
      if (entries.size >= maxKeys) entries.delete(entries.keys().next().value as string);
      entry = { count: 0, resetAt: time + windowMs };
      entries.set(key, entry);
    }
    return entry;
  };

  return {
    attempt(key) {
      const time = now();
      const entry = entryFor(key, time);
      if (entry.count >= max) return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - time };
      entry.count++;
      return { allowed: true, remaining: max - entry.count, retryAfterMs: 0 };
    },
    succeed(key) {
      const entry = current(key, now());
      if (entry && entry.count > 0) entry.count--;
    },
    reset(key) {
      entries.delete(key);
    },
    check(key) {
      const time = now();
      const entry = current(key, time);
      return entry ? status(entry.count, entry.resetAt, time) : status(0, time + windowMs, time);
    },
    fail(key) {
      const time = now();
      const entry = entryFor(key, time);
      entry.count++;
      return status(entry.count, entry.resetAt, time);
    },
  };
}
