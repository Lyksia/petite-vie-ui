"use client";

import { LockKeyhole } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { PrimaryButton } from "../components/button";
import { Card, Title } from "../components/card";
import { TextField } from "../components/text-field";
import { ADMIN_MESSAGES, normalizeAdminCode } from "./admin-code-format";
import { FormError } from "./form-error";
import { useSubmit } from "./use-submit";

export type AdminCodeGateProps = {
  gameName: string;
  /**
   * Reçoit le code déjà normalisé (« 12345678 »). Lever AccountFormError(ADMIN_MESSAGES.wrongCode…) si refusé ;
   * en cas de réussite, le jeu pose le cookie de session puis recharge ou redirige.
   */
  onSubmit: (code: string) => Promise<void>;
};

/** Entrée de l'interface admin : un code de 8 chiffres, le même fonctionnement dans les trois jeux. */
export function AdminCodeGate({ gameName, onSubmit }: AdminCodeGateProps) {
  const titleId = useId();
  const codeId = useId();
  const [value, setValue] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const { pending, error, run } = useSubmit();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const code = normalizeAdminCode(value);
    if (!code) {
      setFieldError(ADMIN_MESSAGES.invalidCode);
      return;
    }
    setFieldError(undefined);
    void run(async () => {
      try {
        await onSubmit(code);
      } finally {
        setValue("");
      }
    });
  };

  return (
    <Card className="gap-5">
      <form onSubmit={submit} aria-labelledby={titleId} aria-busy={pending} className="flex flex-col gap-5">
        <Title id={titleId}>
          <span className="flex items-center gap-2">
            <LockKeyhole aria-hidden className="size-6 shrink-0" />
            Admin · {gameName}
          </span>
        </Title>
        <TextField
          id={codeId}
          label="Code admin"
          value={value}
          onChange={setValue}
          maxLength={11}
          placeholder="1234 5678"
          error={fieldError}
          autoComplete="off"
          inputMode="numeric"
          spellCheck={false}
          inputClassName="font-display tracking-widest"
        />
        <FormError message={error} />
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "Vérification…" : "Entrer"}
        </PrimaryButton>
      </form>
    </Card>
  );
}
