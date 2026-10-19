"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { PrimaryButton, QuietButton } from "../components/button";
import { Card, Title } from "../components/card";
import { TextField } from "../components/text-field";
import { ANSWER_MAX_LENGTH, normalizeAnswer } from "./answer-format";
import { CodeReveal } from "./code-reveal";
import { FormError } from "./form-error";
import { SECRET_QUESTIONS, type SecretQuestionId } from "./questions";
import { SecretQuestionSelect } from "./secret-question-select";
import { useSubmit } from "./use-submit";

export type CreateAccountInput = { questionId: SecretQuestionId; answer: string };

export type CreateAccountProps = {
  /** Nom du jeu, affiché et utilisé pour le partage : « Parent Life ». */
  gameName: string;
  /** Crée le compte côté API et renvoie le code tiré par le serveur. Lever AccountFormError pour un message précis. */
  onCreate: (input: CreateAccountInput) => Promise<{ code: string }>;
  /** Le joueur a confirmé avoir noté son code. */
  onDone: (code: string) => void;
  /** Lien « J'ai déjà un compte ». */
  onSignInInstead?: () => void;
  title?: string;
  intro?: ReactNode;
};

/** Création d'un compte : question secrète et réponse, puis affichage du code à noter. */
export function CreateAccount({ gameName, onCreate, onDone, onSignInInstead, title = "Créer ton compte", intro }: CreateAccountProps) {
  const titleId = useId();
  const questionId = useId();
  const answerId = useId();
  const [question, setQuestion] = useState<SecretQuestionId>(SECRET_QUESTIONS[0].id);
  const [answer, setAnswer] = useState("");
  const [answerError, setAnswerError] = useState<string>();
  const [code, setCode] = useState<string | null>(null);
  const { pending, error, run } = useSubmit();

  if (code) {
    return (
      <CodeReveal
        code={code}
        gameName={gameName}
        title="Voici ton code"
        text="Note-le dans un endroit sûr : c'est lui qui te permet de retrouver ta partie sur un autre appareil. Garde-le pour toi."
        onDone={onDone}
      />
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!normalizeAnswer(answer)) {
      setAnswerError("Écris une réponse avec au moins une lettre ou un chiffre.");
      return;
    }
    setAnswerError(undefined);
    void run(async () => {
      const created = await onCreate({ questionId: question, answer });
      setCode(created.code);
    });
  };

  return (
    <Card className="gap-5">
      <form onSubmit={submit} aria-labelledby={titleId} aria-busy={pending} className="flex flex-col gap-5">
        <Title id={titleId}>{title}</Title>
        <p className="text-lg">
          {intro ?? `Ton compte garde ta partie de ${gameName} à l'abri. Pas d'e-mail, pas de mot de passe : juste un code à noter.`}
        </p>
        <p className="text-lg">Si un jour tu perds ton code, cette question nous aidera à te le rendre.</p>
        <SecretQuestionSelect id={questionId} value={question} onChange={setQuestion} />
        <TextField
          id={answerId}
          label="Ta réponse"
          value={answer}
          onChange={setAnswer}
          maxLength={ANSWER_MAX_LENGTH}
          error={answerError}
          spellCheck={false}
          hint="Choisis une réponse que tu retrouveras facilement. Les majuscules, les accents et la ponctuation ne comptent pas."
        />
        <FormError message={error} />
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "Création…" : "Créer mon compte"}
        </PrimaryButton>
        {onSignInInstead && (
          <QuietButton onClick={onSignInInstead} className="self-center">
            J'ai déjà un compte
          </QuietButton>
        )}
      </form>
    </Card>
  );
}
