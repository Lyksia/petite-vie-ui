#!/usr/bin/env node
// Copie les icônes dessinées du kit dans public/img/icones du jeu qui l'installe (avant dev et build).
// N'écrase que les fichiers du kit : les icônes propres au jeu restent intactes.
import { cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const source = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "icones");
const target = join(process.cwd(), "public", "img", "icones");

if (!existsSync(source)) {
  console.error("@petite-vie/ui : icônes introuvables dans le kit.");
  process.exit(1);
}
cpSync(source, target, { recursive: true, force: true });
console.log("@petite-vie/ui : icônes copiées dans public/img/icones");
