"use client";

import { CircleHelp, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { PrimaryButton, QuietButton } from "./button";
import { Dialog, DialogTitle } from "./dialog";

export type ConfirmRequest = {
  title: string;
  text: ReactNode;
  /** Le libellé du bouton qui confirme : « Déménager », « Supprimer »… */
  action: string;
  icon?: LucideIcon | string;
  onConfirm: () => void;
};

/** Une question oui/non dans le jeu, à la place de la boîte du navigateur (bloquée ou laide selon les appareils). */
export function ConfirmDialog({ request, onClose }: { request: ConfirmRequest; onClose: () => void }) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <Dialog labelledBy={titleId}>
      <DialogTitle id={titleId} icon={request.icon ?? CircleHelp}>
        {request.title}
      </DialogTitle>
      <p>{request.text}</p>
      <PrimaryButton
        autoFocus
        onClick={() => {
          onClose();
          request.onConfirm();
        }}
      >
        {request.action}
      </PrimaryButton>
      <QuietButton onClick={onClose} className="self-center">
        Annuler
      </QuietButton>
    </Dialog>
  );
}

/** `confirm(…)` ouvre la question ; `dialog` est à placer dans le rendu du composant. */
export function useConfirm(): { confirm: (request: ConfirmRequest) => void; dialog: ReactNode } {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const close = useCallback(() => setRequest(null), []);
  return { confirm: setRequest, dialog: request && <ConfirmDialog request={request} onClose={close} /> };
}
