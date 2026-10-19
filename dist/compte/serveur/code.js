import { createHash, createHmac, randomInt } from "node:crypto";
import { CODE_ALPHABET, CODE_LENGTH, normalizeCode } from "../code-format.js";
/** Tire un nouveau code de compte au hasard (générateur cryptographique), sous forme canonique « K7M4QXT2 ». */
export function generateCode() {
    let code = "";
    for (let index = 0; index < CODE_LENGTH; index++)
        code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    return code;
}
/**
 * Empreinte d'un code, à stocker et à chercher en base (hex, 64 caractères). Le code est normalisé d'abord.
 * Sans `pepper` : sha256, comme la clé de famille. Avec un `pepper` (secret de l'API, hors base) : HMAC-SHA256,
 * conseillé : sans secret, une base volée permet de tester les codes hors ligne, sans aucune limite d'essais.
 * Lève une erreur si le code n'est pas valable.
 */
export function hashCode(code, pepper) {
    const normalized = normalizeCode(code);
    if (!normalized)
        throw new Error("Code de compte invalide");
    return pepper ? createHmac("sha256", pepper).update(normalized).digest("hex") : createHash("sha256").update(normalized).digest("hex");
}
