"use client";

import { MailCheck } from "lucide-react";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { PrimaryButton, QuietButton } from "../components/button";
import { Card, Title } from "../components/card";
import { TextAreaField } from "../components/text-area-field";
import { TextField } from "../components/text-field";
import { FormError } from "./form-error";
import { useSubmit } from "./use-submit";

export type LostCodeInput = { details: string; email: string };

export type LostCodeProps = {
  gameName: string;
  /** Ce qui permet de reconnaître la partie, propre au jeu : « Les prénoms de tes enfants dans le jeu ». */
  detailsLabel: ReactNode;
  detailsHint?: ReactNode;
  detailsPlaceholder?: string;
  /** Envoie la demande à l'API. Lever AccountFormError pour un message précis. */
  onRequest: (input: LostCodeInput) => Promise<void>;
  /** Lien « Retour ». */
  onBack?: () => void;
  title?: string;
};

const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** « J'ai perdu mon code » : une demande vérifiée à la main, réponse par un lien envoyé une fois par e-mail. */
export function LostCode({ gameName, detailsLabel, detailsHint, detailsPlaceholder, onRequest, onBack, title = "J'ai perdu mon code" }: LostCodeProps) {
  const titleId = useId();
  const detailsId = useId();
  const emailId = useId();
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ details?: string; email?: string }>({});
  const [sent, setSent] = useState(false);
  const { pending, error, run } = useSubmit();

  if (sent) {
    return (
      <Card className="gap-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-sauge bg-sauge-claire">
            <MailCheck className="size-5 text-sauge" />
          </span>
          <Title>C'est envoyé</Title>
        </div>
        <p className="text-lg">
          On regarde ta demande à la main. Si on retrouve ta partie de {gameName}, tu recevras un lien par e-mail, valable 24 heures.
        </p>
        <p className="text-lg">Ton adresse sera effacée dès que le lien sera parti.</p>
        {onBack && <PrimaryButton onClick={onBack}>Retour</PrimaryButton>}
      </Card>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = {
      details: details.trim() ? undefined : "Dis-nous au moins une chose qui permet de reconnaître ta partie.",
      email: LOOKS_LIKE_EMAIL.test(email.trim()) ? undefined : "Cette adresse e-mail ne semble pas complète.",
    };
    setErrors(next);
    if (next.details || next.email) return;
    void run(async () => {
      await onRequest({ details: details.trim(), email: email.trim() });
      setSent(true);
    });
  };

  return (
    <Card className="gap-5">
      <form onSubmit={submit} aria-labelledby={titleId} aria-busy={pending} className="flex flex-col gap-5" noValidate>
        <Title id={titleId}>{title}</Title>
        <p className="text-lg">
          Dis-nous ce qui permet de reconnaître ta partie. Si on la retrouve, on t'envoie un lien pour choisir un nouveau code.
        </p>
        <TextAreaField
          id={detailsId}
          label={detailsLabel}
          value={details}
          onChange={setDetails}
          maxLength={500}
          hint={detailsHint}
          placeholder={detailsPlaceholder}
          error={errors.details}
        />
        <TextField
          id={emailId}
          label="Ton adresse e-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={setEmail}
          maxLength={254}
          error={errors.email}
          hint="Elle sert une seule fois, pour t'envoyer le lien, puis elle est effacée."
        />
        <FormError message={error} />
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "Envoi…" : "Envoyer ma demande"}
        </PrimaryButton>
        {onBack && (
          <QuietButton onClick={onBack} className="self-center">
            Retour
          </QuietButton>
        )}
      </form>
    </Card>
  );
}
