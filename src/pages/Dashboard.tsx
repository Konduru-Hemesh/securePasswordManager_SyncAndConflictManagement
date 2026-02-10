import { useState, useEffect } from 'react';
import { Search, Plus, Star, Copy, Eye, Trash2, Edit, Check, EyeOff, Tag, Download, Upload, Shield, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileModal from '../components/ProfileModal';
import EntryModal from '../components/EntryModal';
import DeleteConfirm from '../components/DeleteConfirm';
import { useToast } from '../contexts/ToastContext';
import { useVault } from '../contexts/VaultContext';
import { useAuth } from '../contexts/AuthContext';
import { cryptoService } from '../services/crypto.service';
import { calculatePasswordStrength } from '../utils/passwordStrength';
import type { VaultEntry } from '../types/vault.types';

export default function Dashboard() {
    const { showToast } = useToast();
    const { user } = useAuth();
    const { entries, isSyncing, syncVault, addEntry, updateEntry, deleteEntry, lastSynced, isOnline, syncStatus } = useVault();
    const [search, setSearch] = useState('');
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [revealedIds, setRevealedIds] = useState<Record<number, string>>({});
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const statusMap = {
        synced: { label: 'In Sync', color: 'text-emerald-500' },
        pending: { label: 'Sync Pending', color: 'text-primary' },
        syncing: { label: 'Syncing...', color: 'text-primary' },
        offline: { label: 'Offline', color: 'text-orange-500' },
        error: { label: 'Sync Error', color: 'text-red-500' }
    };

    const currentStatus = statusMap[syncStatus] || statusMap.pending;

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<VaultEntry | undefined>(undefined);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [entryToDelete, setEntryToDelete] = useState<VaultEntry | null>(null);
    const [securityChallenge, setSecurityChallenge] = useState<{ isOpen: boolean; entryId: number | null; question: string; answer: string; input: string }>({
        isOpen: false,
        entryId: null,
        question: '',
        answer: '',
        input: ''
    });
    const clearClipboardSeconds = 30;

    const categories = ['all', ...Array.from(new Set(entries.map(e => e.category).filter(Boolean)))];

    const filteredEntries = entries.filter(e => {
        const matchesSearch = e.website.toLowerCase().includes(search.toLowerCase()) ||
            e.username.toLowerCase().includes(search.toLowerCase());
        const matchesFavorite = showFavoritesOnly ? e.isFavorite : true;
        const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
        return matchesSearch && matchesFavorite && matchesCategory;
    });

    const handleCopy = async (id: number, encryptedPass: string, secQuestion?: string, secAnswer?: string) => {
        if (secQuestion && secAnswer) {
            setSecurityChallenge({
                isOpen: true,
                entryId: id,
                question: secQuestion,
                answer: secAnswer,
                input: ''
            });
            return;
        }

        const pass = await cryptoService.decrypt(encryptedPass);
        executeCopy(id, pass);
    };

    const executeCopy = (id: number, password: string) => {
        navigator.clipboard.writeText(password);
        setCopiedId(id);
        showToast(`Password copied! Will clear in ${clearClipboardSeconds}s`, 'success');

        setTimeout(() => {
            setCopiedId(prev => (prev === id ? null : prev));
        }, clearClipboardSeconds * 1000);
    };

    const handleChallengeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const entry = entries.find(ent => ent.id === securityChallenge.entryId);
        if (!entry) return;

        if (securityChallenge.input.toLowerCase().trim() === entry.securityAnswer?.toLowerCase().trim()) {
            const pass = await cryptoService.decrypt(entry.password);
            executeCopy(entry.id, pass);
            setSecurityChallenge(prev => ({ ...prev, isOpen: false }));
        } else {
            showToast('Incorrect security answer', 'error');
        }
    };

    const handleReveal = async (id: number, encryptedPass: string) => {
        if (revealedIds[id]) {
            const next = { ...revealedIds };
            delete next[id];
            setRevealedIds(next);
            return;
        }

        const pass = await cryptoService.decrypt(encryptedPass);
        setRevealedIds(prev => ({ ...prev, [id]: pass }));
        setTimeout(() => {
            setRevealedIds(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }, 10000);
    };

    const toggleFavorite = (id: number) => {
        const entry = entries.find(e => e.id === id);
        if (entry) {
            updateEntry(id, { isFavorite: !entry.isFavorite });
        }
    };

    const handleAddNew = () => {
        setModalMode('add');
        setEditingEntry(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (entry: VaultEntry) => {
        setModalMode('edit');
        setEditingEntry(entry);
        setIsModalOpen(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSaveEntry = async (entryData: any) => {
        if (modalMode === 'edit' && editingEntry) {
            await updateEntry(editingEntry.id, entryData);
        } else {
            await addEntry(entryData);
        }
        setIsModalOpen(false);
    };

    const handleDeleteClick = (entry: VaultEntry) => {
        setEntryToDelete(entry);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (entryToDelete) {
            await deleteEntry(entryToDelete.id);
            setEntryToDelete(null);
        }
    };




    const handleExport = () => {
        const dataStr = JSON.stringify(entries, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vault-backup-encrypted-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('Vault exported (encrypted)', 'success');
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                if (Array.isArray(imported)) {
                    // Simple bulk import: add each entry
                    imported.forEach(entry => addEntry(entry));
                    showToast(`Imported ${imported.length} entries.`, 'success');
                } else {
                    showToast('Invalid vault file format', 'error');
                }
            } catch {
                showToast('Failed to import vault', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    useEffect(() => {
        const handleKeyboard = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                handleAddNew();
            }
        };

        window.addEventListener('keydown', handleKeyboard);
        return () => window.removeEventListener('keydown', handleKeyboard);
    }, []);

    // ... existing imports ...

    const getFavicon = (url: string) => {
        try {
            let domain = url;
            if (!url.includes('.')) {
                domain = `${url}.com`;
            }
            domain = new URL(domain.startsWith('http') ? domain : `https://${domain}`).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch {
            return null;
        }
    };

    const securityScore = entries.length > 0
        ? Math.round((entries.reduce((acc, entry) => acc + calculatePasswordStrength(entry.password).score, 0) / (entries.length * 4)) * 100)
        : 100;

    return (
        <div className="min-h-screen bg-background pb-24">
            <div className="border-b border-border/40 glass-panel sticky top-0 z-10 transition-all backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    {/* Header Top Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-display font-bold text-foreground">Your Vault</h1>
                                <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-lg border border-white/10">
                                    <button
                                        onClick={syncVault}
                                        disabled={isSyncing || !isOnline}
                                        className={`p-1 rounded-md hover:bg-white/5 transition-all ${isSyncing ? 'animate-spin text-primary' : isOnline ? 'text-emerald-500' : 'text-muted-foreground'}`}
                                        title={lastSynced ? `Last synced: ${new Date(lastSynced).toLocaleTimeString()}` : 'Not synced yet'}
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                    </button>
                                    <span className={`text-[10px] uppercase tracking-wider font-bold ${currentStatus.color}`}>
                                        {currentStatus.label}
                                    </span>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center mt-1">
                                <span className={`w-2 h-2 rounded-full mr-2 animate-pulse ${securityScore > 70 ? 'bg-emerald-500' : securityScore > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                Security Score: {securityScore}% • {entries.length} Entries
                            </p>
                        </div>

                        {/* Vault Health Bar */}
                        <div className="flex-1 max-w-md hidden md:block px-6">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Vault Health</span>
                                <span>{securityScore}%</span>
                            </div>
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${securityScore}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={`h-full rounded-full ${securityScore > 70 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : securityScore > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {/* Profile Button */}
                            <button
                                onClick={() => setIsProfileModalOpen(true)}
                                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center border border-white/5 overflow-hidden"
                                title={user?.email || 'My Profile'}
                            >
                                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold">
                                    {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'V'}
                                </div>
                            </button>

                            <button
                                onClick={handleExport}
                                className="px-3 py-2 rounded-xl font-medium flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-all text-sm"
                                title="Export Vault"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">Export</span>
                            </button>
                            <label className="px-3 py-2 rounded-xl font-medium flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-all text-sm cursor-pointer" title="Import Vault">
                                <Upload className="w-4 h-4" />
                                <span className="hidden sm:inline">Import</span>
                                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                            </label>

                            <button
                                onClick={handleAddNew}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all glow-on-hover ripple shadow-lg shadow-primary/20"
                            >
                                <Plus className="w-5 h-5" />
                                <span className="hidden sm:inline">Add Entry</span>
                            </button>
                        </div>
                    </div>

                    {/* Filters Row */}
                    <div className="flex gap-2 flex-wrap items-center">
                        {/* ... Filters ... */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search vault... (Ctrl+K)"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-primary/50 outline-none transition-all text-sm"
                            />
                        </div>
                        <button
                            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                            className={`px-3 py-2 rounded-xl font-medium flex items-center gap-2 transition-all text-sm border ${showFavoritesOnly
                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                : 'bg-white/5 text-muted-foreground border-white/5 hover:bg-white/10'
                                } `}
                        >
                            <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                        </button>

                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-3 py-2 rounded-xl font-medium bg-white/5 hover:bg-white/10 border border-white/10 outline-none transition-all text-sm appearance-none cursor-pointer min-w-[120px]"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat} className="bg-gray-900">
                                    {cat === 'all' ? 'All Categories' : cat}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {filteredEntries.length === 0 ? (
                    // ... Empty State ...
                    <div className="text-center py-20 rounded-3xl border border-dashed border-white/10 bg-card/30 backdrop-blur-sm">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search className="w-10 h-10 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-foreground">No entries found</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                            {search || showFavoritesOnly ? 'Try adjusting your filters to find what you need.' : 'Your vault is empty. Secure you first password now.'}
                        </p>
                        {!search && !showFavoritesOnly && (
                            <button
                                onClick={handleAddNew}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 transition-all shadow-lg hover:translate-y-[-2px]"
                            >
                                <Plus className="w-5 h-5" />
                                Add First Entry
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {filteredEntries.map((entry, index) => {
                                const favicon = getFavicon(entry.website);

                                return (
                                    <motion.div
                                        key={entry.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: index * 0.05, duration: 0.3 }}
                                        className="glass-panel p-5 rounded-2xl transition-all group hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 p-2 flex items-center justify-center border border-white/10 flex-shrink-0">
                                                    {favicon ? (
                                                        <img
                                                            src={favicon}
                                                            alt=""
                                                            className="w-6 h-6 object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                                                        />
                                                    ) : null}
                                                    <div className={`${favicon ? 'hidden' : ''} w-full h-full flex items-center justify-center`}>
                                                        <span className="text-lg font-bold text-muted-foreground uppercase">{entry.website.charAt(0)}</span>
                                                    </div>
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">{entry.website}</h3>
                                                    <p className="text-sm text-muted-foreground truncate">{entry.username}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => toggleFavorite(entry.id)}
                                                className="text-muted-foreground hover:text-yellow-500 transition-colors p-1"
                                            >
                                                <Star className={`w-5 h-5 ${entry.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                            </button>
                                        </div>

                                        <div className="mb-4 flex flex-wrap items-center gap-2">
                                            {entry.version > 1 && (
                                                <div className="px-2.5 py-1 rounded-md text-xs font-medium border text-primary bg-primary/10 border-primary/20">
                                                    v{entry.version}
                                                </div>
                                            )}
                                            {entry.category && (
                                                <div className="px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1 text-muted-foreground bg-white/5 border-white/5">
                                                    <Tag className="w-3 h-3" />
                                                    {entry.category}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mb-4 bg-black/40 rounded-xl p-3 font-mono text-sm border border-white/5 flex items-center gap-2 group/pass">
                                            <span className="flex-1 truncate tracking-wider text-muted-foreground/70 group-hover/pass:text-foreground transition-colors">
                                                {revealedIds[entry.id] || '••••••••••••'}
                                            </span>
                                            <button
                                                onClick={() => handleReveal(entry.id, entry.password)}
                                                className="text-muted-foreground hover:text-primary transition-colors p-1"
                                            >
                                                {revealedIds[entry.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleCopy(entry.id, entry.password, entry.securityQuestion, entry.securityAnswer)}
                                                className="flex-1 bg-white/5 hover:bg-primary/20 hover:text-primary hover:border-primary/30 border border-white/5 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-sm"
                                            >
                                                {copiedId === entry.id ? (
                                                    <>
                                                        <Check className="w-4 h-4" />
                                                        Copied
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-4 h-4" />
                                                        Copy
                                                    </>
                                                )}
                                            </button>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleEdit(entry)}
                                                    className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-muted-foreground hover:text-foreground"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(entry)}
                                                    className="p-2.5 bg-white/5 hover:bg-red-500/20 hover:text-red-500 rounded-xl transition-colors text-muted-foreground"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <EntryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveEntry}
                entry={editingEntry}
                mode={modalMode}
            />

            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />

            <DeleteConfirm
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleDeleteConfirm}
                entryName={entryToDelete?.website || ''}
            />

            {/* Security Challenge Modal */}
            <AnimatePresence>
                {securityChallenge.isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSecurityChallenge(prev => ({ ...prev, isOpen: false }))}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                        />
                        <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="glass-panel p-6 rounded-3xl w-full max-w-sm border-2 border-white/10"
                            >
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-primary" />
                                    Security Check
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Please answer the security question to copy this password.
                                </p>
                                <div className="p-3 bg-white/5 rounded-xl mb-4 font-medium">
                                    {securityChallenge.question}
                                </div>
                                <form onSubmit={handleChallengeSubmit} className="space-y-4">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={securityChallenge.input}
                                        onChange={(e) => setSecurityChallenge(prev => ({ ...prev, input: e.target.value }))}
                                        placeholder="Enter answer..."
                                        className="w-full px-4 py-3 bg-secondary/30 border border-white/10 rounded-xl text-center focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                    />
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setSecurityChallenge(prev => ({ ...prev, isOpen: false }))}
                                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-semibold transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all"
                                        >
                                            Verify
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
