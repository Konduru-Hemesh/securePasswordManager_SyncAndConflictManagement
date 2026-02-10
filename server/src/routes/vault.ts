import express, { Request, Response } from 'express';
import Vault from '../models/Vault';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/vault - Get user's vault
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        let vault = await Vault.findOne({ userId });

        if (!vault) {
            // Create initial empty vault if not exists
            vault = new Vault({ userId, vaultVersion: 0, encryptedEntries: [] });
            await vault.save();
        }

        res.json(vault);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/vault/sync - Sync deltas
router.post('/sync', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        const { baseVersion, added, updated, deleted, eventId } = req.body;

        const vault = await Vault.findOne({ userId });
        if (!vault) return res.status(404).json({ error: 'Vault not found' });

        // Conflict check: Strict Versioning
        // If client baseVersion != server current version, it means client is outdated.
        // We reject the sync and force client to pull first (or handle conflict).
        if (baseVersion !== vault.vaultVersion) {
            console.warn(`Conflict detected for user ${userId}: Client base ${baseVersion} vs Server ${vault.vaultVersion}`);
            return res.status(409).json({
                error: 'Sync Conflict',
                server_base_version: vault.vaultVersion,
                // In a full implementation, we might send the missing deltas here.
                // For now, client will just see the error and stop.
                vaultVersion: vault.vaultVersion,
                entries: vault.encryptedEntries // Send current state so client might manually resolve or re-base
            });
        }

        // Idempotency Check (Optional but good): 
        // We could store applied eventIds. For now, since we check baseVersion strictly, 
        // passing the same eventId with same baseVersion twice matches logic, but we increment version.
        // So second attempt fails conflict check. Perfect.

        let currentEntries = [...vault.encryptedEntries];

        // Apply Deletions (Legacy/Physical)
        // If client sends IDs in 'deleted', we physically remove them.
        if (deleted && deleted.length > 0) {
            currentEntries = currentEntries.filter(e => !deleted.includes(e.id));
        }

        // Apply Additions
        if (added && added.length > 0) {
            added.forEach((newEntry: any) => {
                if (!currentEntries.find(e => e.id === newEntry.id)) {
                    currentEntries.push(newEntry);
                }
            });
        }

        // Apply Updates (including Tombstones)
        if (updated && updated.length > 0) {
            updated.forEach((update: any) => {
                const index = currentEntries.findIndex(e => e.id === update.id);
                if (index !== -1) {
                    const existing = currentEntries[index];
                    // Server-side LWW check
                    // If strict versioning is on, we trust the client's update is based on latest.
                    // But we still check timestamps for sanity or sub-resource conflicts?
                    // Actually, if version matches, client knows checking against latest.
                    // So we overwrite.

                    // We merge, preserving sensitive server-side fields if any (none really)
                    currentEntries[index] = {
                        ...update, // This includes isDeleted: true if it's a tombstone
                        // Preserve history if present and not in update
                        conflictHistory: update.conflictHistory || existing.conflictHistory
                    };
                } else {
                    // Update for unknown ID? treat as add?
                    currentEntries.push(update);
                }
            });
        }

        // Increment Vault Version
        vault.vaultVersion += 1;
        vault.encryptedEntries = currentEntries;
        vault.lastSyncedAt = new Date();

        await vault.save();

        res.json({
            success: true,
            vaultVersion: vault.vaultVersion,
            entries: vault.encryptedEntries,
            lastSyncedAt: vault.lastSyncedAt
        });

    } catch (error) {
        console.error('Sync Error:', error);
        res.status(500).json({ error: 'Sync failed' });
    }
});

export default router;
