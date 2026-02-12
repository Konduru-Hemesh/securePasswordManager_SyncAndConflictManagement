/**
 * Simple crypto service for demonstration.
 * In a real production app, this would use Web Crypto API (SubtleCrypto)
 * with proper key derivation (PBKDF2/Argon2) from a master password.
 */

const SECRET_PREFIX = 'ENC:';

/**
 * Cryptographic service for handling data encryption and decryption.
 * 
 * IMPORTANT: This current implementation uses a mock encryption strategy (Base64 + prefix)
 * for demonstration purposes. In a production environment, this MUST be replaced with
 * the Web Crypto API (SubtleCrypto) using strong algorithms like AES-GCM or AES-GCM-SIV.
 * 
 * @namespace cryptoService
 */
export const cryptoService = {
    /**
     * Encrypts a text string using a mock encryption scheme.
     * 
     * @param {string} text - The plain text string to be encrypted.
     * @param {string} [key] - Optional encryption key (not utilized in this mock implementation).
     * @returns {Promise<string>} A promise that resolves to the encrypted string (prefixed with 'ENC:').
     * 
     * @example
     * const encrypted = await cryptoService.encrypt("mySecretPassword");
     * // returns "ENC:bXlTZWNyZXRQYXNzd29yZA=="
     */
    encrypt: async (text: string): Promise<string> => {
        // Mock encryption: Base64 + prefix
        // In reality: await window.crypto.subtle.encrypt(...)
        return SECRET_PREFIX + btoa(text);
    },

    /**
     * Decrypts an encrypted string back to plain text.
     * 
     * Checks for the presence of the specific prefix. If the prefix is missing or
     * decryption fails, the original string is returned.
     * 
     * @param {string} encryptedText - The encrypted string to decrypt.
     * @param {string} [key] - Optional decryption key (not utilized in this mock implementation).
     * @returns {Promise<string>} A promise that resolves to the decrypted plain text string.
     * 
     * @example
     * const plain = await cryptoService.decrypt("ENC:bXlTZWNyZXRQYXNzd29yZA==");
     * // returns "mySecretPassword"
     */
    decrypt: async (encryptedText: string): Promise<string> => {
        if (!encryptedText.startsWith(SECRET_PREFIX)) return encryptedText;
        try {
            // Mock decryption: remove prefix + atob
            return atob(encryptedText.substring(SECRET_PREFIX.length));
        } catch {
            return encryptedText;
        }
    }
};
