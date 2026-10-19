import { describe, expect, it } from "vitest";
import { createAttemptLimiter } from "./index.js";

describe("createAttemptLimiter", () => {
  const setup = (maxKeys?: number) => {
    let time = 0;
    const limiter = createAttemptLimiter({ max: 5, windowMs: 15 * 60 * 1000, maxKeys, now: () => time });
    return { limiter, advance: (ms: number) => (time += ms) };
  };

  it("accorde 5 essais puis refuse", () => {
    const { limiter } = setup();
    for (let index = 0; index < 5; index++) expect(limiter.attempt("1.2.3.4").allowed).toBe(true);
    const sixth = limiter.attempt("1.2.3.4");
    expect(sixth.allowed).toBe(false);
    expect(sixth.remaining).toBe(0);
    expect(sixth.retryAfterMs).toBe(15 * 60 * 1000);
  });

  it("ne laisse pas passer plus de max requêtes simultanées (pas de TOCTOU)", async () => {
    const { limiter } = setup();
    const slowLookup = () => new Promise((resolve) => setTimeout(resolve, 5));
    const results = await Promise.all(
      Array.from({ length: 20 }, async () => {
        const status = limiter.attempt("1.2.3.4");
        if (!status.allowed) return false;
        await slowLookup(); // recherche en base : le code est faux, aucun remboursement
        return true;
      }),
    );
    expect(results.filter(Boolean)).toHaveLength(5);
  });

  it("compte chaque clé à part", () => {
    const { limiter } = setup();
    for (let index = 0; index < 5; index++) limiter.attempt("a");
    expect(limiter.attempt("a").allowed).toBe(false);
    expect(limiter.attempt("b")).toEqual({ allowed: true, remaining: 4, retryAfterMs: 0 });
  });

  it("rend les essais à la fin de la fenêtre", () => {
    const { limiter, advance } = setup();
    for (let index = 0; index < 5; index++) limiter.attempt("a");
    advance(10 * 60 * 1000);
    expect(limiter.attempt("a").retryAfterMs).toBe(5 * 60 * 1000);
    advance(5 * 60 * 1000);
    expect(limiter.attempt("a")).toEqual({ allowed: true, remaining: 4, retryAfterMs: 0 });
  });

  it("rembourse un essai réussi avec succeed, repart de zéro avec reset", () => {
    const { limiter } = setup();
    for (let index = 0; index < 5; index++) limiter.attempt("a");
    limiter.succeed("a");
    expect(limiter.attempt("a").allowed).toBe(true);
    expect(limiter.attempt("a").allowed).toBe(false);
    limiter.reset("a");
    expect(limiter.attempt("a").remaining).toBe(4);
  });

  it("ne compte pas les essais refusés (un succeed après refus ne débloque rien de trop)", () => {
    const { limiter } = setup();
    for (let index = 0; index < 10; index++) limiter.attempt("a");
    limiter.succeed("a");
    expect(limiter.attempt("a").allowed).toBe(true);
    expect(limiter.attempt("a").allowed).toBe(false);
  });

  it("rempli de clés nouvelles, ne remet jamais à zéro une clé active", () => {
    const { limiter } = setup(3);
    for (let index = 0; index < 5; index++) limiter.attempt("victime");
    expect(limiter.attempt("victime").allowed).toBe(false);
    // L'attaquant inonde de clés neuves pour chasser « victime » de la Map
    for (let index = 0; index < 1000; index++) limiter.attempt(`neuve-${index}`);
    expect(limiter.attempt("victime").allowed).toBe(false);
  });

  it("évince une clé à zéro avant de déborder, sans toucher aux clés actives", () => {
    const { limiter } = setup(3);
    limiter.attempt("remboursee");
    limiter.succeed("remboursee"); // compteur revenu à 0
    limiter.attempt("b");
    limiter.attempt("c");
    // Map pleine : « d » prend la place de la clé à zéro et obtient son propre compteur (max 5, pas 20)
    expect(limiter.attempt("d")).toEqual({ allowed: true, remaining: 4, retryAfterMs: 0 });
    expect(limiter.size()).toBe(3);
    expect(limiter.attempt("b").remaining).toBe(3);
    expect(limiter.attempt("c").remaining).toBe(3);
  });

  it("déborde par compartiment (max × 4), sans remboursement, quand toutes les clés sont actives", () => {
    const { limiter, advance } = setup(3);
    for (const key of ["a", "b", "c"]) limiter.attempt(key);
    const results = Array.from({ length: 25 }, () => limiter.attempt("nouvelle").allowed);
    expect(results.filter(Boolean)).toHaveLength(20);
    limiter.succeed("nouvelle"); // le débordement n'est jamais remboursé
    expect(limiter.attempt("nouvelle").allowed).toBe(false);
    // Les clés suivies gardent leur propre compteur, intact
    expect(limiter.attempt("a").remaining).toBe(3);
    // Les fenêtres expirent : la place se libère et les clés nouvelles retrouvent leur propre compteur
    advance(15 * 60 * 1000);
    expect(limiter.attempt("nouvelle")).toEqual({ allowed: true, remaining: 4, retryAfterMs: 0 });
  });

  it("une inondation de clés n'empêche pas la plupart des clés nouvelles légitimes de passer", () => {
    const { limiter } = setup(100);
    // L'attaquant sature la Map puis fait tourner 10 000 clés neuves (une par essai, comme une rotation d'adresses)
    for (let index = 0; index < 10_000; index++) limiter.attempt(`attaque-${index}`);
    const legit = Array.from({ length: 500 }, (_, index) => limiter.attempt(`joueur-${index}`).allowed);
    expect(legit.filter(Boolean).length).toBeGreaterThanOrEqual(450);
  });

  it("garde check/fail (dépréciés) pour la compatibilité", () => {
    const { limiter } = setup();
    for (let index = 0; index < 4; index++) expect(limiter.fail("a").allowed).toBe(true);
    expect(limiter.fail("a").allowed).toBe(false);
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(true);
  });

  it("refuse des réglages absurdes", () => {
    expect(() => createAttemptLimiter({ max: 0, windowMs: 1000 })).toThrow();
  });

  it("une connexion réussie n'efface pas les faux essais (succeed rembourse un seul essai)", () => {
    const limiter = createAttemptLimiter({ max: 5, windowMs: 15 * 60 * 1000, now: () => 0 });
    // L'attaquant alterne : un faux code, puis son propre code valide
    let guesses = 0;
    for (let round = 0; round < 20; round++) {
      if (!limiter.attempt("ip").allowed) break;
      guesses++;
      if (!limiter.attempt("ip").allowed) break;
      limiter.succeed("ip");
    }
    expect(guesses).toBe(5);
  });
});
