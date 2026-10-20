"use client";

import { Bell, BellOff, ChevronDown, CircleAlert, ExternalLink, Settings } from "lucide-react";
import { useState, type ReactNode } from "react";
import { PrimaryButton, QuietButton, SecondaryButton } from "../components/button";
import { Card, CardTitle } from "../components/card";
import { useConfirm } from "../components/confirm-dialog";
import { AccountCodeCard } from "../compte/account-code-card";
import { SaveTransferDialog } from "./save-transfer-dialog";
import type { SettingsAccount, SettingsNotifications, SettingsRestart, SettingsSave } from "./types";

export type SettingsScreenProps = {
  /** Nom court du jeu (« Parent Life »). */
  gameName: string;
  /** Prénom du personnage ou du compagnon, pour les textes. */
  subjectName: string;
  account: SettingsAccount;
  notifications: SettingsNotifications;
  save: SettingsSave;
  restart: SettingsRestart;
  /** Réglages propres au jeu (ex. le prénom du parent), dans la section « Ta partie ». */
  game?: ReactNode;
  /** Version affichée dans « À propos ». */
  version?: string;
};

/** Bouton d'ouverture des réglages : une roue, au même endroit dans les trois jeux (en haut à droite). */
export function SettingsButton({ open, onClick, className = "" }: { open: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label="Réglages"
      aria-pressed={open}
      onClick={onClick}
      className={`flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-terre transition active:translate-y-0.5 ${open ? "bg-sauge text-creme" : "bg-creme text-terre shadow-pose"} ${className}`}
    >
      <Settings aria-hidden className="size-5" />
    </button>
  );
}

function AccountSection({ gameName, subjectName, account }: { gameName: string; subjectName: string; account: SettingsAccount }) {
  if (account.status === "unavailable") return null;
  if (account.status === "connected") {
    return (
      <div className="flex flex-col gap-2">
        <AccountCodeCard gameName={gameName} code={account.code} onSignOut={account.onSignOut} title="Ton compte" />
        {account.syncLine && (
          <p role="status" className="px-2 text-base text-terre-douce">
            {account.syncLine}
          </p>
        )}
      </div>
    );
  }
  return (
    <Card className="gap-3">
      <CardTitle>Ton compte</CardTitle>
      <p>Ton compte n&apos;a pas encore de code. Mets-le à jour pour retrouver {subjectName} sur n&apos;importe quel appareil, avec ce simple code.</p>
      <SecondaryButton onClick={account.onCreate}>Mettre à jour mon compte</SecondaryButton>
      <QuietButton onClick={account.onSignIn} className="self-center">
        J&apos;ai déjà un code
      </QuietButton>
    </Card>
  );
}

function NotificationsSection({ gameName, subjectName, notifications }: { gameName: string; subjectName: string; notifications: SettingsNotifications }) {
  const { support, enabled, busy, error, onEnable, onDisable } = notifications;
  return (
    <Card className="gap-3">
      <div className="flex items-start gap-3">
        {enabled ? <Bell aria-hidden className="mt-1 size-6 shrink-0 text-sauge" /> : <BellOff aria-hidden className="mt-1 size-6 shrink-0 text-terre-douce" />}
        <div className="flex flex-1 flex-col">
          <CardTitle>Notifications</CardTitle>
          <p className="text-base text-terre-douce">
            {enabled ? `Activées sur cet appareil : tu seras prévenu·e quand ${subjectName} aura besoin de toi.` : `Sois prévenu·e quand ${subjectName} a besoin de toi, même appli fermée.`}
          </p>
        </div>
      </div>
      {support === "ok" ? (
        enabled ? (
          <SecondaryButton onClick={onDisable} disabled={busy}>
            {busy ? "Un instant…" : "Désactiver"}
          </SecondaryButton>
        ) : (
          <PrimaryButton onClick={onEnable} disabled={busy}>
            {busy ? "Un instant…" : "Activer les notifications"}
          </PrimaryButton>
        )
      ) : support === "install-first" ? (
        <p className="rounded-champ bg-sable p-3 text-base">
          Sur iPhone, ajoute d&apos;abord {gameName} à ton écran d&apos;accueil (bouton Partager, puis « Sur l&apos;écran d&apos;accueil »), et ouvre-le depuis là.
        </p>
      ) : (
        <p className="rounded-champ bg-sable p-3 text-base">Ce navigateur ne permet pas les notifications.</p>
      )}
      {error && (
        <p role="alert" className="flex items-center gap-2 text-base font-bold">
          <CircleAlert aria-hidden className="size-5 shrink-0 text-corail-tranche" />
          {error}
        </p>
      )}
    </Card>
  );
}

/**
 * L'écran Réglages, identique dans les trois jeux Petite Vie : même ordre, mêmes libellés.
 * Ton compte · Notifications · Ta partie (propre au jeu) · À propos · Sauvegarde · avancé (repliée) · Recommencer de zéro.
 */
export function SettingsScreen({ gameName, subjectName, account, notifications, save, restart, game, version }: SettingsScreenProps) {
  const { confirm, dialog } = useConfirm();
  const [transfer, setTransfer] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-col gap-1 rounded-b-bande bg-bande-sauge px-5 pb-4 pr-16 pt-5">
        <h1 className="font-display text-3xl leading-none">Réglages</h1>
        <p className="text-base text-terre-douce">Ton compte, tes notifications et ta sauvegarde.</p>
      </header>

      <div className="flex flex-col gap-3 px-4">
        <AccountSection gameName={gameName} subjectName={subjectName} account={account} />
        <NotificationsSection gameName={gameName} subjectName={subjectName} notifications={notifications} />

        {game && (
          <Card className="gap-3">
            <CardTitle>Ta partie</CardTitle>
            {game}
          </Card>
        )}


        <Card className="gap-2">
          <CardTitle>À propos</CardTitle>
          <p className="text-base">
            {gameName} est un jeu Petite Vie, de LKSN Games.{version && ` Version ${version}.`}
          </p>
          <p className="text-base text-terre-douce">Ton compte n&apos;a ni adresse e-mail ni mot de passe : seulement ton code. Aucune donnée personnelle n&apos;est gardée.</p>
          <a href="https://lksn.app" target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 self-start font-bold underline underline-offset-4">
            <ExternalLink aria-hidden className="size-4" />
            Tous les jeux LKSN Games
          </a>
        </Card>

        <details className="group rounded-fiche border-2 border-terre/30 bg-creme">
          <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-5 font-bold sans-marqueur">
            Sauvegarde · avancé
            <ChevronDown aria-hidden className="size-5 shrink-0 transition group-open:rotate-180" />
          </summary>
          <div className="flex flex-col gap-3 px-5 pb-5">
            <p className="text-base">Pour jouer sur un autre appareil sans compte : copie ta partie en texte ou en fichier, puis récupère-la là-bas.</p>
            <SecondaryButton onClick={() => setTransfer(true)}>Exporter ou importer</SecondaryButton>
          </div>
        </details>

        <QuietButton
          className="self-center"
          onClick={() => confirm({ title: "Recommencer de zéro ?", text: restart.text, action: "Recommencer", onConfirm: restart.onConfirm })}
        >
          Recommencer de zéro
        </QuietButton>
      </div>

      {transfer && (
        <SaveTransferDialog
          gameName={gameName}
          subjectName={subjectName}
          save={save}
          onClose={() => setTransfer(false)}
          onPicked={(picked) => {
            setTransfer(false);
            confirm({
              title: `Récupérer ${picked.name} ?`,
              text: `${picked.name} remplacera ${subjectName} sur cet appareil.`,
              action: "Récupérer",
              onConfirm: picked.apply,
            });
          }}
        />
      )}
      {dialog}
    </div>
  );
}
