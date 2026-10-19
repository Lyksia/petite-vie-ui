import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

/** Fiche au premier plan sur un voile brun : en bas de l'écran sur téléphone, au centre sur grand écran. */
export function Dialog({ children, labelledBy }: { children: ReactNode; labelledBy: string }) {
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-terre/45 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="flex max-h-full w-full max-w-md flex-col gap-5 overflow-y-auto rounded-fiche border-2 border-terre bg-creme p-6 text-lg text-terre shadow-carte motion-safe:animate-pop"
      >
        {children}
      </div>
    </div>
  );
}

/** Titre de dialogue en Baloo 2, avec son icône (Lucide, ou chemin d'une icône dessinée) dans une pastille sauge claire. */
export function DialogTitle({ id, icon: Icon, children }: { id: string; icon: LucideIcon | string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="relative flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-sauge bg-sauge-claire">
        {typeof Icon === "string" ? (
          <span className="relative size-8">
            <Image src={Icon} alt="" fill unoptimized className="object-contain" />
          </span>
        ) : (
          <Icon className="size-5 text-sauge" />
        )}
      </span>
      <h2 id={id} className="font-display text-2xl leading-tight">
        {children}
      </h2>
    </div>
  );
}
