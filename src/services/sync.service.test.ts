/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { syncService } from './sync.service';
import type { VaultEntry } from '../types/vault.types';

describe('syncService', () => {
    describe('calculateDelta', () => {
        it('should return empty delta when no changes', () => {
            const entries: VaultEntry[] = [
                { id: 1, version: 1, data: 'test', updatedAt: '2023-01-01', passwordHistory: [], isFavorite: false, isDeleted: false } as any
            ];
            const baseVersion = 1;
            const delta = syncService.calculateDelta(entries, baseVersion);

            expect(delta.added).toHaveLength(0);
            expect(delta.updated).toHaveLength(0);
            expect(delta.deleted).toHaveLength(0);
        });

        it('should detect updated entries (version > baseVersion)', () => {
            const entries: VaultEntry[] = [
                { id: 1, version: 2, data: 'updated', updatedAt: '2023-01-02' } as any
            ];
            const baseVersion = 1;
            const delta = syncService.calculateDelta(entries, baseVersion);

            expect(delta.updated).toHaveLength(1);
            expect(delta.updated[0].id).toBe(1);
            expect(delta.added).toHaveLength(0);
        });

        it('should include tombstones in updated array', () => {
            const entries: VaultEntry[] = [
                { id: 1, version: 2, isDeleted: true, updatedAt: '2023-01-02' } as any
            ];
            const baseVersion = 1;
            const delta = syncService.calculateDelta(entries, baseVersion);

            expect(delta.updated).toHaveLength(1);
            expect(delta.updated[0].isDeleted).toBe(true);
        });
    });

    describe('resolveConflicts', () => {
        it('should merge server additions', () => {
            const local: VaultEntry[] = [{ id: 1, version: 1, updatedAt: '2023-01-01' } as any];
            const serverDelta = {
                baseVersion: 1,
                eventId: 'evt',
                added: [{ id: 2, version: 2, updatedAt: '2023-01-02' } as any],
                updated: [],
                deleted: []
            };

            const resolved = syncService.resolveConflicts(local, serverDelta);
            expect(resolved).toHaveLength(2);
            expect(resolved.find(e => e.id === 2)).toBeDefined();
        });

        it('should resolve update conflict using Last Writer Wins (Server Wins)', () => {
            const local: VaultEntry[] = [{ id: 1, version: 1, updatedAt: '2023-01-01T10:00:00Z', password: 'local' } as any];
            const serverDelta = {
                baseVersion: 1,
                eventId: 'evt',
                added: [],
                updated: [{ id: 1, version: 2, updatedAt: '2023-01-01T11:00:00Z', password: 'server' } as any],
                deleted: []
            };

            const resolved = syncService.resolveConflicts(local, serverDelta);
            expect(resolved[0].password).toBe('server');
            expect(resolved[0].conflictHistory).toBeDefined();
        });

        it('should resolve update conflict using Last Writer Wins (Local Wins)', () => {
            // In current implementation resolveConflicts handles Server Deltas. 
            // If local has a LATER timestamp than server, we typically keep local? 
            // But the function definition says: if (server.updatedAt > local.updatedAt) overwrite.
            // Else... it does nothing (keeps local).

            const local: VaultEntry[] = [{ id: 1, version: 1, updatedAt: '2023-01-01T12:00:00Z', password: 'local' } as any];
            const serverDelta = {
                baseVersion: 1,
                eventId: 'evt',
                added: [],
                updated: [{ id: 1, version: 2, updatedAt: '2023-01-01T11:00:00Z', password: 'server' } as any],
                deleted: []
            };

            const resolved = syncService.resolveConflicts(local, serverDelta);
            expect(resolved[0].password).toBe('local');
        });
    });
});
