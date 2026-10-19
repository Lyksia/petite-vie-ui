import { describe, expect, it } from "vitest";
import { createMinuteCounter } from "./minute-counter.js";

describe("createMinuteCounter", () => {
  const MINUTE = 60_000;

  it("compte sur une fenêtre glissante de seaux d'une minute", () => {
    let time = 0;
    const counter = createMinuteCounter(15 * MINUTE, () => time);
    for (let index = 0; index < 10; index++) counter.add();
    time += 5 * MINUTE;
    expect(counter.add()).toBe(11);
    time += 10 * MINUTE; // les 10 premiers sortent de la fenêtre
    expect(counter.total()).toBe(1);
    time += 5 * MINUTE;
    expect(counter.total()).toBe(0);
  });

  it("garde une mémoire constante quel que soit le nombre d'évènements", () => {
    let time = 0;
    const counter = createMinuteCounter(15 * MINUTE, () => time);
    for (let index = 0; index < 100_000; index++) {
      counter.add();
      time += 37; // ~1 h au total : l'anneau tourne plusieurs fois
    }
    expect(counter.total()).toBeLessThanOrEqual(Math.ceil((15 * MINUTE) / 37) + Math.ceil(MINUTE / 37));
    expect(counter.total()).toBeGreaterThan(Math.floor((14 * MINUTE) / 37));
  });

  it("réutilise un seau resté vide d'un tour d'anneau à l'autre", () => {
    let time = 0;
    const counter = createMinuteCounter(2 * MINUTE, () => time);
    counter.add();
    time += 2 * MINUTE; // même seau, un tour plus tard
    expect(counter.add()).toBe(1);
  });

  it("refuse une fenêtre nulle", () => {
    expect(() => createMinuteCounter(0)).toThrow();
  });
});
