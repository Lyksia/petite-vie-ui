"use client";

import { KeyRound } from "lucide-react";
import { PrimaryButton, QuietButton } from "../components/button";

/** Délai avant de reproposer la mise à jour du compte, après « Plus tard » : 3 jours. */
export const ACCOUNT_NOTICE_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

/** Faut-il montrer le rappel ? Oui s'il n'a jamais été repoussé, ou si « Plus tard » date de plus de 3 jours. */
export function accountNoticeDue(dismissedAt: number | null | undefined, now: number): boolean {
  return !dismissedAt || now - dismissedAt >= ACCOUNT_NOTICE_INTERVAL_MS;
}

export type AccountUpdateNoticeProps = {
  gameName: string;
  /** Prénom du personnage ou du compagnon. */
  subjectName: string;
  /** Ouvre la mise à jour du compte (CreateAccount mode="mettre-a-jour", ou le passage sur la nouvelle adresse). */
  onUpdate: () => void;
  /** « Plus tard » : le jeu note l'heure et ne le remontre qu'après ACCOUNT_NOTICE_INTERVAL_MS. */
  onLater: () => void;
};

/**
 * Rappel, dans le jeu, pour un joueur dont le compte n'a pas encore de code conforme (8 caractères) :
 * sans lui, la partie se perd avec l'appareil. Le même dans les trois jeux.
 */
export function AccountUpdateNotice({ gameName, subjectName, onUpdate, onLater }: AccountUpdateNoticeProps) {
  return (
    <section aria-label="Mettre à jour ton compte" className="flex flex-col gap-3 rounded-fiche border-2 border-miel bg-bande-miel p-4 shadow-pose">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-terre bg-creme">
          <KeyRound className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-xl leading-tight">Mets à jour ton compte</h2>
          <p className="text-base">
            Ton compte {gameName} n&apos;a pas encore de code. Sans lui, tu perdrais {subjectName} en changeant d&apos;appareil ou en effaçant tes données.
          </p>
        </div>
      </div>
      <PrimaryButton onClick={onUpdate}>Mettre à jour mon compte</PrimaryButton>
      <QuietButton onClick={onLater} className="self-center">
        Plus tard
      </QuietButton>
    </section>
  );
}
