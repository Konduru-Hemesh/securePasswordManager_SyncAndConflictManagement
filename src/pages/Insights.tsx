import { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, ArrowRight, RefreshCw, Key } from 'lucide-react';
import { calculatePasswordStrength, isCommonPassword } from '../utils/passwordStrength';
import { useLocation } from 'wouter';

interface VaultEntry {
    id: number;
    website: string;
    username: string;
    password: string;
}

export default function Insights() {
    const [, setLocation] = useLocation();
    const [entries] = useState<VaultEntry[]>(() => {
        const saved = localStorage.getItem('vaultEntries');
        return saved ? JSON.parse(saved) : [];
    });

    // Analysis Logic
    const weakPasswords = entries.filter(e => calculatePasswordStrength(e.password).score < 3);
    const reusedPasswords = entries.filter((e, i, arr) =>
        arr.some((other, j) => i !== j && other.password === e.password)
    );
    const compromisedPasswords = entries.filter(e => isCommonPassword(e.password));

    // Deduplicate reused list for display groups
    const uniqueReused = Array.from(new Set(reusedPasswords.map(e => e.password)));

    const score = entries.length > 0
        ? Math.round((entries.reduce((acc, entry) => acc + calculatePasswordStrength(entry.password).score, 0) / (entries.length * 4)) * 100)
        : 100;

    return (
        <div className="min-h-screen bg-background pb-24 pt-8 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            Vault Insights
                        </h1>
                        <p className="text-muted-foreground mt-2">Detailed availability analysis of your security posture.</p>
                    </div>
                    <div className="w-20 h-20 rounded-full flex items-center justify-center border-4 border-white/5 relative">
                        <span className={`text-2xl font-bold ${score > 70 ? 'text-primary' : score > 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {score}
                        </span>
                        <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin-slow" style={{ animationDuration: '3s' }} />
                    </div>
                </div>

                {/* Score Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-panel p-5 rounded-2xl border-l-4 border-red-500 bg-red-500/5">
                        <div className="flex justify-between items-start mb-2">
                            <Shield className="w-6 h-6 text-red-500" />
                            <span className="text-2xl font-bold">{compromisedPasswords.length}</span>
                        </div>
                        <h3 className="font-semibold text-red-200">Compromised</h3>
                        <p className="text-xs text-red-300/70 mt-1">Passwords found in known breaches</p>
                    </div>

                    <div className="glass-panel p-5 rounded-2xl border-l-4 border-orange-500 bg-orange-500/5">
                        <div className="flex justify-between items-start mb-2">
                            <RefreshCw className="w-6 h-6 text-orange-500" />
                            <span className="text-2xl font-bold">{uniqueReused.length}</span>
                        </div>
                        <h3 className="font-semibold text-orange-200">Reused</h3>
                        <p className="text-xs text-orange-300/70 mt-1">Passwords used on multiple sites</p>
                    </div>

                    <div className="glass-panel p-5 rounded-2xl border-l-4 border-yellow-500 bg-yellow-500/5">
                        <div className="flex justify-between items-start mb-2">
                            <AlertTriangle className="w-6 h-6 text-yellow-500" />
                            <span className="text-2xl font-bold">{weakPasswords.length}</span>
                        </div>
                        <h3 className="font-semibold text-yellow-200">Weak</h3>
                        <p className="text-xs text-yellow-300/70 mt-1">Easily crackable passwords</p>
                    </div>
                </div>

                {/* Detailed Lists */}
                <div className="space-y-6">
                    {compromisedPasswords.length > 0 && (
                        <div className="glass-panel p-6 rounded-3xl">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-400">
                                <AlertTriangle className="w-5 h-5" />
                                Critical: Compromised Passwords
                            </h3>
                            <div className="space-y-3">
                                {compromisedPasswords.map(entry => (
                                    <div key={entry.id} className="flex items-center justify-between p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-500 font-bold">
                                                {entry.website.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium">{entry.website}</p>
                                                <p className="text-xs text-red-300">{entry.username}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setLocation('/dashboard')} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors">
                                            Fix Now
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {uniqueReused.length > 0 && (
                        <div className="glass-panel p-6 rounded-3xl">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-orange-400">
                                <RefreshCw className="w-5 h-5" />
                                Warning: Reused Passwords
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">Using the same password places multiple accounts at risk.</p>
                            <div className="space-y-4">
                                {uniqueReused.map((pwd, idx) => {
                                    const affected = entries.filter(e => e.password === pwd);
                                    return (
                                        <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Key className="w-4 h-4 text-orange-400" />
                                                <span className="text-sm font-mono text-muted-foreground">••••••••••••</span>
                                                <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full">Used {affected.length} times</span>
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                {affected.map(e => (
                                                    <span key={e.id} className="text-xs border border-white/10 px-2 py-1 rounded-md bg-black/20 text-muted-foreground">
                                                        {e.website}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {entries.length === 0 && (
                        <div className="text-center py-12">
                            <CheckCircle className="w-16 h-16 text-emerald-500/20 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-muted-foreground">No Data to Analyze</h3>
                            <p className="text-sm text-muted-foreground/50 mt-2">Add entries to your vault to see security insights.</p>
                        </div>
                    )}

                    <div className="flex justify-center pt-4">
                        <button
                            onClick={() => setLocation('/dashboard')}
                            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
                        >
                            Back to Dashboard <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
