"use client";

import { useId, useState, type FormEvent } from "react";
import { PrimaryButton } from "../components/button";
import { Card, Title } from "../components/card";
import { TextField } from "../components/text-field";
import { ANSWER_MAX_LENGTH, normalizeAnswer } from "./answer-format";
import { CodeReveal } from "./code-reveal";
import { FormError } from "./form-error";
import { getSecretQuestion } from "./questions";
import { useSubmit } from "./use-submit";

/** Ce que l'API répond à une réponse secrète envoyée depuis le lien. */
export type RecoverResult =
  | { status: "ok"; code: string }
  | { status: "wrong"; attemptsLeft: number }
  | { status: "locked" }
  | { status: "expired" };

export type RecoverProps = {
  gameName: string;
  /** L'id de la question du compte, lu par le jeu avec le jeton du lien ; `null` si le lien n'est plus valable. */
  questionId: string | null;
  /** Le lien est déjà bloqué (trop d'essais) au chargement. */
  locked?: boolean;
  /** Envoie la réponse à l'API avec le jeton du lien. */
  onRecover: (answer: string) => Promise<RecoverResult>;
  /** Le joueur a confirmé avoir noté son nouveau code. */
  onDone: (code: string) => void;
  /** Bouton « Refaire une demande » quand le lien ne marche plus. */
  onLostCode?: () => void;
  title?: string;
};

/** Page du lien de récupération : la question secrète, puis le nouveau code (l'ancien ne marche plus). */
export function Recover({ gameName, questionId, locked = false, onRecover, onDone, onLostCode, title = "Retrouver ton compte" }: RecoverProps) {
  const titleId = useId();
  const answerId = useId();
  const [answer, setAnswer] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [state, setState] = useState<"question" | "locked" | "expired">(locked ? "locked" : "question");
  const [code, setCode] = useState<string | null>(null);
  const { pending, error, run } = useSubmit();
  const question = questionId ? getSecretQuestion(questionId) : undefined;

  if (code) {
    return (
      <CodeReveal
        code={code}
        gameName={gameName}
        title="Voici ton nouveau code"
        text="Note-le bien : l'ancien code ne marche plus. Garde celui-ci pour toi."
        onDone={onDone}
      />
    );
  }

  if (!question || state !== "question") {
    const isLocked = question && state === "locked";
    return (
      <Card className="gap-4">
        <Title>{isLocked ? "Trop d'essais" : "Ce lien ne marche plus"}</Title>
        <p className="text-lg">
          {isLocked
            ? "Pour protéger ton compte, ce lien est bloqué pendant 24 heures. Tu pourras réessayer après."
            : "Il a peut-être déjà servi, ou il a dépassé 24 heures. Tu peux refaire une demande."}
        </p>
        {!isLocked && onLostCode && <PrimaryButton onClick={onLostCode}>Refaire une demande</PrimaryButton>}
      </Card>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!normalizeAnswer(answer)) {
      setFieldError("Écris ta réponse.");
      return;
    }
    setFieldError(undefined);
    void run(async () => {
      const result = await onRecover(answer);
      if (result.status === "ok") setCode(result.code);
      else if (result.status === "wrong")
        setFieldError(
          result.attemptsLeft > 1
            ? `Ce n'est pas la bonne réponse. Il te reste ${result.attemptsLeft} essais.`
            : result.attemptsLeft === 1
              ? "Ce n'est pas la bonne réponse. Il te reste un dernier essai."
              : "Ce n'est pas la bonne réponse.",
        );
      else setState(result.status);
    });
  };

  return (
    <Card className="gap-5">
      <form onSubmit={submit} aria-labelledby={titleId} aria-busy={pending} className="flex flex-col gap-5">
        <Title id={titleId}>{title}</Title>
        <p className="text-lg">Réponds à ta question secrète pour recevoir un nouveau code pour {gameName}.</p>
        <TextField
          id={answerId}
          label={question.label}
          value={answer}
          onChange={setAnswer}
          maxLength={ANSWER_MAX_LENGTH}
          error={fieldError}
          spellCheck={false}
          hint="Les majuscules, les accents et la ponctuation ne comptent pas. Tu as 3 essais."
        />
        <FormError message={error} />
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "Vérification…" : "Valider ma réponse"}
        </PrimaryButton>
      </form>
    </Card>
  );
}
