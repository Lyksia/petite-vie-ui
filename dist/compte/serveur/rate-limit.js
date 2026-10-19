/** Limites conseillées pour la connexion par code. */
/**
 * @deprecated `global` bloquait tout le monde au-delà de 200 essais (déni de service à bas prix).
 * Utiliser `createSignInGuard` (mode prudence au lieu d'un blocage général).
 */
export const SIGN_IN_LIMITS = {
    perIp: { max: 5, windowMs: 15 * 60 * 1000 },
    global: { max: 200, windowMs: 15 * 60 * 1000 },
};
/** Limite conseillée pour la réponse à la question de récupération : 3 essais, puis blocage 24 h. */
export const RECOVERY_ANSWER_LIMIT = { max: 3, windowMs: 24 * 60 * 60 * 1000 };
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
export function createAttemptLimiter({ max, windowMs, maxKeys = 10_000, now = Date.now }) {
    if (!(max > 0) || !(windowMs > 0))
        throw new Error("Limiteur : max et windowMs doivent être positifs");
    const entries = new Map();
    // Compteur commun des clés nouvelles quand la Map est pleine de clés actives
    let overflow;
    const current = (key, time) => {
        const entry = entries.get(key);
        if (entry && entry.resetAt <= time) {
            entries.delete(key);
            return undefined;
        }
        return entry;
    };
    const currentOverflow = (time) => {
        if (overflow && overflow.resetAt <= time)
            overflow = undefined;
        return overflow;
    };
    const status = (count, resetAt, time) => {
        const allowed = count < max;
        return { allowed, remaining: Math.max(0, max - count), retryAfterMs: allowed ? 0 : resetAt - time };
    };
    // Les clés sont ajoutées dans l'ordre de leur échéance (même fenêtre pour toutes) : on s'arrête à la première
    // encore active, donc le coût ne dépend que du nombre de clés expirées, même sous une inondation de clés neuves.
    const prune = (time) => {
        for (const [key, entry] of entries) {
            if (entry.resetAt > time)
                break;
            entries.delete(key);
        }
    };
    /** Le compteur de la clé : le sien, un neuf s'il reste de la place, sinon le compteur de débordement commun. */
    const entryFor = (key, time) => {
        const existing = current(key, time);
        if (existing)
            return existing;
        if (entries.size >= maxKeys)
            prune(time);
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
            if (entry.count >= max)
                return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - time };
            entry.count++;
            return { allowed: true, remaining: max - entry.count, retryAfterMs: 0 };
        },
        succeed(key) {
            // Seul le compteur propre de la clé est remboursé : le débordement commun ne l'est jamais (échec fermé)
            const entry = current(key, now());
            if (entry && entry.count > 0)
                entry.count--;
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
