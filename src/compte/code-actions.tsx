"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { SecondaryButton } from "../components/button";
import { formatCode } from "./code-format";

/** Boutons « Copier » et « Partager » (si l'appareil sait partager) pour un code de compte. */
export function CodeActions({ code, gameName }: { code: string; gameName: string }) {
  const [canShare, setCanShare] = useState(false);
  const [notice, setNotice] = useState("");
  const readable = formatCode(code);

  useEffect(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(readable);
      setNotice("Code copié.");
    } catch {
      setNotice("Copie impossible ici : recopie-le à la main.");
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: `Mon code ${gameName}`, text: `Mon code ${gameName} : ${readable}` });
    } catch {
      // Partage annulé : rien à dire.
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3">
        <SecondaryButton onClick={copy} className="flex flex-1 items-center justify-center gap-2">
          {notice === "Code copié." ? <Check aria-hidden className="size-5" /> : <Copy aria-hidden className="size-5" />}
          Copier
        </SecondaryButton>
        {canShare && (
          <SecondaryButton onClick={share} className="flex flex-1 items-center justify-center gap-2">
            <Share2 aria-hidden className="size-5" />
            Partager
          </SecondaryButton>
        )}
      </div>
      <p aria-live="polite" className="min-h-6 text-base text-terre-douce">
        {notice}
      </p>
    </div>
  );
}
