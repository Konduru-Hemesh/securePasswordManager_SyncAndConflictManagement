import type { VaultEntry, SyncDelta } from '../types/vault.types';

export const syncService = {
    /**
     * Calculates the delta between the local state and the base version.
     * In this simple implementation, we assume the base version is what the server last saw.
     */
    calculateDelta: (localEntries: VaultEntry[], baseVersion: number): SyncDelta => {
        // Filter changes that are newer than baseVersion
        const changes = localEntries.filter(e => e.version > baseVersion);

        // We put all changes into 'updated'. The server handles "Update for unknown ID" by adding it.
        // This avoids issues where 'added' requires version === 1, but we are moving to monotonic versions.
        const updated = changes; // Include tombstones (isDeleted=true)

        // DELETED: For physical deletes (if we used them). We use Tombstones (in updated) which is safer.
        // But if we wanted to support physical deletes, we'd populate this.
        const deleted: number[] = [];

        return {
            eventId: crypto.randomUUID(),
            added: [], // Always empty, handled by updated
            updated,
            deleted,
            baseVersion
        };
    },

    /**
     * Resolves conflicts deterministically.
     * Strategy: Last Writer Wins (based on updatedAt)
     */
    resolveConflicts: (localEntries: VaultEntry[], serverDeltas: SyncDelta): VaultEntry[] => {
        let merged = [...localEntries];

        // Handle Added from Server
        serverDeltas.added.forEach(serverEntry => {
            if (!merged.find(e => e.id === serverEntry.id)) {
                merged.push(serverEntry);
            }
        });

        serverDeltas.updated.forEach(serverEntry => {
            const index = merged.findIndex(e => e.id === serverEntry.id);
            if (index !== -1) {
                const localEntry = merged[index];
                if (new Date(serverEntry.updatedAt) > new Date(localEntry.updatedAt)) {
                    // Conflict detected (Server is newer)
                    // Store local state in conflict history before overwriting
                    const conflictHistory = localEntry.conflictHistory || [];
                    merged[index] = {
                        ...serverEntry,
                        conflictHistory: [
                            {
                                password: localEntry.password,
                                resolvedAt: new Date().toISOString(),
                                resolution: 'server-wins'
                            },
                            ...conflictHistory.slice(0, 4) // Keep last 5
                        ]
                    };
                }
            } else {
                merged.push(serverEntry);
            }
        });

        // Handle Deleted from Server
        serverDeltas.deleted.forEach(id => {
            merged = merged.filter(e => e.id !== id);
        });

        return merged;
    }
};
