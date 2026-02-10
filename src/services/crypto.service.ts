/**
 * Simple crypto service for demonstration.
 * In a real production app, this would use Web Crypto API (SubtleCrypto)
 * with proper key derivation (PBKDF2/Argon2) from a master password.
 */

const SECRET_PREFIX = 'ENC:';

export const cryptoService = {
    /**
     * Encrypts a text string using a mock encryption (Base64 + prefix).
     * In a production environment, this should be replaced with Web Crypto API.
     *
     * @param {string} text - The plain text to encrypt.
     * @param {string} _key - The encryption key (unused in this mock implementation).
     * @returns {Promise<string>} The encrypted string.
     *
     * @example
     * const encrypted = await cryptoService.encrypt("mySecret", "key123");
     */
    encrypt: async (text: string, _key: string): Promise<string> => {
        // Mock encryption: Base64 + prefix
        // In reality: await window.crypto.subtle.encrypt(...)
        return SECRET_PREFIX + btoa(text);
    },

    /**
     * Decrypts an encrypted string.
     * Returns the original string if decryption fails or if it's not encrypted.
     *
     * @param {string} encryptedText - The text to decrypt.
     * @param {string} _key - The decryption key (unused in this mock implementation).
     * @returns {Promise<string>} The decrypted plain text.
     */
    decrypt: async (encryptedText: string, _key: string): Promise<string> => {
        if (!encryptedText.startsWith(SECRET_PREFIX)) return encryptedText;
        try {
            // Mock decryption: remove prefix + atob
            return atob(encryptedText.substring(SECRET_PREFIX.length));
        } catch {
            return encryptedText;
        }
    }
};
