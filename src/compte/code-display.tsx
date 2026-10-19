import { formatCode } from "./code-format";

/** Le code en grand, en deux groupes ; les lecteurs d'écran l'épellent caractère par caractère. */
export function CodeDisplay({ code, hidden = false }: { code: string; hidden?: boolean }) {
  const readable = formatCode(code);
  return (
    <p className="rounded-champ border-2 border-terre bg-sable px-4 py-3 text-center font-display text-4xl tracking-widest text-terre-fonce">
      {hidden ? (
        <>
          <span aria-hidden>••• •••</span>
          <span className="sr-only">Code masqué</span>
        </>
      ) : (
        <>
          <span aria-hidden>{readable}</span>
          <span className="sr-only">{readable.replace(/\s/g, "").split("").join(" ")}</span>
        </>
      )}
    </p>
  );
}
