/**
 * Calculates the strength of a given password based on length and character variety.
 * 
 * @param {string} password - The password string to evaluate.
 * @returns {object} An object containing the strength score (0-4), a descriptive label, and a tailwind color class.
 * 
 * Score Mapping:
 * 0 - Very Weak (Red)
 * 1 - Weak (Orange)
 * 2 - Fair (Yellow)
 * 3 - Good (Blue)
 * 4 - Strong (Green)
 */
export function calculatePasswordStrength(password: string): {
    score: number; // 0-4
    label: string;
    color: string;
} {
    let score = 0;

    if (!password) return { score: 0, label: 'None', color: 'text-muted-foreground' };

    // Length
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;

    // Character variety
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    // Cap at 4
    score = Math.min(score, 4);

    const strengths = [
        { label: 'Very Weak', color: 'text-red-500' },
        { label: 'Weak', color: 'text-orange-500' },
        { label: 'Fair', color: 'text-yellow-500' },
        { label: 'Good', color: 'text-blue-500' },
        { label: 'Strong', color: 'text-green-500' },
    ];

    return { score, ...strengths[score] };
}

/**
 * Checks if a password is found in a list of common, easily guessable passwords.
 * This is a basic check using a small, hardcoded list.
 * 
 * @param {string} password - The password to check.
 * @returns {boolean} True if the password is common/weak, false otherwise.
 */
export function isCommonPassword(password: string): boolean {
    const commonPasswords = [
        'password', '123456', '12345678', 'qwerty', 'abc123',
        'monkey', '1234567', 'letmein', 'trustno1', 'dragon',
        'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
        'bailey', 'passw0rd', 'shadow', '123123', '654321', 'password123', 'admin'
    ];

    if (!password) return false;
    return commonPasswords.includes(password.toLowerCase());
}
