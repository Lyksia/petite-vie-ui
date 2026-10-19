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
export declare function createMinuteCounter(windowMs: number, now?: () => number): MinuteCounter;
