import mongoose, { Schema, Document } from 'mongoose';

export interface IVault extends Document {
    userId: string;
    vaultVersion: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    encryptedEntries: any[];
    lastSyncedAt: Date;
}

/**
 * Mongoose Schema for the Vault model.
 * Stores user's encrypted vault data and sync status.
 *
 * @typedef {Object} IVault
 * @property {string} userId - Reference to the User who owns this vault.
 * @property {number} vaultVersion - Version number for sync conflict resolution.
 * @property {Array} encryptedEntries - List of encrypted password entries.
 * @property {Date} lastSyncedAt - Timestamp of the last successful sync.
 */
const VaultSchema: Schema = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    vaultVersion: { type: Number, default: 0 },
    encryptedEntries: { type: Array, default: [] },
    lastSyncedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IVault>('Vault', VaultSchema);
