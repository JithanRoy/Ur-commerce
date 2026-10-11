const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const LENGTH = 14;

export function generatePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}
