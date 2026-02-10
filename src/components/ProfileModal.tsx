import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Camera, Save } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

interface ProfileData {
    displayName: string;
    avatarUrl: string;
    bannerColor: string;
}

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const { showToast } = useToast();
    const { user, token } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [profile, setProfile] = useState<ProfileData>({
        displayName: user?.displayName || 'Vault Keeper',
        avatarUrl: '',
        bannerColor: '#10b981' // Default emerald-500
    });

    useEffect(() => {
        if (user) {
            setProfile(prev => ({
                ...prev,
                displayName: user.displayName || prev.displayName
            }));
        }
    }, [user]);

    useEffect(() => {
        const saved = localStorage.getItem('userProfile');
        if (saved) {
            setProfile(JSON.parse(saved));
        }
    }, []);

    const handleSave = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/auth/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ displayName: profile.displayName })
            });

            if (!response.ok) throw new Error('Failed to update profile');

            const updatedUser = await response.json();
            localStorage.setItem('vault_user', JSON.stringify(updatedUser));

            localStorage.setItem('userProfile', JSON.stringify(profile));
            showToast('Profile updated', 'success');
            onClose();
            window.location.reload(); // Refresh to update AuthContext (simple way)
        } catch {
            showToast('Failed to update profile', 'error');
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile(prev => ({ ...prev, avatarUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-card border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                    >
                        {/* Banner */}
                        <div
                            className="h-32 w-full transition-colors duration-300"
                            style={{ backgroundColor: profile.bannerColor }}
                        />

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors backdrop-blur-md"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="px-6 pb-6">
                            {/* Avatar */}
                            <div className="relative -mt-16 mb-4 w-32 h-32 mx-auto group">
                                <div className="w-full h-full rounded-full border-4 border-card overflow-hidden bg-muted relative">
                                    {profile.avatarUrl ? (
                                        <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-muted">
                                            <User className="w-12 h-12 text-muted-foreground" />
                                        </div>
                                    )}

                                    {/* Edit Overlay */}
                                    <div
                                        onClick={handleAvatarClick}
                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity duration-200"
                                    >
                                        <Camera className="w-8 h-8 text-white" />
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>
                            </div>

                            {/* Form Fields */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground ml-1 uppercase tracking-wider">Display Name</label>
                                    <input
                                        type="text"
                                        value={profile.displayName}
                                        onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                                        className="w-full mt-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-center font-bold text-xl"
                                        placeholder="Enter your name"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground ml-1 uppercase tracking-wider">Banner Color</label>
                                    <div className="flex gap-2 mt-2 justify-center flex-wrap">
                                        {colors.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setProfile(prev => ({ ...prev, bannerColor: color }))}
                                                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${profile.bannerColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSave}
                                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
                                >
                                    <Save className="w-4 h-4" />
                                    Save Profile
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
