#!/usr/bin/env node
// Tire un code admin de 8 chiffres et prépare les variables à mettre dans la configuration d'un jeu.
// Usage : `pnpm exec petite-vie-admin-code` (code tiré au hasard) ou `pnpm exec petite-vie-admin-code 12345678`.
// Le même ADMIN_CODE_HASH peut servir aux trois jeux ; ADMIN_SESSION_SECRET doit être propre à chaque jeu.
import { randomBytes } from "node:crypto";
import { generateAdminCode, hashAdminCode, normalizeAdminCode } from "../dist/compte/serveur/index.js";

const given = process.argv[2];
const code = given === undefined ? generateAdminCode() : normalizeAdminCode(given);
if (!code) {
  console.error("Le code admin doit faire 8 chiffres.");
  process.exit(1);
}

const hash = await hashAdminCode(code);
console.log(`Code admin : ${code.slice(0, 4)} ${code.slice(4)}  (à retenir : il n'est écrit nulle part ailleurs)\n`);
console.log("À mettre dans la configuration du jeu (.env.local en local, variables d'environnement en ligne) :\n");
console.log(`ADMIN_CODE_HASH='${hash}'`);
console.log(`ADMIN_SESSION_SECRET='${randomBytes(32).toString("base64url")}'`);
