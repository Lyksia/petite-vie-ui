const MINUTE = 60_000;

export type MinuteCounter = {
  /** Compte un évènement maintenant et renvoie le total sur la fenêtre glissante. */
  add(): number;
  /** Total sur la fenêtre glissante, sans rien compter. */
  total(): number;
};

/**
 * Compteur d'évènements sur une fenêtre glissante, par seaux d'une minute : un anneau de `ceil(windowMs / 60 000)`
 * seaux. Mémoire et coût constants quel que soit le nombre d'évènements (pas de tableau d'horodatages qui grossit).
 * Précision à la minute : un évènement compte pendant `windowMs` arrondi à la minute près.
 */
export function createMinuteCounter(windowMs: number, now: () => number = Date.now): MinuteCounter {
  if (!(windowMs > 0)) throw new Error("Compteur : windowMs doit être positif");
  const size = Math.max(1, Math.ceil(windowMs / MINUTE));
  const minutes = new Array<number>(size).fill(-Infinity);
  const counts = new Array<number>(size).fill(0);

  const total = () => {
    const minute = Math.floor(now() / MINUTE);
    let sum = 0;
    for (let slot = 0; slot < size; slot++) if (minute - (minutes[slot] as number) < size) sum += counts[slot] as number;
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
      counts[slot] = (counts[slot] as number) + 1;
      return total();
    },
    total,
  };
}
