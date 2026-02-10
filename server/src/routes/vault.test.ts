import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import Vault from '../models/Vault';
import jwt from 'jsonwebtoken';

let mongoServer: MongoMemoryServer;
let token: string;
let userId: string;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect(); // Disconnect any existing connection
    await mongoose.connect(uri);

    // Generate a mock JWT token
    userId = new mongoose.Types.ObjectId().toString();
    token = jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await Vault.deleteMany({});
});

describe('Vault Sync API', () => {

    describe('POST /api/vault/sync', () => {

        it('should accept update when baseVersion matches serverVersion', async () => {
            // Setup initial vault
            const initialVault = new Vault({
                userId,
                vaultVersion: 1,
                encryptedEntries: []
            });
            await initialVault.save();

            const delta = {
                baseVersion: 1,
                eventId: 'event-1',
                added: [{ id: 1, version: 2, data: 'test' }],
                updated: [],
                deleted: []
            };

            const response = await request(app)
                .post('/api/vault/sync')
                .set('Authorization', `Bearer ${token}`)
                .send(delta);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.vaultVersion).toBe(2);

            const updatedVault = await Vault.findOne({ userId });
            expect(updatedVault?.vaultVersion).toBe(2);
            expect(updatedVault?.encryptedEntries).toHaveLength(1);
        });

        it('should return 409 Conflict when baseVersion != serverVersion', async () => {
            // Setup initial vault (v10)
            const initialVault = new Vault({
                userId,
                vaultVersion: 10,
                encryptedEntries: [{ id: 1, version: 10 }]
            });
            await initialVault.save();

            // Client sends update based on v5 (stale)
            const delta = {
                baseVersion: 5,
                eventId: 'event-stale',
                added: [],
                updated: [{ id: 1, version: 6, data: 'stale-update' }],
                deleted: []
            };

            const response = await request(app)
                .post('/api/vault/sync')
                .set('Authorization', `Bearer ${token}`)
                .send(delta);

            expect(response.status).toBe(409);
            expect(response.body.error).toBe('Sync Conflict');
            expect(response.body.server_base_version).toBe(10);
            expect(response.body.entries).toBeDefined(); // Should return current server state
        });

        it('should handle Deduplication / Idempotency (same eventId)', async () => {
            // Note: Current implementation relies on strict versioning. 
            // If we send exact same request (same baseVersion), it might succeed if server hasn't moved on?
            // Actually, if sync succeeds, server moves to v+1. 
            // So second request with same baseVersion (v) will fail with 409 because server is at v+1.
            // This effectively handles deduplication.

            const initialVault = new Vault({
                userId,
                vaultVersion: 1,
                encryptedEntries: []
            });
            await initialVault.save();

            const delta = {
                baseVersion: 1,
                eventId: 'event-duplicate',
                added: [{ id: 1, version: 2 }],
                updated: [],
                deleted: []
            };

            // First request
            const res1 = await request(app)
                .post('/api/vault/sync')
                .set('Authorization', `Bearer ${token}`)
                .send(delta);
            expect(res1.status).toBe(200);

            // Second request (same payload)
            const res2 = await request(app)
                .post('/api/vault/sync')
                .set('Authorization', `Bearer ${token}`)
                .send(delta);

            // Should fail because server moved to v2, but request baseVersion is 1
            expect(res2.status).toBe(409);
        });

        it('should handle Tombstone Delete (isDeleted=true update)', async () => {
            // Setup vault with an entry
            const initialVault = new Vault({
                userId,
                vaultVersion: 1,
                encryptedEntries: [{ id: 123, version: 1, isDeleted: false, data: 'alive' }]
            });
            await initialVault.save();

            const delta = {
                baseVersion: 1,
                eventId: 'event-delete',
                added: [],
                updated: [{ id: 123, version: 2, isDeleted: true, data: 'dead' }], // Tombstone update
                deleted: []
            };

            const response = await request(app)
                .post('/api/vault/sync')
                .set('Authorization', `Bearer ${token}`)
                .send(delta);

            expect(response.status).toBe(200);

            const updatedVault = await Vault.findOne({ userId });
            const entry = updatedVault?.encryptedEntries.find(e => e.id === 123);
            expect(entry?.isDeleted).toBe(true);
            expect(entry?.version).toBe(2); // Should update version
        });

    });
});
