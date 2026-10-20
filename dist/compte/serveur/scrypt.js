import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const PARAMS = { N: 16384, r: 8, p: 1 };
function derive(secret, salt, options, keyLength) {
    return new Promise((resolve, reject) => {
        scrypt(secret, salt, keyLength, { ...options, maxmem: 64 * 1024 * 1024 }, (error, key) => (error ? reject(error) : resolve(key)));
    });
}
/** Empreinte scrypt avec un sel aléatoire. Format : `scrypt$N$r$p$sel$empreinte` (sel et empreinte en base64url). */
export async function scryptHash(secret) {
    const salt = randomBytes(SALT_LENGTH);
    const key = await derive(secret, salt, PARAMS, KEY_LENGTH);
    return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64url"), key.toString("base64url")].join("$");
}
/** Compare un secret (déjà normalisé) à son empreinte, à temps constant. `false` si l'empreinte est mal formée. */
export async function scryptVerify(secret, stored) {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt")
        return false;
    const [, n, r, p, saltText, keyText] = parts;
    const options = { N: Number(n), r: Number(r), p: Number(p) };
    if (!Object.values(options).every((value) => Number.isSafeInteger(value) && value > 0))
        return false;
    const expected = Buffer.from(keyText, "base64url");
    const salt = Buffer.from(saltText, "base64url");
    if (expected.length === 0 || salt.length === 0)
        return false;
    try {
        const actual = await derive(secret, salt, options, expected.length);
        return timingSafeEqual(actual, expected);
    }
    catch {
        return false;
    }
}
