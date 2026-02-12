// Password strength calculator utility
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

// Check if password is commonly used (mock)
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
