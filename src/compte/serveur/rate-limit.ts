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
   * Une fois plein, les clés expirées sont retirées ; si c'est toujours plein, les clés NOUVELLES partagent un
   * compteur de débordement commun (même `max`, même fenêtre). Aucune clé dont la fenêtre court n'est jamais oubliée.
   */
  maxKeys?: number;
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
 * Mémoire bornée sans faille : quand `maxKeys` clés actives sont suivies, une clé nouvelle n'en chasse aucune
 * (sinon, en inondant de clés neuves, un attaquant remettrait à zéro ses propres compteurs). Elle tombe dans un
 * compteur de débordement commun à toutes les clés nouvelles, de même `max` : on échoue de façon fermée pour
 * elles, sans toucher aux compteurs existants, jusqu'à ce que des fenêtres expirent.
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
  // Compteur commun des clés nouvelles quand la Map est pleine de clés actives
  let overflow: { count: number; resetAt: number } | undefined;

  const current = (key: string, time: number) => {
    const entry = entries.get(key);
    if (entry && entry.resetAt <= time) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  };

  const currentOverflow = (time: number) => {
    if (overflow && overflow.resetAt <= time) overflow = undefined;
    return overflow;
  };

  const status = (count: number, resetAt: number, time: number): AttemptStatus => {
    const allowed = count < max;
    return { allowed, remaining: Math.max(0, max - count), retryAfterMs: allowed ? 0 : resetAt - time };
  };

  // Les clés sont ajoutées dans l'ordre de leur échéance (même fenêtre pour toutes) : on s'arrête à la première
  // encore active, donc le coût ne dépend que du nombre de clés expirées, même sous une inondation de clés neuves.
  const prune = (time: number) => {
    for (const [key, entry] of entries) {
      if (entry.resetAt > time) break;
      entries.delete(key);
    }
  };

  /** Le compteur de la clé : le sien, un neuf s'il reste de la place, sinon le compteur de débordement commun. */
  const entryFor = (key: string, time: number) => {
    const existing = current(key, time);
    if (existing) return existing;
    if (entries.size >= maxKeys) prune(time);
    if (entries.size >= maxKeys) {
      overflow = currentOverflow(time) ?? { count: 0, resetAt: time + windowMs };
      return overflow;
    }
    const entry = { count: 0, resetAt: time + windowMs };
    entries.set(key, entry);
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
      // Seul le compteur propre de la clé est remboursé : le débordement commun ne l'est jamais (échec fermé)
      const entry = current(key, now());
      if (entry && entry.count > 0) entry.count--;
    },
    reset(key) {
      entries.delete(key);
    },
    check(key) {
      const time = now();
      const entry = current(key, time) ?? (entries.size >= maxKeys ? currentOverflow(time) : undefined);
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
