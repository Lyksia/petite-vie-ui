/** Tire un nouveau code de compte au hasard (générateur cryptographique), sous forme canonique « K7M4QXT2 ». */
export declare function generateCode(): string;
/**
 * Empreinte d'un code, à stocker et à chercher en base (hex, 64 caractères). Le code est normalisé d'abord.
 * Sans `pepper` : sha256, comme la clé de famille. Avec un `pepper` (secret de l'API, hors base) : HMAC-SHA256,
 * conseillé : sans secret, une base volée permet de tester les codes hors ligne, sans aucune limite d'essais.
 * Lève une erreur si le code n'est pas valable.
 */
export declare function hashCode(code: string, pepper?: string): string;
