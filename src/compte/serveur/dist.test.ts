import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// Le sous-chemin « compte/serveur » est livré compilé dans dist/ (Node ne lit pas le TypeScript de node_modules).
// Ce test recompile et vérifie que dist/ committé correspond bien aux sources : sinon, lancer `pnpm build:serveur`.
const root = join(import.meta.dirname, "../../..");
const out = mkdtempSync(join(tmpdir(), "petite-vie-serveur-"));

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]));

afterAll(() => rmSync(out, { recursive: true, force: true }));

describe("dist/ du sous-chemin serveur", () => {
  it("est à jour avec les sources", () => {
    execFileSync(join(root, "node_modules/.bin/tsc"), ["-p", join(root, "tsconfig.serveur.json"), "--outDir", out]);
    const built = files(out).map((file) => relative(out, file)).sort();
    const committed = files(join(root, "dist")).map((file) => relative(join(root, "dist"), file)).sort();
    expect(committed).toEqual(built);
    for (const file of built) expect(readFileSync(join(root, "dist", file), "utf8"), file).toBe(readFileSync(join(out, file), "utf8"));
  }, 30_000);

  it("se charge dans Node et expose la même chose que les sources", async () => {
    const compiled = await import(join(root, "dist/compte/serveur/index.js"));
    const source = await import("./index.js");
    expect(Object.keys(compiled).sort()).toEqual(Object.keys(source).sort());
    expect(compiled.normalizeCode("k7m-4qx")).toBe("K7M4QX");
  });
});
