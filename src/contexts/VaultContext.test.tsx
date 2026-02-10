import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { VaultProvider, useVault } from '../contexts/VaultContext';
import { ToastProvider } from '../contexts/ToastContext';
import { ReactNode } from 'react';

// Mock AuthContext
vi.mock('../contexts/AuthContext', async () => {
    const actual = await vi.importActual('../contexts/AuthContext');
    return {
        ...actual,
        useAuth: () => ({
            user: { id: 'test-user' },
            token: 'test-token',
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn()
        }),
        AuthProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>
    };
});

// Mock crypto service to avoid web crypto issues in jsdom
vi.mock('../services/crypto.service', () => ({
    cryptoService: {
        encrypt: vi.fn((data) => Promise.resolve(`encrypted-${data}`)),
        decrypt: vi.fn((data) => Promise.resolve(data.replace('encrypted-', ''))),
    }
}));

// Mock fetch
global.fetch = vi.fn(async (url, options) => {
    let responseVersion = 1;

    // If mocking sync response, mirror the version sent
    if (options && options.method === 'POST' && options.body) {
        try {
            const body = JSON.parse(options.body as string);
            // Find max version in update
            if (body.updated && body.updated.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const maxVer = Math.max(...body.updated.map((e: any) => e.version));
                responseVersion = maxVer;
            } else if (body.baseVersion) {
                // Return at least baseVersion if no updates (though sync shouldn't invoke then)
                responseVersion = body.baseVersion;
            }
        } catch (e) {
            console.error('Mock fetch parse error', e);
        }
    }

    return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
            success: true,
            vaultVersion: responseVersion,
            encryptedEntries: [],
            deltas: { added: [], updated: [], deleted: [] }
        })
    });
}) as any;

// Test Component to consume context
const TestComponent = () => {
    const { addEntry, deleteEntry, entries, syncStatus, isOnline, vaultVersion } = useVault();

    return (
        <div>
            <div data-testid="sync-status">{syncStatus}</div>
            <div data-testid="vault-version">{vaultVersion}</div>
            <div data-testid="online-status">{isOnline ? 'Online' : 'Offline'}</div>
            <div data-testid="entries-count">{entries.length}</div>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <button onClick={() => addEntry({ title: 'Test', username: 'user', password: 'pw' } as any)}>
                Add Entry
            </button>
            {entries.length > 0 && (
                <button onClick={() => deleteEntry(entries[0].id)}>Delete First</button>
            )}
        </div>
    );
};

const renderWithProviders = (ui: ReactNode) => {
    return render(
        <ToastProvider>
            <VaultProvider>
                {ui}
            </VaultProvider>
        </ToastProvider>
    );
};

describe('VaultContext Integration', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('should add an entry successfully', async () => {
        renderWithProviders(<TestComponent />);

        // Wait for initialization
        await waitFor(() => expect(screen.getByTestId('vault-version')).toHaveTextContent('1'), { timeout: 3000 });

        const btn = screen.getByText('Add Entry');
        await act(async () => {
            btn.click();
        });

        await waitFor(() => {
            expect(screen.getByTestId('entries-count')).toHaveTextContent('1');
        });
    });

    it('should mark entry as deleted (tombstone)', async () => {
        renderWithProviders(<TestComponent />);

        // Wait for initialization
        await waitFor(() => expect(screen.getByTestId('vault-version')).toHaveTextContent('1'), { timeout: 3000 });

        // Add
        const addBtn = screen.getByText('Add Entry');
        await act(async () => {
            addBtn.click();
        });
        await waitFor(() => expect(screen.getByTestId('entries-count')).toHaveTextContent('1'));

        // Delete
        const delBtn = screen.getByText('Delete First');
        await act(async () => {
            delBtn.click();
        });

        // Should return to 0 visible entries (context filters deleted)
        await waitFor(() => {
            expect(screen.getByTestId('entries-count')).toHaveTextContent('0');
        });
    });

    it('should queue changes to outbox when offline', async () => {
        // Mock offline
        Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
        window.dispatchEvent(new Event('offline'));

        renderWithProviders(<TestComponent />);

        // Verify initial state
        expect(screen.getByTestId('online-status')).toHaveTextContent('Offline');

        // Add Entry
        const btn = screen.getByText('Add Entry');
        await act(async () => {
            btn.click();
        });

        await waitFor(() => {
            expect(screen.getByTestId('entries-count')).toHaveTextContent('1');
        });

        // Check LocalStorage for outbox persistence
        await waitFor(() => {
            const outbox = JSON.parse(localStorage.getItem('vault_outbox_test-user') || '[]');
            expect(outbox).toHaveLength(1);
            expect(outbox[0].delta.updated).toHaveLength(1);
        });
    });
});
