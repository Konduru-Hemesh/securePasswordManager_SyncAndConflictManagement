import { useState } from 'react';
import { useLocation } from 'wouter';
import { Shield, Eye, EyeOff, ArrowRight, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
    const { register } = useAuth();
    const [, setLocation] = useLocation();
    const [masterPassword, setMasterPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    // Password strength calculation
    const getPasswordStrength = (password: string) => {
        if (!password) return { score: 0, label: '', color: '' };

        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;

        const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
        const colors = ['', 'text-red-500', 'text-orange-500', 'text-yellow-500', 'text-primary', 'text-emerald-500'];

        return { score, label: labels[score], color: colors[score] };
    };

    const strength = getPasswordStrength(masterPassword);
    const passwordsMatch = masterPassword && confirmPassword && masterPassword === confirmPassword;

    const requirements = [
        { met: masterPassword.length >= 8, text: 'At least 8 characters' },
        { met: /[a-z]/.test(masterPassword) && /[A-Z]/.test(masterPassword), text: 'Upper & lowercase letters' },
        { met: /[0-9]/.test(masterPassword), text: 'Contains numbers' },
        { met: /[^a-zA-Z0-9]/.test(masterPassword), text: 'Special characters' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (strength.score >= 3 && passwordsMatch) {
            setLoading(true);
            try {
                await register(email, masterPassword, name);
                setLocation('/dashboard');
            } catch {
                // Error handled by AuthContext
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md"
            >
                <div className="glass-panel p-8 rounded-3xl">
                    {/* Header */}
                    <div className="flex items-center justify-center mb-8">
                        <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center">
                            <Shield className="w-8 h-8 text-primary" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-display font-bold text-center mb-2">Create Your Vault</h1>
                    <p className="text-muted-foreground text-center mb-8">
                        Choose a strong master password. This is the only key to your vault.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-secondary/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-secondary/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                placeholder="your@email.com"
                                required
                            />
                        </div>

                        {/* Master Password */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Master Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={masterPassword}
                                    onChange={(e) => setMasterPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-secondary/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all pr-12"
                                    placeholder="••••••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {/* Strength Meter */}
                            {masterPassword && (
                                <div className="mt-3 space-y-2">
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength.score ? 'bg-primary' : 'bg-white/10'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <p className={`text-sm font-medium ${strength.color}`}>
                                        {strength.label}
                                    </p>
                                </div>
                            )}

                            {/* Requirements Checklist */}
                            {masterPassword && (
                                <div className="mt-3 space-y-1">
                                    {requirements.map((req, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm">
                                            {req.met ? (
                                                <Check className="w-4 h-4 text-primary" />
                                            ) : (
                                                <X className="w-4 h-4 text-muted-foreground" />
                                            )}
                                            <span className={req.met ? 'text-foreground' : 'text-muted-foreground'}>
                                                {req.text}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full px-4 py-3 bg-secondary/30 border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all ${confirmPassword && (passwordsMatch ? 'border-primary' : 'border-red-500')
                                    }`}
                                placeholder="••••••••••••"
                                required
                            />
                            {confirmPassword && !passwordsMatch && (
                                <p className="text-red-500 text-sm mt-2">Passwords don't match</p>
                            )}
                            {passwordsMatch && (
                                <p className="text-primary text-sm mt-2 flex items-center gap-1">
                                    <Check className="w-4 h-4" /> Passwords match
                                </p>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={strength.score < 3 || !passwordsMatch || loading}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {loading ? 'Creating Vault...' : 'Create Vault'}
                            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>

                    <p className="text-center text-sm text-muted-foreground mt-6">
                        Already have a vault?{' '}
                        <button onClick={() => setLocation('/unlock')} className="text-primary hover:underline">
                            Unlock it here
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
