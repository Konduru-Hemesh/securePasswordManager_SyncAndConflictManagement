import { describe, it, expect } from 'vitest';
import { generatePassword } from './passwordGenerator';
import { calculatePasswordStrength, isCommonPassword } from './passwordStrength';

describe('Password Utils', () => {
    describe('generatePassword', () => {
        it('should generate password of specified length', () => {
            const pwd = generatePassword(16, true, true, true, true);
            expect(pwd).toHaveLength(16);
        });

        it('should include numbers when requested', () => {
            const pwd = generatePassword(100, true, false, true, false); // Numbers only (and uppercase to ensure charset not empty fallback)
            expect(pwd).toMatch(/[0-9]/);
        });

        it('should include symbols when requested', () => {
            const pwd = generatePassword(20, false, true, false, true);
            expect(pwd).toMatch(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/);
        });

        it('should generate unique passwords', () => {
            const pwd1 = generatePassword(12, true, true, true, true);
            const pwd2 = generatePassword(12, true, true, true, true);
            expect(pwd1).not.toBe(pwd2);
        });
    });

    describe('calculatePasswordStrength', () => {
        it('should identify weak passwords', () => {
            expect(calculatePasswordStrength('123456').score).toBeLessThan(2);
            expect(calculatePasswordStrength('password').score).toBeLessThan(2);
        });

        it('should identify strong passwords', () => {
            const strong = 'Correct-Horse-Battery-Staple-99!';
            const result = calculatePasswordStrength(strong);
            expect(result.score).toBeGreaterThanOrEqual(4);
        });

    });
});

describe('isCommonPassword', () => {
    it('should return true for common passwords', () => {
        expect(isCommonPassword('password123')).toBe(true);
        expect(isCommonPassword('admin')).toBe(true);
    });

    it('should return false for unique passwords', () => {
        expect(isCommonPassword('Xy9#mP2$qL')).toBe(false);
    });
});

