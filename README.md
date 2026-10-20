# @petite-vie/ui

La charte commune des jeux Petite Vie — **Parent Life** (v1), **Life Story** (v2), **Pet Life** (v3) :
le thème **Tailwind v4** (couleurs, rayons, ombres, animations), les utilitaires (`fond-points`, `points-clairs`, `sans-barre`),
les **composants d'interface** (boutons, fiches, fenêtres, champ de texte, icône dessinée) et les **icônes dessinées** communes.

Extrait de Parent Life (v1) sans rien y changer. Chaque jeu choisit la version qu'il installe : une mise à jour du kit ne casse jamais un jeu tant qu'il ne la prend pas.

## Installer

Dépendance git épinglée sur un tag (pas de build : CSS et TSX source, transpilés par Next) :

```bash
pnpm add github:Lyksia/petite-vie-ui#v0.5.5
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

## Compte

Un compte commun aux trois jeux dans sa forme (chacun garde sa propre API et sa propre base) :
**un code de 8 caractères**, tiré par le serveur, sans e-mail ni donnée personnelle stockée.

- Alphabet sans caractères ambigus (`23456789ABCDEFGHJKMNPQRSTUVWXYZ`, ni 0/O ni 1/I/L) : 31⁸ ≈ 852 milliards de codes (6 caractères jusqu'à la v0.2 : les codes existants doivent être migrés par chaque jeu).
- Affiché en deux blocs de 4, `K7M4 QXT2`, saisi n'importe comment (`k7m4-qxt2`, `K7M4QXT2`, ` k7m4 qxt2 `).
- À la création : une question secrète (liste commune) et une réponse libre.
- « J'ai perdu mon code » : demande vérifiée à la main dans la vitrine, lien de récupération par e-mail (24 h, usage unique), question secrète (3 essais), nouveau code.
- Jeton de transfert (15 min, usage unique) pour connecter directement un joueur qui arrive d'une autre adresse.

### Côté jeu : `@petite-vie/ui/compte`

Écrans clients, sans aucun appel réseau : ils reçoivent des callbacks async et des libellés.
Pour un refus attendu (code inconnu, trop d'essais…), le callback lève `AccountFormError(message)` : le message s'affiche tel quel.
Toute autre erreur affiche « Ça n'a pas marché. Vérifie ta connexion et réessaie. ».

```tsx
"use client";
import { ACCOUNT_MESSAGES, AccountFormError, CreateAccount, LostCode, Recover, SignIn, AccountCodeCard } from "@petite-vie/ui/compte";

<CreateAccount
  gameName="Parent Life"
  onCreate={async ({ questionId, answer }) => {
    const res = await fetch(`${API}/compte`, { method: "POST", body: JSON.stringify({ questionId, answer }) });
    if (!res.ok) throw new Error();
    return res.json(); // { code }
  }}
  onDone={(code) => saveCodeLocally(code)}
  onSignInInstead={() => router.push("/compte/connexion")}
/>

<SignIn
  gameName="Parent Life"
  onSignIn={async (code) => {
    const res = await fetch(`${API}/compte/connexion`, { method: "POST", body: JSON.stringify({ code }) });
    if (res.status === 404) throw new AccountFormError(ACCOUNT_MESSAGES.unknownCode);
    if (res.status === 429) throw new AccountFormError(ACCOUNT_MESSAGES.tooManyAttempts);
    if (!res.ok) throw new Error();
  }}
  onLostCode={() => router.push("/compte/perdu")}
/>

<LostCode
  gameName="Parent Life"
  detailsLabel="Les prénoms de ta famille dans le jeu"
  detailsHint="Les parents, les enfants : tout ce dont tu te souviens."
  onRequest={({ details, email }) => post("/compte/recuperation", { details, email })}
/>

// Page du lien /compte/recuperer?jeton=… : le jeu lit la question avec le jeton, puis
<Recover
  gameName="Parent Life"
  questionId={questionId /* null si le lien n'est plus valable */}
  onRecover={(answer) => post("/compte/recuperation/reponse", { token, answer })} // → RecoverResult
  onDone={(code) => saveCodeLocally(code)}
/>

// Réglages : le code gardé sur l'appareil (le serveur n'en a que l'empreinte)
<AccountCodeCard gameName="Parent Life" code={storedCode} onSignOut={signOut} />
```

| Composant | Callbacks | Libellés propres au jeu |
| --- | --- | --- |
| `CreateAccount` | `onCreate({ questionId, answer }) → { code }`, `onDone(code)`, `onSignInInstead?` | `gameName`, `title?`, `intro?` |
| `SignIn` | `onSignIn(code)` (code déjà normalisé), `onLostCode?`, `onCreateInstead?` | `gameName`, `title?`, `intro?` |
| `LostCode` | `onRequest({ details, email })`, `onBack?` | `gameName`, `detailsLabel`, `detailsHint?`, `detailsPlaceholder?`, `title?` |
| `Recover` | `onRecover(answer) → RecoverResult`, `onDone(code)`, `onLostCode?` | `gameName`, `questionId`, `locked?`, `title?` |
| `AccountCodeCard` | `onSignOut?` (après confirmation) | `gameName`, `code`, `title?` |

`RecoverResult` : `{ status: "ok", code }` · `{ status: "wrong", attemptsLeft }` · `{ status: "locked" }` · `{ status: "expired" }`.

Le module exporte aussi les fonctions pures utiles au client : `formatCode`, `normalizeCode`, `normalizeAnswer`, `SECRET_QUESTIONS`, `getSecretQuestion`, `CodeDisplay`.
Le kit ajoute `TextAreaField` aux composants communs, et `TextField` accepte désormais `hint`, `type`, `inputMode`, `autoCapitalize`, `spellCheck` et `inputClassName` (facultatifs).

### Côté API : `@petite-vie/ui/compte/serveur`

Logique pure Node (`node:crypto`, sans React ni Next), **livrée compilée** dans `dist/` : elle s'importe depuis une API Hono compilée par `tsc` et lancée par `node`.
Les schémas demandent `zod` (v4), en dépendance facultative : les API l'ont déjà. Toutes les dépendances « pairs » du kit (next, react, lucide-react, tailwindcss, zod) sont facultatives : une API n'installe rien de React ou de Next.

```ts
import {
  createAccountBodySchema, signInBodySchema, recoveryRequestBodySchema, recoveryAnswerBodySchema, transferBodySchema,
  generateCode, hashCode, hashAnswer, verifyAnswer,
  createOneTimeToken, hashToken, isTokenUsable, RECOVERY_TOKEN_TTL_MS, TRANSFER_TOKEN_TTL_MS,
  createSignInGuard, RECOVERY_ANSWER_LIMIT,
} from "@petite-vie/ui/compte/serveur";

const PEPPER = process.env.ACCOUNT_CODE_PEPPER; // secret de l'API, jamais en base
// 5 essais / 15 min par adresse (IPv6 regroupées par /64), et 30 / 15 min par bloc IPv6 /48 ;
// au-delà de 300 ratés en 15 min toutes adresses confondues,
// « mode prudence » : 1 essai / 15 min par adresse et alerte. Jamais de blocage général (déni de service).
const guard = createSignInGuard({ onAttack: (n) => alertAdmin(`${n} codes faux en 15 min`) });

// Création
app.post("/compte", async (c) => {
  const body = createAccountBodySchema.parse(await c.req.json());
  const code = generateCode(); // en cas de collision d'empreinte (contrainte unique), retirer un code
  await db.account.create({ data: { codeHash: hashCode(code, PEPPER), questionId: body.questionId, answerHash: await hashAnswer(body.answer) } });
  return c.json({ code }); // seul moment où le code clair quitte le serveur
});

// Connexion
app.post("/compte/connexion", async (c) => {
  const ip = clientIp(c);
  // attempt() compte l'essai TOUT DE SUITE, avant le moindre await : des requêtes simultanées ne passent pas toutes.
  if (!guard.attempt(ip).allowed) return c.json({ error: "trop-d-essais" }, 429);
  const { code } = signInBodySchema.parse(await c.req.json());
  const account = await db.account.findUnique({ where: { codeHash: hashCode(code, PEPPER) } });
  if (!account) { guard.failed(); return c.json({ error: "inconnu" }, 404); } // l'essai est déjà compté
  guard.succeed(ip); // réussite : rembourse cet essai seulement, les ratés restent comptés
  // … ouvrir la session du jeu
});
```

Fonctions :

| Export | Rôle |
| --- | --- |
| `generateCode()` | Nouveau code canonique de 8 caractères (`K7M4QXT2`), tiré avec `crypto.randomInt`. |
| `normalizeCode(saisie)` / `formatCode(code)` | Forme canonique ou `null` / affichage `K7M4 QXT2`. |
| `hashCode(code, pepper?)` | sha256 hex du code normalisé ; HMAC-SHA256 si un `pepper` est donné (conseillé). |
| `normalizeAnswer(réponse)` | Minuscules, sans accents ni ligatures, ponctuation retirée, espaces réduits. |
| `hashAnswer(réponse)` / `verifyAnswer(réponse, stockée)` | scrypt (N=16384, r=8, p=1, sel 16 octets) ; comparaison à temps constant. Format `scrypt$N$r$p$sel$empreinte`. |
| `createOneTimeToken(ttlMs, now?)` | `{ token, tokenHash, expiresAt }` : 32 octets aléatoires en base64url ; seul `tokenHash` va en base. |
| `hashToken(token)` / `isTokenUsable({ expiresAt, usedAt }, now?)` | Retrouver un jeton par empreinte ; vérifier qu'il n'a ni servi ni expiré. |
| `createAttemptLimiter({ max, windowMs, maxKeys?, overflowBuckets?, overflowFactor? })` | Limiteur d'essais en mémoire. **`attempt(key)`** compte l'essai de façon atomique et dit s'il passe ; `succeed(key)` rembourse l'essai réussi ; `reset(key)` efface tout (admin, tests), jamais après une réussite. `check`/`fail` sont dépréciés (faille TOCTOU, voir plus bas). Interface `AttemptLimiter` remplaçable (Redis `INCR`, base), à condition que `attempt` reste atomique. La version en mémoire ajoute `peek(key)` (état sans rien créer, à suivre de l'`attempt` dans le même tour synchrone) et `size()`. |
| `createSignInGuard({ settings?, onAttack? })` | Garde de connexion : `attempt(ip)`, `succeed(ip)`, `failed()`, `cautious()`, `trackedKeys()`. Réglages dans `SIGN_IN_GUARD` (`perIp`, `perIp48`, `perIpCautious`, `attack`, `maxKeys` = 100 000). |
| `limiterKeyForIp(ip)` / `limiterKeyForIp48(ip)` | Clé par adresse (IPv4 telle quelle, IPv6 par /64) / clé du bloc IPv6 /48 (`null` en IPv4). |
| `SECRET_QUESTIONS`, `SECRET_QUESTION_IDS`, `getSecretQuestion(id)` | Les 7 questions communes. Ne jamais retirer ni renommer un `id`. |
| Schémas zod | `createAccountBodySchema`, `signInBodySchema`, `recoveryRequestBodySchema`, `recoveryAnswerBodySchema`, `transferBodySchema`, et les briques `accountCodeSchema`, `secretAnswerSchema`, `oneTimeTokenSchema`. |

### Récupération, pas à pas

1. Le joueur envoie `{ details, email }` → `RecoveryRequest` en attente (l'adresse est gardée le temps de la réponse).
2. L'admin rapproche `details` d'un compte dans sa vitrine et valide → `createOneTimeToken(RECOVERY_TOKEN_TTL_MS)`,
   `OneTimeToken { purpose: "recovery", tokenHash, accountId, expiresAt }`, envoi du lien `…/compte/recuperer?jeton=<token>`,
   puis **effacement de l'adresse** (`email = null`). Refus : effacer l'adresse aussi.
3. Page du lien : l'API cherche le jeton par `hashToken`, vérifie `isTokenUsable` et `lockedUntil`, renvoie `questionId`.
4. Réponse : **compter l'essai en base AVANT `verifyAnswer`**, par une mise à jour conditionnelle atomique ; sinon des réponses
   envoyées en même temps passent toutes avant que le compteur ne bouge.

   ```ts
   const { token, answer } = recoveryAnswerBodySchema.parse(await c.req.json());
   const now = new Date();
   const where = { tokenHash: hashToken(token), purpose: "recovery", usedAt: null, expiresAt: { gt: now } };
   const counted = await db.oneTimeToken.updateMany({
     where: { ...where, attempts: { lt: RECOVERY_ANSWER_LIMIT.max }, OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] },
     data: { attempts: { increment: 1 } },
   });
   if (counted.count === 0) return c.json(await lockedOrExpired(token)); // { status: "locked" } ou { status: "expired" }
   const row = await db.oneTimeToken.findUniqueOrThrow({ where: { tokenHash: hashToken(token) }, include: { account: true } });
   if (!(await verifyAnswer(answer, row.account.answerHash))) {
     if (row.attempts >= RECOVERY_ANSWER_LIMIT.max)
       await db.oneTimeToken.update({ where: { id: row.id }, data: { lockedUntil: new Date(now.getTime() + RECOVERY_ANSWER_LIMIT.windowMs) } });
     const attemptsLeft = RECOVERY_ANSWER_LIMIT.max - row.attempts;
     return c.json(attemptsLeft > 0 ? { status: "wrong", attemptsLeft } : { status: "locked" });
   }
   // Juste → transaction : usedAt posé seulement s'il est encore null (updateMany … count === 1), nouveau code, codeHash remplacé.
   ```

   Une fois les 3 essais consommés, le lien reste bloqué jusqu'à son expiration (24 h au plus) : l'admin peut en envoyer un neuf.
   Juste → dans une transaction : `usedAt` posé sur le jeton (seulement s'il était encore `null`), nouveau code (`generateCode`),
   `codeHash` remplacé (l'ancien code ne marche plus).

Transfert (déménagement de Parent Life) : l'ancienne adresse crée `createOneTimeToken(TRANSFER_TOKEN_TTL_MS)` pour le compte et redirige avec le jeton ;
la nouvelle le valide (`transferBodySchema`, `hashToken`, `isTokenUsable`), pose `usedAt` et ouvre la session.

### Tables conseillées (Prisma)

À recopier dans le schéma de chaque API, à adapter (le kit ne fournit pas de fichier Prisma) :

```prisma
model Account {
  id         String   @id @default(cuid())
  codeHash   String   @unique // hashCode(code, pepper) — jamais le code clair
  questionId String            // id de SECRET_QUESTIONS
  answerHash String            // hashAnswer(réponse) : scrypt$…
  createdAt  DateTime @default(now())
  tokens     OneTimeToken[]
  recoveries RecoveryRequest[]
}

model RecoveryRequest {
  id         String    @id @default(cuid())
  details    String             // texte libre du joueur (prénoms…)
  email      String?            // effacé dès le lien envoyé ou la demande refusée
  status     String    @default("pending") // pending | sent | refused
  accountId  String?            // rempli par l'admin à la validation
  account    Account?  @relation(fields: [accountId], references: [id], onDelete: Cascade)
  createdAt  DateTime  @default(now())
  resolvedAt DateTime?
}

model OneTimeToken {
  id          String    @id @default(cuid())
  purpose     String             // recovery | transfer
  tokenHash   String    @unique  // hashToken(token)
  accountId   String
  account     Account   @relation(fields: [accountId], references: [id], onDelete: Cascade)
  expiresAt   DateTime
  usedAt      DateTime?
  attempts    Int       @default(0) // réponses ratées (récupération)
  lockedUntil DateTime?             // 3 ratés → maintenant + 24 h
  createdAt   DateTime  @default(now())

  @@index([accountId])
}
```

### Règles de sécurité

- **Rien de clair en base** : ni code (`hashCode`), ni réponse (`hashAnswer`), ni jeton (`hashToken`). Le code clair n'est renvoyé qu'à la création et à la récupération.
- **Poivre conseillé** : même avec 852 milliards de codes, un sha256 nu se teste hors ligne, sans limite d'essais, si la base fuite. `hashCode(code, process.env.ACCOUNT_CODE_PEPPER)` l'empêche ; le poivre ne doit jamais changer (sinon plus aucun code ne se retrouve).
- **Compter avant de chercher** : `attempt()` (via `createSignInGuard`) avant tout `await`, puis `succeed` en cas de réussite (jamais `reset` : avec son propre code valide, un attaquant effacerait ses faux essais entre deux connexions et devinerait sans fin). Jamais `check()` → recherche async → `fail()` : N requêtes simultanées passeraient toutes le `check` avant le moindre `fail` (TOCTOU), c'est pourquoi `check`/`fail` sont dépréciés. Le limiteur fourni vit en mémoire d'un seul processus ; une API sur plusieurs instances le remplace par une implémentation partagée et atomique de l'interface `AttemptLimiter`.
- **Adresses IPv6** : un abonné reçoit souvent un /48, soit 65 536 blocs /64. Le /64 seul lui laisserait 5 essais par bloc ; le garde ajoute donc un plafond de 30 essais / 15 min par /48 (`SIGN_IN_GUARD.perIp48`). **Rien de plus large en IPv4** : derrière un NAT d'opérateur (CGNAT), des milliers d'abonnés partagent une adresse ou un /24, et un plafond commun bloquerait de vrais joueurs ; la vague d'essais répartie est prise en charge par le mode prudence.
- **Mémoire bornée, sans éviction d'une clé active** : chaque compteur suit au plus `maxKeys` clés (100 000 pour le garde, 10 000 par défaut pour `createAttemptLimiter`). Quand c'est plein, une clé nouvelle prend la place d'une clé expirée, puis d'une clé dont le compteur est à 0 (remboursée ou jamais comptée, tenue dans un ensemble à part : pas de parcours complet). Une clé qui a des essais en cours n'est jamais oubliée : sinon, en inondant de clés neuves, un attaquant remettrait ses propres compteurs à zéro. Si toutes les clés sont actives, la clé nouvelle tombe dans un compartiment de débordement choisi par empreinte FNV-1a de la clé, salée par une graine secrète tirée au hasard à la création du limiteur (un attaquant ne peut pas viser un compartiment), parmi `overflowBuckets` = 1 024 ; plafonné à `max × overflowFactor` (4 ; 1 pour le mode prudence, qui reste à 1 essai par fenêtre même en débordement) et jamais remboursé. **Compromis** : le débordement échoue de façon fermée, mais il est réparti ; une inondation ne bloque pas tous les nouveaux joueurs d'un coup, chacun ne partage son compteur qu'avec ~1/1 024 des autres clés nouvelles. Limite connue : un attaquant capable d'envoyer environ `1 024 × max × 4` essais par fenêtre (≈ 20 000 pour 5 essais) depuis des adresses toutes différentes peut saturer tous les compartiments ; il déclenche bien avant le mode prudence et l'alerte. Le garde vérifie tous ses plafonds (/64, /48, prudence) sans rien créer avant de compter : un refus ne laisse aucune entrée à 0 derrière lui. `trackedKeys()` donne le nombre de clés suivies par compteur. Les ratés globaux (mode prudence) sont comptés par seaux d'une minute : mémoire et coût constants.
- **Même réponse pour « code inconnu »** quelle que soit la cause, et pas de route qui dise si un code existe sans compter l'essai.
- **Jetons** : 32 octets aléatoires, usage unique (`usedAt` posé dans la même transaction que l'action), 24 h pour la récupération, 15 min pour le transfert. Ne jamais les journaliser.
- **Question secrète** : 3 essais par lien, comptés en base par une mise à jour conditionnelle **avant** `verifyAnswer`, puis blocage ; la vérification est lente (scrypt) et à temps constant.
- **E-mail** : utilisé une seule fois, effacé dès l'envoi du lien (ou le refus). Ne pas le journaliser.
- **Côté appareil** : le jeu garde le code dans son stockage local pour l'afficher dans `AccountCodeCard` ; il ne le met jamais dans une URL.

## Réglages

**Un seul écran Réglages pour les trois jeux** (`@petite-vie/ui/reglages`) : même roue d'ouverture, même ordre, mêmes libellés.
Le jeu ne fournit que ses données et ses actions.

Ordre : **Ton compte · Notifications · Ta partie** (réglages propres au jeu, facultatif) **· À propos · Sauvegarde · avancé** (repliée : export et import) **· Recommencer de zéro.**

```tsx
import { SettingsButton, SettingsScreen } from "@petite-vie/ui/reglages";

// En haut à droite de chaque onglet ; un nouvel appui ramène au jeu.
<SettingsButton open={tab === "reglages"} onClick={() => setTab(tab === "reglages" ? "jour" : "reglages")} />

<SettingsScreen
  gameName="Pet Life"
  subjectName={companion.name}
  account={connected ? { status: "connected", code, onSignOut, syncLine } : { status: "signed-out", onCreate, onSignIn }}
  notifications={{ support, enabled, busy, error, onEnable, onDisable }}
  save={{ exportText, fileName, parse, placeholder: "PETLIFE1.…" }}
  restart={{ text: `${companion.name} retournera à l'animalerie.`, onConfirm: restart }}
  game={<ParentField />} // facultatif
  version="1.0.0"
/>
```

- `account` : `connected` (code ou `null` s'il n'est pas gardé ici, déconnexion confirmée par le kit, ligne d'état de la sauvegarde
  en ligne), `signed-out` (« Mettre à jour mon compte » : le joueur a déjà une partie, il lui ajoute un code ; ou « J'ai déjà un code »), ou `unavailable` (pas d'API : section cachée).
- `notifications` : obligatoires dans les trois jeux. `support` = `ok`, `install-first` (iPhone : ajouter à l'écran d'accueil)
  ou `unsupported`.
- `save.parse(text)` rend `{ error }` ou `{ name, apply }` : le kit demande « Récupérer {name} ? » avant d'appeler `apply`.
- La confirmation « Recommencer de zéro ? » est faite par le kit avec `restart.text`.
- Écran d'entrée (« J'ai déjà une partie », sans compte) : `<SaveTransferDialog importOnly save={{ parse, placeholder }} … />` n'affiche que « Récupérer ».

## Accès admin

L'admin commune aux trois jeux (petite-vie-admin.lksn.app, dossier `web-admin/`) s'ouvre avec **un code de 8 chiffres** (`1234 5678`).
Les jeux n'ont pas de page admin à eux : l'admin commune les gère par leurs API.
Le code n'est écrit nulle part : la configuration du jeu n'en garde que l'empreinte scrypt.

**Tirer le code** (depuis `web-admin/`, ou tout dossier qui a installé le kit) :

```bash
pnpm exec petite-vie-admin-code            # code tiré au hasard
pnpm exec petite-vie-admin-code 12345678   # ou un code choisi
```

La commande affiche le code et deux variables, à mettre dans `.env.local` (et dans les variables d'environnement en ligne) :

- `ADMIN_CODE_HASH` : l'empreinte du code.
- `ADMIN_SESSION_SECRET` : la clé qui signe les sessions.

L'empreinte s'écrit avec des points (`scrypt.16384.8.1.…`), sans `$` : Next lit `.env*` avec dotenv-expand, qui prendrait chaque `$` pour une variable (empreinte tronquée, admin fermé). Une ancienne empreinte à `$` reste acceptée si les `$` sont échappés.

Changer de code = relancer la commande et remplacer `ADMIN_CODE_HASH` : toutes les sessions ouvertes se ferment.

| Côté | Ce que fournit le kit |
|---|---|
| Écran (`@petite-vie/ui/compte`) | `AdminCodeGate({ gameName, onSubmit, illustration? })` : saisie tolérante (`1234 5678`, `1234-5678`), clavier numérique. `onSubmit` reçoit le code normalisé ; lever `AccountFormError(ADMIN_MESSAGES.wrongCode)` ou `ADMIN_MESSAGES.tooManyAttempts` pour un refus. |
| Serveur (`@petite-vie/ui/compte/serveur`) | `createAdminGuard({ codeHash, sessionSecret })` → `signIn(code, ip)` et `verifySession(cookie)`. `ADMIN_SESSION_COOKIE` (`petite-vie-admin`), `ADMIN_GUARD` (réglages), `hashAdminCode`, `verifyAdminCode`, `generateAdminCode`, `normalizeAdminCode`. |

Limites : 5 essais / 15 min par adresse, et **20 essais / heure toutes adresses confondues** (avec 100 millions de codes, c'est ce
plafond qui rend une attaque répartie sans espoir). Le prix : une attaque peut bloquer l'accès admin jusqu'à une heure ; les sessions
déjà ouvertes et les joueurs ne sont pas touchés. Session : 12 h, jeton signé (HMAC) lié au code. Compteurs en mémoire, par processus.

Branchement dans l'admin (Next.js) :

```ts
// src/features/admin/guard.ts
import "server-only";
import { createAdminGuard, type AdminGuard } from "@petite-vie/ui/compte/serveur";

let guard: AdminGuard | undefined;
/** Créé au premier usage (pas au build), une fois par processus : les compteurs d'essais y vivent. */
export function getAdminGuard(): AdminGuard {
  guard ??= createAdminGuard({ codeHash: process.env.ADMIN_CODE_HASH ?? "", sessionSecret: process.env.ADMIN_SESSION_SECRET ?? "" });
  return guard;
}

export async function isAdmin(): Promise<boolean> {
  return getAdminGuard().verifySession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
}
```

```ts
// src/features/admin/enter.ts
"use server";
export async function enterAdmin(code: string): Promise<"ok" | "wrong-code" | "too-many-attempts"> {
  // Seulement l'adresse posée par l'hébergeur (Vercel écrase x-real-ip) : jamais x-forwarded-for, que le client peut écrire
  const ip = (await headers()).get("x-real-ip") ?? "inconnue";
  const result = await getAdminGuard().signIn(code, ip);
  if (!result.ok) return result.reason === "invalid-code" ? "wrong-code" : "too-many-attempts";
  (await cookies()).set(ADMIN_SESSION_COOKIE, result.session, {
    httpOnly: true, sameSite: "strict", path: "/", secure: process.env.NODE_ENV === "production", expires: new Date(result.expiresAt),
  });
  return "ok";
}
```

La page `/admin` affiche `AdminCodeGate` tant que `isAdmin()` est faux (puis `router.refresh()` après `"ok"`).
**Chaque action et chaque route admin revérifie `isAdmin()`** : cacher l'écran ne protège rien. Se déconnecter = supprimer le cookie.

## Ce qui reste propre à chaque jeu

Son nom, son icône d'application, son moteur, ses écrans, ses images (personnages, décors), son service worker et ses clés de stockage. Le kit ne contient que ce qui est commun aux trois.

## Passer de la v0.2 à la v0.3

**Changement incompatible** : les codes font désormais 8 caractères (`CODE_LENGTH = 8`, affichage `K7M4 QXT2`).
`normalizeCode`, `hashCode` et `signInBodySchema` refusent les anciens codes à 6 caractères : un jeu qui en a déjà
distribué doit les migrer (nouveau code pour chaque compte, à remettre au joueur) avant de prendre cette version.

## Publier une version

Le kit est tenu par la session qui coordonne Petite Vie : une demande d'évolution passe par elle.

1. Modifier, `pnpm typecheck` et `pnpm test`. Si `src/compte/serveur` (ou un fichier qu'il importe) a changé : `pnpm build:serveur` et committer `dist/`.
2. Bump `version` dans `package.json`, commit, tag `vX.Y.Z`, push avec le tag.
3. Dans chaque jeu qui veut la nouveauté : `pnpm add github:Lyksia/petite-vie-ui#vX.Y.Z`.
