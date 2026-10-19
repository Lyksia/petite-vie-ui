"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { QuietButton, SecondaryButton } from "../components/button";
import { Card, CardTitle } from "../components/card";
import { useConfirm } from "../components/confirm-dialog";
import { CodeActions } from "./code-actions";
import { CodeDisplay } from "./code-display";

export type AccountCodeCardProps = {
  gameName: string;
  /** Le code gardé sur cet appareil par le jeu (le serveur n'en garde que l'empreinte), ou `null` s'il n'est pas connu ici. */
  code: string | null;
  /** Bouton « Me déconnecter de cet appareil », après confirmation. */
  onSignOut?: () => void;
  title?: string;
};

/** Fiche des réglages : le code du compte, masqué par défaut, à afficher, copier ou partager. */
export function AccountCodeCard({ gameName, code, onSignOut, title = "Ton code de compte" }: AccountCodeCardProps) {
  const [visible, setVisible] = useState(false);
  const { confirm, dialog } = useConfirm();

  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      {code ? (
        <>
          <p>C'est lui qui te permet de retrouver ta partie de {gameName} sur un autre appareil. Garde-le pour toi.</p>
          <CodeDisplay code={code} hidden={!visible} />
          <SecondaryButton aria-pressed={visible} onClick={() => setVisible((shown) => !shown)} className="flex items-center justify-center gap-2">
            {visible ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
            {visible ? "Masquer le code" : "Afficher le code"}
          </SecondaryButton>
          <CodeActions code={code} gameName={gameName} />
        </>
      ) : (
        <p>Ton code n'est pas enregistré sur cet appareil. Si tu l'as noté ailleurs, garde-le précieusement.</p>
      )}
      {onSignOut && (
        <QuietButton
          className="self-center"
          onClick={() =>
            confirm({
              title: "Te déconnecter ?",
              text: "Pour revenir sur cet appareil, il te faudra ton code. Vérifie que tu l'as bien noté.",
              action: "Me déconnecter",
              onConfirm: onSignOut,
            })
          }
        >
          Me déconnecter de cet appareil
        </QuietButton>
      )}
      {dialog}
    </Card>
  );
}
