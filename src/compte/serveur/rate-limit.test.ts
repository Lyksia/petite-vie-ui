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

  it("borne la mémoire", () => {
    const { limiter } = setup(3);
    for (const key of ["a", "b", "c", "d"]) limiter.attempt(key);
    expect(limiter.attempt("a").remaining).toBe(4);
    expect(limiter.attempt("d").remaining).toBe(3);
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
});
