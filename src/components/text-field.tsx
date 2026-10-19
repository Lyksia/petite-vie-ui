import { CircleAlert } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

type TextFieldProps = {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
  maxLength: number;
  /** Aide sous le champ, toujours visible (reliée par aria-describedby). */
  hint?: ReactNode;
  type?: "text" | "email";
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  autoCapitalize?: string;
  spellCheck?: boolean;
  /** Classes ajoutées au champ lui-même (ex. code en grandes lettres espacées). */
  inputClassName?: string;
};

/** Champ avec libellé toujours visible ; actif en sauge, en erreur en corail avec un message. */
export function TextField({
  id,
  label,
  value,
  onChange,
  error,
  autoComplete = "off",
  placeholder,
  maxLength,
  hint,
  type = "text",
  inputMode,
  autoCapitalize,
  spellCheck,
  inputClassName = "",
}: TextFieldProps) {
  const errorId = `${id}-erreur`;
  const hintId = `${id}-aide`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-2 font-bold">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        autoCapitalize={autoCapitalize}
        spellCheck={spellCheck}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={`h-14 scroll-mb-32 rounded-champ border-2 bg-creme px-4 text-lg text-terre outline-none transition placeholder:text-terre-douce focus:border-3 focus:border-sauge focus:ring-4 focus:ring-sauge/20 ${error ? "border-corail ring-4 ring-corail/20" : "border-terre"} ${inputClassName}`}
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
