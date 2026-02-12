import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { VaultEntry, VaultState } from '../types/vault.types';
import { cryptoService } from '../services/crypto.service';
import { syncService } from '../services/sync.service';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

interface VaultContextType {
    entries: VaultEntry[];
    vaultVersion: number;
    serverVersion: number;
    isSyncing: boolean;
    isOnline: boolean;
    syncStatus: 'synced' | 'pending' | 'syncing' | 'offline' | 'error';
    lastSynced: string | null;
    addEntry: (entry: Omit<VaultEntry, 'id' | 'version' | 'updatedAt' | 'passwordHistory'>) => Promise<void>;
    updateEntry: (id: number, entry: Partial<VaultEntry>) => Promise<void>;
    deleteEntry: (id: number) => Promise<void>;
    syncVault: () => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

const API_BASE_URL = 'http://localhost:5000/api/vault';

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { showToast } = useToast();
    const { user, token } = useAuth();
    const [entries, setEntries] = useState<VaultEntry[]>([]);
    const [vaultVersion, setVaultVersion] = useState<number>(0);
    const [serverVersion, setServerVersion] = useState<number>(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isOnline, setIsOnline] = useState(window.navigator.onLine);
    const [syncError, setSyncError] = useState(false);
    const [syncConflict, setSyncConflict] = useState(false);
    const [lastSynced, setLastSynced] = useState<string | null>(null);
    const [outbox, setOutbox] = useState<import('../types/vault.types').OutboxEvent[]>([]);
    const [retryTrigger, setRetryTrigger] = useState(0);
    const userId = user?.id;

    const syncStatus = useMemo(() => {
        if (syncConflict) return 'error';
        if (syncError) return 'error';
        if (isSyncing) return 'syncing';
        if (outbox.length > 0) return 'pending';
        // Check version mismatch (Pending means we have local changes not yet synced/outboxed)
        if (vaultVersion > serverVersion) return 'pending';
        return isOnline ? 'synced' : 'offline';
    }, [isSyncing, syncError, syncConflict, vaultVersion, serverVersion, isOnline, outbox.length]);

    // Initialize logic
    useEffect(() => {
        const initializeVault = async () => {
            if (!userId) return;

            // Load Outbox
            const savedOutboxStr = localStorage.getItem(`vault_outbox_${userId}`);
            let currentOutbox: import('../types/vault.types').OutboxEvent[] = [];
            if (savedOutboxStr) {
                try {
                    currentOutbox = JSON.parse(savedOutboxStr);
                    setOutbox(currentOutbox);
                } catch (e) {
                    console.error('Failed to parse outbox', e);
                }
            }

            // 1. Try to fetch from server first
            if (isOnline && token) {
                try {
                    const response = await fetch(API_BASE_URL, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        console.log('Initial fetch success:', data);

                        // Conflict Resolution on Load: Check for stale outbox
                        if (currentOutbox.length > 0) {
                            const firstEvent = currentOutbox[0];
                            const serverVer = data.vaultVersion || 0;
                            // If our baseVersion matches server, we are good to sync. 
                            // If baseVersion != serverVer, we are stale.
                            if (firstEvent.delta.baseVersion !== serverVer) {
                                console.warn(`Conflict detected on load. Pruning stale outbox (Base ${firstEvent.delta.baseVersion} vs Server ${serverVer})`);
                                setOutbox([]);
                                currentOutbox = [];
                                localStorage.removeItem(`vault_outbox_${userId}`);
                                showToast('Conflict resolved: Local changes discarded.', 'info');
                            }
                        }

                        if (currentOutbox.length === 0) {
                            setEntries(data.encryptedEntries || []);
                            setVaultVersion(data.vaultVersion || 0);
                        } else {
                            console.log('Outbox pending - skipping overwrite of local entries until sync completes.');
                        }

                        setServerVersion(data.vaultVersion || 0);
                        setSyncError(false);
                        setSyncConflict(false);
                        return;
                    }
                } catch (e) {
                    console.error('Failed to fetch from server', e);
                    setSyncError(true);
                }
            }

            // 2. Fallback to localStorage
            const savedData = localStorage.getItem(`vault_storage_${userId}`);
            if (savedData) {
                try {
                    const parsed: VaultState = JSON.parse(savedData);
                    setEntries(parsed.entries || []);
                    setVaultVersion(parsed.vaultVersion || 0);
                    setServerVersion(parsed.serverVersion || 0);
                    setSyncError(false);
                } catch (e) {
                    console.error('Failed to parse (fallback)', e);
                }
            }
        };

        initializeVault();
    }, [userId, isOnline, token]);

    // Save Outbox
    useEffect(() => {
        if (userId) {
            localStorage.setItem(`vault_outbox_${userId}`, JSON.stringify(outbox));
        }
    }, [outbox, userId]);

    // Clear state on logout
    useEffect(() => {
        if (!userId) {
            setEntries([]);
            setVaultVersion(0);
            setServerVersion(0);
            setOutbox([]);
            setSyncConflict(false);
        }
    }, [userId]);

    // Online/Offline listeners
    useEffect(() => {
        const handleOnline = () => {
            console.log('Network status: ONLINE');
            setIsOnline(true);
            showToast('Back online — resuming sync...', 'info');
        };
        const handleOffline = () => {
            console.log('Network status: OFFLINE');
            setIsOnline(false);
            showToast('Offline — changes queued', 'warning');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [showToast]);

    // Define syncVault properly to be used in effects
    const syncVault = useCallback(async () => {
        if (!userId || syncConflict) return;

        // Force retry of pending items if called manually
        setRetryTrigger(prev => prev + 1);
        setSyncError(false); // Clear error allowing retry

        console.log(`Checking for changes... Vault v${vaultVersion} vs Server v${serverVersion}`);
        console.log('Entries:', entries.length);

        const delta = syncService.calculateDelta(entries, serverVersion);
        console.log('Calculated Delta:', delta);

        if (delta.added.length === 0 && delta.updated.length === 0 && delta.deleted.length === 0) {
            console.log('No changes to sync.');
            return;
        }

        const event: import('../types/vault.types').OutboxEvent = {
            eventId: delta.eventId,
            timestamp: Date.now(),
            delta
        };

        console.log('Queueing event to outbox:', event);

        setOutbox(prev => {
            const last = prev[prev.length - 1];
            // Optimization: Merge if same baseVersion
            if (last && last.delta.baseVersion === delta.baseVersion) {
                console.log('Merging with previous outbox event');
                return [...prev.slice(0, -1), event];
            }
            return [...prev, event];
        });

    }, [userId, entries, serverVersion, syncConflict]); // vaultVersion implied by entries check

    // Auto-trigger sync generation when version changes
    // Auto-trigger sync generation when version changes
    useEffect(() => {
        // If we have changes (vault > server) and no pending outbox (or maybe we want to keep adding?)
        // If outbox is empty, definitely generate.
        // If outbox has items, we might want to wait? 
        // Current logic: If outbox is empty, we are ready to generate next batch.
        // CHANGED: Removed isOnline check so we queue to outbox even if offline.
        if (vaultVersion > serverVersion && outbox.length === 0) {
            console.log('Auto-triggering syncVault...');
            syncVault();
        }
    }, [vaultVersion, serverVersion, outbox.length, syncVault]);

    // Persist storage
    useEffect(() => {
        if (userId) {
            const state: VaultState = { entries, vaultVersion, serverVersion };
            localStorage.setItem(`vault_storage_${userId}`, JSON.stringify(state));
        }
    }, [entries, vaultVersion, serverVersion, userId]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addEntry = useCallback(async (entryData: any) => {
        const newEntry: VaultEntry = {
            ...entryData,
            id: Date.now(),
            version: Math.max(vaultVersion, serverVersion) + 1,
            updatedAt: new Date().toISOString(),
            passwordHistory: [],
            isFavorite: entryData.isFavorite || false,
            isDeleted: false
        };

        newEntry.password = await cryptoService.encrypt(newEntry.password);

        setEntries(prev => [...prev, newEntry]);
        setVaultVersion(Math.max(vaultVersion, serverVersion) + 1);
        showToast('Entry added', 'success');
        // Removed requestAnimationFrame manual call. Rely on Effect.
    }, [showToast, vaultVersion, serverVersion]);

    const updateEntry = useCallback(async (id: number, entryData: Partial<VaultEntry>) => {
        const finalEntryData = { ...entryData };
        const existing = entries.find(e => e.id === id);

        if (existing && entryData.password && entryData.password !== existing.password) {
            finalEntryData.password = await cryptoService.encrypt(entryData.password);
        }

        setEntries(prev => prev.map(e => {
            if (e.id === id) {
                const isPasswordChanged = entryData.password && entryData.password !== e.password;
                let passwordHistory = e.passwordHistory || [];

                if (isPasswordChanged) {
                    passwordHistory = [
                        { password: e.password, changedAt: new Date().toISOString() },
                        ...passwordHistory.slice(0, 4)
                    ];
                }

                return {
                    ...e,
                    ...finalEntryData,
                    version: Math.max(vaultVersion, serverVersion) + 1,
                    updatedAt: new Date().toISOString(),
                    passwordHistory,
                    isDeleted: false
                };
            }
            return e;
        }));

        setVaultVersion(Math.max(vaultVersion, serverVersion) + 1);
        showToast('Entry updated', 'success');
        // Removed requestAnimationFrame
    }, [entries, showToast, vaultVersion, serverVersion]);

    const deleteEntry = useCallback(async (id: number) => {
        setEntries(prev => prev.map(e => {
            if (e.id === id) {
                return {
                    ...e,
                    isDeleted: true,
                    deletedAt: new Date().toISOString(),
                    version: Math.max(vaultVersion, serverVersion) + 1,
                    updatedAt: new Date().toISOString()
                };
            }
            return e;
        }));
        setVaultVersion(Math.max(vaultVersion, serverVersion) + 1);
        showToast('Entry deleted', 'success');
        // Removed requestAnimationFrame
    }, [showToast, vaultVersion, serverVersion]);

    // Process Outbox Effect
    useEffect(() => {
        let mounted = true;
        const process = async () => {
            if (!isOnline || outbox.length === 0 || syncConflict || !userId || !token) {
                // logs can be noisy, but good for debug
                // console.log('Skipping process:', { isOnline, len: outbox.length, syncConflict, userId });
                return;
            }

            setIsSyncing(true);
            const event = outbox[0];
            console.log('Processing outbox event:', event.eventId);

            try {
                const response = await fetch(`${API_BASE_URL}/sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(event.delta)
                });

                console.log('Sync Response Status:', response.status);

                if (response.status === 409) {
                    const errorJson = await response.json();
                    console.warn('Sync Conflict:', errorJson);
                    setSyncConflict(true);
                    setSyncError(true);
                    showToast('Sync Conflict detected! Please refresh.', 'error');
                    setIsSyncing(false);
                    return;
                }

                if (!response.ok) throw new Error(`Sync failed: ${response.statusText}`);

                const result = await response.json();
                console.log('Sync Success:', result);

                if (mounted) {
                    // Success - Remove from Outbox
                    setOutbox(prev => prev.filter(e => e.eventId !== event.eventId));

                    if (result.entries) {
                        setEntries(result.entries);
                        setVaultVersion(result.vaultVersion || result.entries.length);
                    }
                    setServerVersion(result.vaultVersion || result.entries.length);
                    setLastSynced(result.lastSyncedAt);
                    setSyncError(false);
                    showToast('Sync completed', 'success');
                }
            } catch (error) {
                console.error('Sync processing error', error);
                if (mounted) setSyncError(true);
            } finally {
                // If we unmount, we can't update state, but usually effect cleanup handles 'mounted'
                if (mounted) setIsSyncing(false);
            }
        };

        if (isOnline && outbox.length > 0 && !isSyncing) {
            process();
        }

        return () => { mounted = false; };
    }, [outbox, isOnline, syncConflict, token, userId, showToast, retryTrigger]); // Added retryTrigger

    return (
        <VaultContext.Provider value={{
            entries: entries.filter(e => !e.isDeleted),
            vaultVersion,
            serverVersion,
            isSyncing,
            isOnline,
            syncStatus,
            lastSynced,
            addEntry,
            updateEntry,
            deleteEntry,
            syncVault
        }}>
            {children}
        </VaultContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useVault = () => {
    const context = useContext(VaultContext);
    if (!context) throw new Error('useVault must be used within a VaultProvider');
    return context;
};
