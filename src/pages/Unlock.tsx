import { useState } from 'react';
import { useLocation } from 'wouter';
import { Shield, Fingerprint, KeyRound, Hash, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '../contexts/AuthContext';

type UnlockMethod = 'password' | 'otp' | 'biometric';

export default function Unlock() {
    const { login } = useAuth();
    const [, setLocation] = useLocation();
    const [method, setMethod] = useState<UnlockMethod>('password');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);

    const handleUnlock = async () => {
        if (!email && method === 'password') {
            // If email is not set, we might be unlocking a known account
            // but for "Log in", we need email.
            // I'll assume email is required for the first login.
        }

        setLoading(true);
        try {
            if (method === 'password') {
                await login(email, password);
                setLocation('/dashboard');
            } else {
                // Mock for OTP/Biometric
                setTimeout(() => {
                    setLocation('/dashboard');
                }, 1000);
            }
        } catch {
            // Error handled by AuthContext
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length <= 1 && /^\d*$/.test(value)) {
            const newOtp = [...otp];
            newOtp[index] = value;
            setOtp(newOtp);

            // Auto-focus next input
            if (value && index < 5) {
                const nextInput = document.getElementById(`otp-${index + 1}`);
                nextInput?.focus();
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background Effect */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md text-center z-10"
            >
                {/* Lock Icon */}
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20 animate-pulse">
                    <Shield className="w-10 h-10 text-primary" />
                </div>

                <h1 className="text-2xl font-bold font-display mb-2">Vault Locked</h1>
                <p className="text-muted-foreground mb-8">Verify your identity to proceed</p>

                {/* Glass Panel */}
                <div className="glass-panel p-6 rounded-2xl space-y-4">
                    <AnimatePresence mode="wait">
                        {/* Password Method */}
                        {method === 'password' && (
                            <motion.div
                                key="password"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-4"
                            >
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email Address"
                                    className="w-full text-center bg-secondary/50 border border-white/10 h-12 px-4 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                                    placeholder="Master Password"
                                    className="w-full text-center bg-secondary/50 border border-white/10 h-12 px-4 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                />
                                <button
                                    onClick={handleUnlock}
                                    disabled={loading || !password || !email}
                                    className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? 'Verifying...' : 'Unlock'}
                                    {!loading && <ArrowRight className="w-5 h-5" />}
                                </button>
                            </motion.div>
                        )}

                        {/* OTP Method */}
                        {method === 'otp' && (
                            <motion.div
                                key="otp"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-4"
                            >
                                <p className="text-sm text-muted-foreground mb-4">
                                    Enter the 6-digit code sent to your device
                                </p>
                                <div className="flex gap-2 justify-center">
                                    {otp.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`otp-${index}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                            className="w-12 h-14 text-center text-2xl font-mono bg-secondary/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={handleUnlock}
                                    disabled={loading || otp.some(d => !d)}
                                    className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Verifying...' : 'Verify OTP'}
                                </button>
                            </motion.div>
                        )}

                        {/* Biometric Method */}
                        {method === 'biometric' && (
                            <motion.div
                                key="biometric"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="py-4"
                            >
                                <div
                                    onClick={handleUnlock}
                                    className="w-24 h-24 mx-auto rounded-full bg-accent/10 flex items-center justify-center mb-4 cursor-pointer hover:bg-accent/20 transition-colors"
                                >
                                    <Fingerprint className={`w-12 h-12 text-accent ${loading ? 'animate-ping' : ''}`} />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Scan fingerprint or use Face ID
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Method Selector */}
                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/5">
                        <button
                            onClick={() => setMethod('password')}
                            className={`py-3 px-3 rounded-xl text-sm font-medium transition-all ${method === 'password' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:bg-white/5'
                                }`}
                        >
                            <KeyRound className="w-5 h-5 mx-auto mb-1" />
                            Password
                        </button>
                        <button
                            onClick={() => setMethod('otp')}
                            className={`py-3 px-3 rounded-xl text-sm font-medium transition-all ${method === 'otp' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:bg-white/5'
                                }`}
                        >
                            <Hash className="w-5 h-5 mx-auto mb-1" />
                            OTP
                        </button>
                        <button
                            onClick={() => setMethod('biometric')}
                            className={`py-3 px-3 rounded-xl text-sm font-medium transition-all ${method === 'biometric' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:bg-white/5'
                                }`}
                        >
                            <Fingerprint className="w-5 h-5 mx-auto mb-1" />
                            Bio
                        </button>
                    </div>
                </div>

                {/* Switch Account */}
                <div className="mt-8">
                    <button
                        onClick={() => setLocation('/')}
                        className="text-muted-foreground hover:text-white transition-colors"
                    >
                        ← Back to Landing
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
