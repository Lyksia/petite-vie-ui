"use client";

import { useId, useState, type ReactNode } from "react";
import { Card, Title } from "../components/card";
import { PrimaryButton } from "../components/button";
import { CodeActions } from "./code-actions";
import { CodeDisplay } from "./code-display";

type CodeRevealProps = {
  code: string;
  gameName: string;
  title: string;
  text: ReactNode;
  onDone: (code: string) => void;
  doneLabel?: string;
};

/** Montre un code tout neuf, propose de le copier ou partager, et demande de confirmer qu'il est noté. */
export function CodeReveal({ code, gameName, title, text, onDone, doneLabel = "C'est noté, on continue" }: CodeRevealProps) {
  const titleId = useId();
  const checkId = useId();
  const [noted, setNoted] = useState(false);
  return (
    <Card className="gap-4">
        <Title id={titleId}>{title}</Title>
        <CodeDisplay code={code} />
        <p className="text-lg">{text}</p>
        <CodeActions code={code} gameName={gameName} />
        <label htmlFor={checkId} className="flex min-h-11 cursor-pointer items-center gap-3 text-lg font-bold">
          <input
            id={checkId}
            type="checkbox"
            checked={noted}
            onChange={(event) => setNoted(event.target.checked)}
            className="size-6 shrink-0 accent-sauge"
          />
          J'ai noté mon code
        </label>
        <PrimaryButton disabled={!noted} onClick={() => onDone(code)}>
          {doneLabel}
        </PrimaryButton>
    </Card>
  );
}
