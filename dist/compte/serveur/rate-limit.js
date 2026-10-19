/** Limites conseillées pour la connexion par code. */
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
    const current = (key, time) => {
        const entry = entries.get(key);
        if (entry && entry.resetAt <= time) {
            entries.delete(key);
            return undefined;
        }
        return entry;
    };
    const status = (count, resetAt, time) => {
        const allowed = count < max;
        return { allowed, remaining: Math.max(0, max - count), retryAfterMs: allowed ? 0 : resetAt - time };
    };
    const prune = (time) => {
        for (const [key, entry] of entries)
            if (entry.resetAt <= time)
                entries.delete(key);
    };
    const entryFor = (key, time) => {
        let entry = current(key, time);
        if (!entry) {
            if (entries.size >= maxKeys)
                prune(time);
            // Toujours plein : on oublie la plus ancienne clé (le compteur « global » reste le garde-fou).
            if (entries.size >= maxKeys)
                entries.delete(entries.keys().next().value);
            entry = { count: 0, resetAt: time + windowMs };
            entries.set(key, entry);
        }
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
            const entry = current(key, now());
            if (entry && entry.count > 0)
                entry.count--;
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
