# @petite-vie/ui

La charte commune des jeux Petite Vie — **Parent Life** (v1), **My Life** (v2), **Pet Life** (v3) :
le thème **Tailwind v4** (couleurs, rayons, ombres, animations), les utilitaires (`fond-points`, `points-clairs`, `sans-barre`),
les **composants d'interface** (boutons, fiches, fenêtres, champ de texte, icône dessinée) et les **icônes dessinées** communes.

Extrait de Parent Life (v1) sans rien y changer. Chaque jeu choisit la version qu'il installe : une mise à jour du kit ne casse jamais un jeu tant qu'il ne la prend pas.

## Installer

Dépendance git épinglée sur un tag (pas de build : CSS et TSX source, transpilés par Next) :

```bash
pnpm add github:Lyksia/petite-vie-ui#v0.1.0
```

`next.config.ts` :

```ts
transpilePackages: ["@petite-vie/ui"],
```

## Utiliser

`globals.css` du jeu :

```css
@import "tailwindcss";
@import "@petite-vie/ui/index.css";
/* ou à la carte : theme.css · utilities.css · base.css */
```

Les polices, dans `app/layout.tsx`, avec `next/font` : Nunito Sans sur la variable `--font-nunito-sans` (texte) et Baloo 2 (700) sur `--font-baloo` (titres), posées sur `<html>`.

Composants :

```tsx
import { Card, CardTitle, GameIcon, PrimaryButton, useConfirm } from "@petite-vie/ui";
```

Icônes dessinées : le script du kit les copie dans `public/img/icones` du jeu. Dans `package.json` du jeu :

```json
"predev": "petite-vie-ui-assets",
"prebuild": "petite-vie-ui-assets"
```

Elles s'utilisent ensuite par leur chemin : `<GameIcon src="/img/icones/valeurs/curiosite.webp" />`.

## Ce qui reste propre à chaque jeu

Son nom, son icône d'application, son moteur, ses écrans, ses images (personnages, décors), son service worker et ses clés de stockage. Le kit ne contient que ce qui est commun aux trois.

## Publier une version

Le kit est tenu par la session qui coordonne Petite Vie : une demande d'évolution passe par elle.

1. Modifier, `pnpm typecheck`.
2. Bump `version` dans `package.json`, commit, tag `vX.Y.Z`, push avec le tag.
3. Dans chaque jeu qui veut la nouveauté : `pnpm add github:Lyksia/petite-vie-ui#vX.Y.Z`.
