import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

type TextAreaFieldProps = {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  rows?: number;
  error?: string;
  hint?: ReactNode;
  placeholder?: string;
};

/** Zone de texte sur plusieurs lignes, même allure que TextField : libellé visible, aide, erreur en corail. */
export function TextAreaField({ id, label, value, onChange, maxLength, rows = 3, error, hint, placeholder }: TextAreaFieldProps) {
  const errorId = `${id}-erreur`;
  const hintId = `${id}-aide`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-2 font-bold">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={`min-h-28 scroll-mb-32 resize-y rounded-champ border-2 bg-creme px-4 py-3 text-lg text-terre outline-none transition placeholder:text-terre-douce focus:border-3 focus:border-sauge focus:ring-4 focus:ring-sauge/20 ${error ? "border-corail ring-4 ring-corail/20" : "border-terre"}`}
      />
      {hint && (
        <p id={hintId} className="text-base text-terre-douce">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-center gap-2 text-base font-bold">
          <CircleAlert aria-hidden className="size-5 shrink-0 text-corail-tranche" />
          {error}
        </p>
      )}
    </div>
  );
}
