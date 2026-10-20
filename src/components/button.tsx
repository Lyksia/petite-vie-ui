import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Action principale : corail, libellé brun renforcé, contour brun et léger relief. Une seule par écran.
 * Libellé en 20 px gras : brun foncé sur corail fait 4,37:1, suffisant pour un grand texte (3:1), pas pour un petit.
 */
export function PrimaryButton({ className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`min-h-14 rounded-bouton border-2 border-terre bg-corail px-5 text-xl font-bold text-terre-fonce shadow-relief transition active:translate-y-1 active:shadow-none disabled:border-corail-pale disabled:bg-corail-pale disabled:text-terre-douce disabled:shadow-none ${className}`}
      {...props}
    />
  );
}

/** Action secondaire : sauge claire, contour sauge. */
export function SecondaryButton({ className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`min-h-14 rounded-bouton border-2 border-sauge bg-sauge-claire px-5 font-bold text-terre shadow-relief-sauge transition active:translate-y-0.5 active:shadow-none disabled:border-sable disabled:bg-sable disabled:text-terre-douce disabled:shadow-none ${className}`}
      {...props}
    />
  );
}

/** Action discrète (« Plus tard », « Abandonner ») : un lien souligné, sans fond. */
export function QuietButton({ className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`min-h-11 px-3 text-base text-terre-douce underline underline-offset-4 ${className}`}
      {...props}
    />
  );
}
