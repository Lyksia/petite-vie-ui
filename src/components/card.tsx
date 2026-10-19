import type { ReactNode } from "react";

/** Fiche posée dans l'univers du jeu : crème, contour brun, angles ronds et ombre courte. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`flex flex-col gap-3 rounded-fiche border-2 border-terre bg-creme p-5 shadow-pose ${className}`}>{children}</section>;
}

/** Titre de fiche en Baloo 2. */
export function CardTitle({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <h2 id={id} className={`font-display text-2xl leading-tight ${className}`}>
      {children}
    </h2>
  );
}

/** Titre d'écran en Baloo 2. */
export function Title({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <h1 id={id} className={`font-display text-3xl leading-tight ${className}`}>
      {children}
    </h1>
  );
}
