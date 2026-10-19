import { describe, expect, it } from "vitest";
import { createSignInGuard, limiterKeyForIp } from "./index.js";

describe("limiterKeyForIp", () => {
  it("garde une IPv4, regroupe une IPv6 par /64", () => {
    expect(limiterKeyForIp("203.0.113.5")).toBe("203.0.113.5");
    expect(limiterKeyForIp("::ffff:203.0.113.5")).toBe("203.0.113.5");
    expect(limiterKeyForIp("2001:db8:85a3:12:1:2:3:4")).toBe("2001:db8:85a3:12::/64");
    expect(limiterKeyForIp("2001:db8:85a3:12::99")).toBe("2001:db8:85a3:12::/64");
    expect(limiterKeyForIp("2001:DB8::1")).toBe("2001:db8:0:0::/64");
    expect(limiterKeyForIp("2001:0db8:0000:0012::1")).toBe("2001:db8:0:12::/64");
  });
});

describe("createSignInGuard", () => {
  it("5 essais par adresse, et les adresses d'un même /64 partagent leur compteur", () => {
    const guard = createSignInGuard({ now: () => 0 });
    for (let i = 0; i < 5; i++) expect(guard.attempt(`2001:db8:1:2::${i}`).allowed).toBe(true);
    expect(guard.attempt("2001:db8:1:2::ff").allowed).toBe(false);
    expect(guard.attempt("198.51.100.7").allowed).toBe(true);
  });

  it("une vague de ratés ne bloque personne, mais passe chaque adresse à 1 essai et prévient l'admin", () => {
    let time = 0;
    const alerts: number[] = [];
    const guard = createSignInGuard({ now: () => time, onAttack: (n) => alerts.push(n) });
    for (let i = 0; i < 300; i++) {
      guard.attempt(`10.0.${Math.floor(i / 250)}.${i % 250}`);
      guard.failed();
    }
    expect(guard.cautious()).toBe(true);
    expect(alerts).toEqual([300]);
    // Un vrai joueur, ailleurs, peut toujours essayer : une fois
    expect(guard.attempt("198.51.100.7").allowed).toBe(true);
    expect(guard.attempt("198.51.100.7").allowed).toBe(false);
    // Fin du mode prudence après la fenêtre
    time += 15 * 60 * 1000 + 1;
    expect(guard.cautious()).toBe(false);
  });

  it("une connexion réussie rembourse son essai sans effacer les ratés", () => {
    const guard = createSignInGuard({ now: () => 0 });
    let guesses = 0;
    for (let round = 0; round < 20; round++) {
      if (!guard.attempt("ip").allowed) break;
      guesses++;
      if (!guard.attempt("ip").allowed) break;
      guard.succeed("ip");
    }
    expect(guesses).toBe(5);
  });
});
