import { describe, expect, it } from "vitest";
import { SIGN_IN_GUARD, createSignInGuard, limiterKeyForIp, limiterKeyForIp48 } from "./index.js";

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

describe("limiterKeyForIp48", () => {
  it("regroupe une IPv6 par /48 et ne regroupe jamais une IPv4", () => {
    expect(limiterKeyForIp48("2001:db8:85a3:12:1:2:3:4")).toBe("2001:db8:85a3::/48");
    expect(limiterKeyForIp48("2001:db8:85a3:ffff::1")).toBe("2001:db8:85a3::/48");
    expect(limiterKeyForIp48("2001:DB8::1")).toBe("2001:db8:0::/48");
    expect(limiterKeyForIp48("203.0.113.5")).toBeNull();
    expect(limiterKeyForIp48("::ffff:203.0.113.5")).toBeNull();
  });
});

describe("createSignInGuard", () => {
  it("plafonne un bloc /48 à 30 essais, même réparti sur des /64 différents", () => {
    const guard = createSignInGuard({ now: () => 0 });
    let allowed = 0;
    for (let block = 0; block < 100; block++) {
      for (let i = 0; i < 5; i++) if (guard.attempt(`2001:db8:aa:${block.toString(16)}::${i}`).allowed) allowed++;
    }
    expect(allowed).toBe(SIGN_IN_GUARD.perIp48.max);
    // Un autre /48 n'est pas touché
    expect(guard.attempt("2001:db8:bb::1").allowed).toBe(true);
  });

  it("un refus du /48 ne consomme pas l'essai du /64", () => {
    const settings = { ...SIGN_IN_GUARD, perIp48: { max: 1, windowMs: 15 * 60 * 1000 } };
    const guard = createSignInGuard({ settings, now: () => 0 });
    expect(guard.attempt("2001:db8:aa:1::1").allowed).toBe(true);
    expect(guard.attempt("2001:db8:aa:2::1").allowed).toBe(false);
    guard.succeed("2001:db8:aa:1::1"); // rembourse le /64 et le /48
    expect(guard.attempt("2001:db8:aa:2::1").allowed).toBe(true);
  });

  it("un refus au /48 ne crée aucune entrée /64", () => {
    const settings = { ...SIGN_IN_GUARD, perIp48: { max: 1, windowMs: 15 * 60 * 1000 } };
    const guard = createSignInGuard({ settings, now: () => 0 });
    expect(guard.attempt("2001:db8:aa:1::1").allowed).toBe(true);
    for (let block = 2; block < 500; block++) expect(guard.attempt(`2001:db8:aa:${block.toString(16)}::1`).allowed).toBe(false);
    expect(guard.trackedKeys()).toEqual({ perIp: 1, perIp48: 1, cautious: 0 });
  });

  it("en mode prudence, un refus ne crée aucune entrée qu'on rembourserait aussitôt", () => {
    const settings = { ...SIGN_IN_GUARD, attack: { failures: 1, windowMs: 15 * 60 * 1000 } };
    const guard = createSignInGuard({ settings, now: () => 0 });
    guard.failed(); // mode prudence
    expect(guard.attempt("198.51.100.7").allowed).toBe(true);
    expect(guard.attempt("198.51.100.7").allowed).toBe(false);
    expect(guard.trackedKeys()).toEqual({ perIp: 1, perIp48: 0, cautious: 1 });
    expect(guard.attempt("198.51.100.7").allowed).toBe(false);
    expect(guard.trackedKeys()).toEqual({ perIp: 1, perIp48: 0, cautious: 1 });
  });

  it("aucun plafond plus large que l'adresse en IPv4 (NAT d'opérateur)", () => {
    const guard = createSignInGuard({ now: () => 0 });
    for (let host = 1; host <= 100; host++) expect(guard.attempt(`100.64.0.${host}`).allowed).toBe(true);
  });

  it("le mode prudence se déclenche toujours avec les seaux, même si les ratés sont étalés", () => {
    let time = 0;
    const alerts: number[] = [];
    const guard = createSignInGuard({ now: () => time, onAttack: (n) => alerts.push(n) });
    for (let i = 0; i < 300; i++) {
      guard.failed();
      time += 2_000; // 300 ratés en 10 minutes
    }
    expect(guard.cautious()).toBe(true);
    expect(alerts).toEqual([300]);
  });

  it("des ratés trop étalés (moins de 300 par 15 min) ne déclenchent pas le mode prudence", () => {
    let time = 0;
    const guard = createSignInGuard({ now: () => time });
    for (let i = 0; i < 600; i++) {
      guard.failed();
      time += 6_000; // 10 par minute, soit 150 par 15 min
    }
    expect(guard.cautious()).toBe(false);
  });

  it("une inondation d'adresses neuves ne remet pas à zéro une adresse bloquée", () => {
    const settings = { ...SIGN_IN_GUARD, maxKeys: 50 };
    const guard = createSignInGuard({ settings, now: () => 0 });
    for (let i = 0; i < 5; i++) guard.attempt("198.51.100.7");
    for (let i = 0; i < 2000; i++) guard.attempt(`10.${i >> 8}.${i & 255}.1`);
    expect(guard.attempt("198.51.100.7").allowed).toBe(false);
  });

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
