import { randomInt } from "node:crypto";
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
 * Empreinte FNV-1a 32 bits d'une chaîne, salée par une graine tirée au hasard à la création du limiteur :
 * sert seulement à répartir, mais un attaquant ne peut pas viser un compartiment précis.
 */
function fnv1a(text, seed) {
    let hash = (0x811c9dc5 ^ seed) >>> 0;
    for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}
export function createAttemptLimiter({ max, windowMs, maxKeys = 10_000, overflowBuckets = 1024, overflowFactor = 4, now = Date.now, }) {
    if (!(max > 0) || !(windowMs > 0))
        throw new Error("Limiteur : max et windowMs doivent être positifs");
    if (!(maxKeys > 0) || !(overflowBuckets > 0) || !(overflowFactor > 0))
        throw new Error("Limiteur : réglages de mémoire invalides");
    const entries = new Map();
    // Clés suivies dont le compteur est à 0 : évincées en premier, sans parcourir la Map
    const zeroKeys = new Set();
    // Compartiments de débordement, créés à la demande
    const buckets = new Map();
    const overflowLimit = Math.max(max, Math.floor(max * overflowFactor));
    // Graine secrète, propre à ce limiteur : la répartition des clés dans les compartiments est imprévisible
    const seed = randomInt(0, 2 ** 32);
    const forget = (key) => {
        entries.delete(key);
        zeroKeys.delete(key);
    };
    const setCount = (key, entry, count) => {
        entry.count = count;
        if (count === 0)
            zeroKeys.add(key);
        else
            zeroKeys.delete(key);
    };
    const current = (key, time) => {
        const entry = entries.get(key);
        if (entry && entry.resetAt <= time) {
            forget(key);
            return undefined;
        }
        return entry;
    };
    // Les clés sont ajoutées dans l'ordre de leur échéance (même fenêtre pour toutes) : on s'arrête à la première
    // encore active, donc le coût ne dépend que du nombre de clés expirées, même sous une inondation de clés neuves.
    const prune = (time) => {
        for (const [key, entry] of entries) {
            if (entry.resetAt > time)
                break;
            forget(key);
        }
    };
    /** Fait de la place si possible (expirées, puis une clé à 0). Renvoie `false` si la Map reste pleine. */
    const makeRoom = (time, evict) => {
        if (entries.size < maxKeys)
            return true;
        prune(time);
        if (entries.size < maxKeys)
            return true;
        const zero = zeroKeys.values().next();
        if (zero.done)
            return false;
        if (evict)
            forget(zero.value);
        return true;
    };
    const bucketFor = (key, time, create) => {
        const index = fnv1a(key, seed) % overflowBuckets;
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
    const entryFor = (key, time) => {
        const existing = current(key, time);
        if (existing)
            return { counter: existing, own: true };
        if (makeRoom(time, true)) {
            const entry = { count: 0, resetAt: time + windowMs, limit: max };
            entries.set(key, entry);
            zeroKeys.add(key);
            return { counter: entry, own: true };
        }
        return { counter: bucketFor(key, time, true), own: false };
    };
    const status = (count, limit, resetAt, time) => {
        const allowed = count < limit;
        return { allowed, remaining: Math.max(0, limit - count), retryAfterMs: allowed ? 0 : resetAt - time };
    };
    const peek = (key) => {
        const time = now();
        const existing = current(key, time);
        if (existing)
            return status(existing.count, existing.limit, existing.resetAt, time);
        if (makeRoom(time, false))
            return status(0, max, time + windowMs, time);
        const bucket = bucketFor(key, time, false);
        return bucket ? status(bucket.count, bucket.limit, bucket.resetAt, time) : status(0, overflowLimit, time + windowMs, time);
    };
    return {
        attempt(key) {
            const time = now();
            const { counter, own } = entryFor(key, time);
            if (counter.count >= counter.limit)
                return { allowed: false, remaining: 0, retryAfterMs: counter.resetAt - time };
            if (own)
                setCount(key, counter, counter.count + 1);
            else
                counter.count++;
            return { allowed: true, remaining: counter.limit - counter.count, retryAfterMs: 0 };
        },
        succeed(key) {
            // Seul le compteur propre de la clé est remboursé : le débordement ne l'est jamais (échec fermé)
            const entry = current(key, now());
            if (entry && entry.count > 0)
                setCount(key, entry, entry.count - 1);
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
            if (own)
                setCount(key, counter, counter.count + 1);
            else
                counter.count++;
            return status(counter.count, counter.limit, counter.resetAt, time);
        },
    };
}
