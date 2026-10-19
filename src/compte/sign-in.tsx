"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { PrimaryButton, QuietButton } from "../components/button";
import { Card, Title } from "../components/card";
import { TextField } from "../components/text-field";
import { ACCOUNT_MESSAGES } from "./account-error";
import { normalizeCode } from "./code-format";
import { FormError } from "./form-error";
import { useSubmit } from "./use-submit";

export type SignInProps = {
  gameName: string;
  /** Reçoit le code déjà normalisé (« K7M4QXT2 »). Lever AccountFormError(ACCOUNT_MESSAGES.unknownCode…) si refusé. */
  onSignIn: (code: string) => Promise<void>;
  /** Lien « J'ai perdu mon code ». */
  onLostCode?: () => void;
  /** Lien « Créer un compte ». */
  onCreateInstead?: () => void;
  title?: string;
  intro?: ReactNode;
};

/** « J'ai déjà un compte » : saisie du code, tolérante aux minuscules, espaces et tirets. */
export function SignIn({ gameName, onSignIn, onLostCode, onCreateInstead, title = "J'ai déjà un compte", intro }: SignInProps) {
  const titleId = useId();
  const codeId = useId();
  const [value, setValue] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const { pending, error, run } = useSubmit();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const code = normalizeCode(value);
    if (!code) {
      setFieldError(ACCOUNT_MESSAGES.invalidCode);
      return;
    }
    setFieldError(undefined);
    void run(() => onSignIn(code));
  };

  return (
    <Card className="gap-5">
      <form onSubmit={submit} aria-labelledby={titleId} aria-busy={pending} className="flex flex-col gap-5">
        <Title id={titleId}>{title}</Title>
        <p className="text-lg">{intro ?? `Tape ton code pour retrouver ta partie de ${gameName}.`}</p>
        <TextField
          id={codeId}
          label="Ton code"
          value={value}
          onChange={setValue}
          maxLength={16}
          placeholder="K7M4 QXT2"
          error={fieldError}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputClassName="font-display tracking-widest uppercase"
        />
        <FormError message={error} />
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "Connexion…" : "Retrouver ma partie"}
        </PrimaryButton>
        {(onLostCode || onCreateInstead) && (
          <div className="flex flex-wrap justify-center gap-2">
            {onLostCode && <QuietButton onClick={onLostCode}>J'ai perdu mon code</QuietButton>}
            {onCreateInstead && <QuietButton onClick={onCreateInstead}>Créer un compte</QuietButton>}
          </div>
        )}
      </form>
    </Card>
  );
}
