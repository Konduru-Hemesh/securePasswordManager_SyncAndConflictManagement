import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, ChevronDown, Tag, Briefcase, User, DollarSign, MessageSquare, Film, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PasswordGenerator from './PasswordGenerator';
import { cryptoService } from '../services/crypto.service';

interface VaultEntry {
    id?: number;
    website: string;
    username: string;
    password: string;
    securityQuestion?: string;
    securityAnswer?: string;
    isFavorite: boolean;
    category?: string;
    passwordHistory?: Array<{ password: string; changedAt: string }>;
}

interface EntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (entry: VaultEntry) => void;
    entry?: VaultEntry;
    mode: 'add' | 'edit';
}

export default function EntryModal({ isOpen, onClose, onSave, entry, mode }: EntryModalProps) {
    const defaultState = { website: '', username: '', password: '', securityQuestion: '', securityAnswer: '', isFavorite: false };
    const [formData, setFormData] = useState<VaultEntry>(defaultState);
    const [errors, setErrors] = useState<Partial<Record<keyof VaultEntry, string>>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);

    useEffect(() => {
        const loadEntry = async () => {
            if (isOpen && mode === 'edit' && entry) {
                let decryptedPassword = entry.password;
                try {
                    // Attempt decrypt if it looks encrypted (simple check or try/catch)
                    // Since we are editing, we assume it's encrypted in the vault.
                    // But if it's already plain (e.g. from local state logic mismatch?), we might fail.
                    // Actually, vault entries are ALWAYS encrypted in state.
                    decryptedPassword = await cryptoService.decrypt(entry.password);
                } catch (e) {
                    console.error('Failed to decrypt password for edit', e);
                }

                setFormData({
                    ...entry,
                    password: decryptedPassword
                });
            } else if (isOpen && mode === 'add') {
                setFormData(defaultState);
            }
        };
        loadEntry();
    }, [isOpen, mode, entry]);

    const categories = [
        { id: 'Work', label: 'Work', icon: <Briefcase className="w-4 h-4" />, color: 'text-blue-400' },
        { id: 'Personal', label: 'Personal', icon: <User className="w-4 h-4" />, color: 'text-purple-400' },
        { id: 'Finance', label: 'Finance', icon: <DollarSign className="w-4 h-4" />, color: 'text-emerald-400' },
        { id: 'Social', label: 'Social', icon: <MessageSquare className="w-4 h-4" />, color: 'text-pink-400' },
        { id: 'Entertainment', label: 'Entertainment', icon: <Film className="w-4 h-4" />, color: 'text-orange-400' },
        { id: 'Shopping', label: 'Shopping', icon: <ShoppingCart className="w-4 h-4" />, color: 'text-indigo-400' },
    ];

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof VaultEntry, string>> = {};

        if (!formData.website.trim()) {
            newErrors.website = 'Website/App name is required';
        }

        if (!formData.username.trim()) {
            newErrors.username = 'Username/Email is required';
        }

        if (!formData.password.trim()) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 4) {
            newErrors.password = 'Password must be at least 4 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (validate()) {
            onSave(formData);
            handleClose();
        }
    };

    const handleClose = () => {
        setFormData({ website: '', username: '', password: '', securityQuestion: '', securityAnswer: '', isFavorite: false });
        setErrors({});
        setShowPassword(false);
        onClose();
    };

    const handleChange = (field: keyof VaultEntry, value: string | boolean) => {
        setFormData((prev: VaultEntry) => ({ ...prev, [field]: value }));
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{
                                type: "spring",
                                damping: 25,
                                stiffness: 300
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="glass-panel p-6 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-white/10"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-display font-bold">
                                    {mode === 'add' ? 'Add New Entry' : 'Edit Entry'}
                                </h2>
                                <button
                                    onClick={handleClose}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Website/App Name */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Website / App Name <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.website}
                                        onChange={(e) => handleChange('website', e.target.value)}
                                        placeholder="e.g., Netflix, GitHub"
                                        className={`w-full px-4 py-3 bg-secondary/30 border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all ${errors.website ? 'border-destructive' : 'border-white/10'
                                            }`}
                                    />
                                    {errors.website && (
                                        <p className="text-destructive text-sm mt-1">{errors.website}</p>
                                    )}
                                </div>

                                {/* Category */}
                                <div className="relative">
                                    <label className="block text-sm font-medium mb-2">
                                        Category <span className="text-muted-foreground">(Optional)</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                                        className="w-full px-4 py-3 bg-secondary/30 border border-white/10 rounded-xl flex items-center justify-between hover:bg-white/5 transition-all outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        <div className="flex items-center gap-2">
                                            {formData.category ? (
                                                <>
                                                    {categories.find(c => c.id === formData.category)?.icon}
                                                    <span>{formData.category}</span>
                                                </>
                                            ) : (
                                                <span className="text-muted-foreground">No category</span>
                                            )}
                                        </div>
                                        <ChevronDown className={`w-4 h-4 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {isCategoryOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="absolute top-full left-0 right-0 mt-2 p-2 glass-panel border border-white/10 rounded-2xl z-[60] shadow-2xl max-h-60 overflow-y-auto"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleChange('category', '');
                                                        setIsCategoryOpen(false);
                                                    }}
                                                    className="w-full px-4 py-2.5 rounded-xl text-left text-sm hover:bg-white/5 transition-all flex items-center gap-3"
                                                >
                                                    <Tag className="w-4 h-4 text-muted-foreground" />
                                                    No category
                                                </button>
                                                <div className="h-px bg-white/5 my-1" />
                                                {categories.map((cat) => (
                                                    <button
                                                        key={cat.id}
                                                        type="button"
                                                        onClick={() => {
                                                            handleChange('category', cat.id);
                                                            setIsCategoryOpen(false);
                                                        }}
                                                        className="w-full px-4 py-2.5 rounded-xl text-left text-sm hover:bg-white/5 transition-all flex items-center justify-between group"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className={`${cat.color} group-hover:scale-110 transition-transform`}>{cat.icon}</span>
                                                            <span className={formData.category === cat.id ? 'text-primary' : ''}>{cat.label}</span>
                                                        </div>
                                                        {formData.category === cat.id && (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                                                        )}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Username/Email */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Username / Email <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => handleChange('username', e.target.value)}
                                        placeholder="user@example.com"
                                        className={`w-full px-4 py-3 bg-secondary/30 border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all ${errors.username ? 'border-destructive' : 'border-white/10'
                                            }`}
                                    />
                                    {errors.username && (
                                        <p className="text-destructive text-sm mt-1">{errors.username}</p>
                                    )}
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Password <span className="text-destructive">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={(e) => handleChange('password', e.target.value)}
                                            placeholder="••••••••••••"
                                            className={`w-full px-4 py-3 pr-12 bg-secondary/30 border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all ${errors.password ? 'border-destructive' : 'border-white/10'
                                                }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="text-destructive text-sm mt-1">{errors.password}</p>
                                    )}

                                    {/* Password Generator Collapsible */}
                                    <details className="mt-3 bg-white/5 rounded-xl overflow-hidden">
                                        <summary className="px-4 py-2 cursor-pointer hover:bg-white/10 transition-colors text-sm font-medium text-primary">
                                            🎲 Generate Strong Password
                                        </summary>
                                        <div className="p-4 border-t border-white/10">
                                            <PasswordGenerator onGenerate={(pwd) => handleChange('password', pwd)} />
                                        </div>
                                    </details>
                                </div>

                                {/* Security Challenge (Optional) */}
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Security Question <span className="text-muted-foreground">(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.securityQuestion || ''}
                                            onChange={(e) => handleChange('securityQuestion', e.target.value)}
                                            placeholder="e.g., What is your mother's maiden name?"
                                            className="w-full px-4 py-3 bg-secondary/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Security Answer <span className="text-muted-foreground">(Required if question set)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.securityAnswer || ''}
                                            onChange={(e) => handleChange('securityAnswer', e.target.value)}
                                            placeholder="Your secret answer"
                                            className="w-full px-4 py-3 bg-secondary/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Favorite Toggle */}
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                    <input
                                        type="checkbox"
                                        id="favorite"
                                        checked={formData.isFavorite || false}
                                        onChange={(e) => handleChange('isFavorite', e.target.checked)}
                                        className="w-5 h-5 rounded accent-primary cursor-pointer"
                                    />
                                    <label htmlFor="favorite" className="text-sm cursor-pointer">
                                        Mark as favorite
                                    </label>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-semibold transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all"
                                    >
                                        {mode === 'add' ? 'Add Entry' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
