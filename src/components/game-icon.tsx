import Image from "next/image";

const SIZES = {
  xs: "size-4",
  sm: "size-5",
  md: "size-6",
  lg: "size-8",
  xl: "size-10",
} as const;

/** Une icône dessinée du jeu (public/img/icones), décorative : le texte à côté dit ce qu'elle montre. */
export function GameIcon({ src, size = "md", className = "" }: { src: string; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span aria-hidden className={`relative block shrink-0 ${SIZES[size]} ${className}`}>
      <Image src={src} alt="" fill unoptimized draggable={false} className="object-contain" />
    </span>
  );
}
