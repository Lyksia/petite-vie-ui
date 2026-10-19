const MINUTE = 60_000;
/**
 * Compteur d'évènements sur une fenêtre glissante, par seaux d'une minute : un anneau de `ceil(windowMs / 60 000)`
 * seaux. Mémoire et coût constants quel que soit le nombre d'évènements (pas de tableau d'horodatages qui grossit).
 * Précision à la minute : un évènement compte pendant `windowMs` arrondi à la minute près.
 */
export function createMinuteCounter(windowMs, now = Date.now) {
    if (!(windowMs > 0))
        throw new Error("Compteur : windowMs doit être positif");
    const size = Math.max(1, Math.ceil(windowMs / MINUTE));
    const minutes = new Array(size).fill(-Infinity);
    const counts = new Array(size).fill(0);
    const total = () => {
        const minute = Math.floor(now() / MINUTE);
        let sum = 0;
        for (let slot = 0; slot < size; slot++)
            if (minute - minutes[slot] < size)
                sum += counts[slot];
        return sum;
    };
    return {
        add() {
            const minute = Math.floor(now() / MINUTE);
            const slot = ((minute % size) + size) % size;
            if (minutes[slot] !== minute) {
                minutes[slot] = minute;
                counts[slot] = 0;
            }
            counts[slot] = counts[slot] + 1;
            return total();
        },
        total,
    };
}
