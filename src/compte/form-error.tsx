import { CircleAlert } from "lucide-react";

/** Message d'erreur d'un formulaire de compte, annoncé aux lecteurs d'écran. */
export function FormError({ message }: { message: string | null }) {
  return (
    <div role="alert" className="empty:hidden">
      {message && (
        <p className="flex items-center gap-2 rounded-champ border-2 border-corail bg-bande-corail px-4 py-3 text-base font-bold">
          <CircleAlert aria-hidden className="size-5 shrink-0 text-corail-tranche" />
          {message}
        </p>
      )}
    </div>
  );
}
