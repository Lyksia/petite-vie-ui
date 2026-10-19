import { ChevronDown } from "lucide-react";
import { SECRET_QUESTIONS, type SecretQuestionId } from "./questions";

/** Liste déroulante des questions secrètes, même allure que TextField. */
export function SecretQuestionSelect({ id, value, onChange }: { id: string; value: SecretQuestionId; onChange: (id: SecretQuestionId) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-bold">
        Ta question secrète
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as SecretQuestionId)}
          className="h-14 w-full appearance-none rounded-champ border-2 border-terre bg-creme pr-12 pl-4 text-lg text-terre outline-none transition focus:border-3 focus:border-sauge focus:ring-4 focus:ring-sauge/20"
        >
          {SECRET_QUESTIONS.map((question) => (
            <option key={question.id} value={question.id}>
              {question.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-terre" />
      </div>
    </div>
  );
}
