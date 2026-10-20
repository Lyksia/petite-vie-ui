"use client";

import { ArrowLeftRight, CircleAlert } from "lucide-react";
import { useId, useState } from "react";
import { PrimaryButton, QuietButton, SecondaryButton } from "../components/button";
import { Dialog, DialogTitle } from "../components/dialog";
import { TextAreaField } from "../components/text-area-field";
import type { SettingsSave } from "./types";

type Mode = "emporter" | "recuperer";

/**
 * Changer d'appareil : emporter sa partie (texte à copier ou fichier), ou en récupérer une.
 * Le jeu fournit le texte et sa lecture ; ce dialogue est le même dans les trois jeux.
 * `importOnly` : seulement « Récupérer » (écran d'entrée, quand il n'y a encore rien à emporter).
 */
export function SaveTransferDialog({ gameName, subjectName, save, importOnly = false, onPicked, onClose }: {
  gameName: string;
  /** Prénom de la partie en cours ; ignoré avec `importOnly`. */
  subjectName: string;
  save: Pick<SettingsSave, "parse" | "placeholder"> & Partial<Pick<SettingsSave, "exportText" | "fileName">>;
  importOnly?: boolean;
  /** Une sauvegarde lisible a été choisie : le nom de ce qu'elle contient, et de quoi l'appliquer après confirmation. */
  onPicked: (picked: { name: string; apply: () => void }) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const fieldId = useId();
  const canExport = !importOnly && !!save.exportText && !!save.fileName;
  const [mode, setMode] = useState<Mode>(canExport ? "emporter" : "recuperer");
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [text] = useState(() => (canExport ? save.exportText!() : ""));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError("Copie impossible ici : sélectionne le texte et copie-le à la main.");
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = save.fileName!();
    link.click();
    URL.revokeObjectURL(url);
  };

  const read = (input: string) => {
    const result = save.parse(input);
    if ("error" in result) return setError(result.error);
    onPicked(result);
  };

  return (
    <Dialog labelledBy={titleId}>
      <DialogTitle id={titleId} icon={ArrowLeftRight}>
        Changer d&apos;appareil
      </DialogTitle>

      {canExport && (
        <div role="tablist" aria-label="Sens du transfert" className="grid grid-cols-2 gap-1 rounded-full bg-sable p-1">
          {(["emporter", "recuperer"] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => {
                setMode(id);
                setError(undefined);
              }}
              className={`h-11 rounded-full font-extrabold transition ${mode === id ? "bg-creme shadow-pose" : "text-terre-douce"}`}
            >
              {id === "emporter" ? "Emporter" : "Récupérer"}
            </button>
          ))}
        </div>
      )}

      {mode === "emporter" && canExport ? (
        <>
          <p className="text-base">
            Copie ce texte, puis colle-le dans {gameName} sur l&apos;autre appareil, avec « Récupérer ». La partie y arrivera telle quelle, sans rien perdre.
          </p>
          <label htmlFor={fieldId} className="sr-only">
            Sauvegarde de {subjectName}
          </label>
          <textarea
            id={fieldId}
            readOnly
            value={text}
            rows={4}
            onFocus={(event) => event.currentTarget.select()}
            className="min-h-24 break-all rounded-champ border-2 border-terre bg-creme px-3 py-2 font-mono text-sm text-terre outline-none focus:border-sauge"
          />
          <PrimaryButton onClick={copy}>{copied ? "Copié !" : "Copier le texte"}</PrimaryButton>
          <SecondaryButton onClick={download}>Enregistrer dans un fichier</SecondaryButton>
          {error && (
            <p role="alert" className="flex items-center gap-2 text-base font-bold">
              <CircleAlert aria-hidden className="size-5 shrink-0 text-corail-tranche" />
              {error}
            </p>
          )}
        </>
      ) : (
        <>
          <TextAreaField
            id={`${fieldId}-import`}
            label="Le texte de ta sauvegarde"
            value={pasted}
            onChange={(value) => {
              setPasted(value);
              setError(undefined);
            }}
            maxLength={500_000}
            rows={4}
            placeholder={save.placeholder}
            error={error}
            hint={canExport ? `Attention : elle remplacera ${subjectName} sur cet appareil.` : undefined}
          />
          <PrimaryButton onClick={() => read(pasted)}>Récupérer</PrimaryButton>
          <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-bouton border-2 border-sauge bg-sauge-claire px-5 font-bold shadow-relief-sauge">
            Ouvrir un fichier
            <input
              type="file"
              accept=".txt,.json,text/plain,application/json"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) read(await file.text());
              }}
            />
          </label>
        </>
      )}

      <QuietButton onClick={onClose} className="self-center">
        Fermer
      </QuietButton>
    </Dialog>
  );
}
