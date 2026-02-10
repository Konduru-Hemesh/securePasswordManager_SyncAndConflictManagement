export interface VaultEntry {
    id: number;
    website: string;
    username: string;
    password: string;
    securityQuestion?: string;
    securityAnswer?: string;
    isFavorite: boolean;
    category?: string;
    passwordHistory?: Array<{ password: string; changedAt: string }>;
    conflictHistory?: Array<{
        password: string;
        resolvedAt: string;
        resolution: 'local-wins' | 'server-wins' | 'merged';
    }>;
    version: number;
    updatedAt: string;
    isDeleted?: boolean;
    deletedAt?: string;
}

export interface VaultState {
    entries: VaultEntry[];
    vaultVersion: number;
    serverVersion: number;
}

export interface SyncDelta {
    eventId: string;
    added: VaultEntry[];
    updated: VaultEntry[];
    deleted: number[];
    baseVersion: number;
}

export interface SyncResponse {
    success: boolean;
    vault_version: number;
    deltas?: {
        added: VaultEntry[];
        updated: VaultEntry[];
        deleted: number[];
    };
    conflict?: boolean;
    server_base_version?: number;
    server_entries?: any[]; // Encrypted entries for conflict resolution
}

export interface OutboxEvent {
    eventId: string;
    timestamp: number;
    delta: SyncDelta;
}
