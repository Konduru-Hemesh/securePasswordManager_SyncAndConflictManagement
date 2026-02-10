import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { VaultProvider, useVault } from '../contexts/VaultContext';
import { AuthProvider } from '../contexts/AuthContext';
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

// Test Component to consume context
const TestComponent = () => {
    const { addEntry, entries, syncStatus, isOnline } = useVault();

    return (
        <div>
            <div data-testid="sync-status">{syncStatus}</div>
            <div data-testid="online-status">{isOnline ? 'Online' : 'Offline'}</div>
            <div data-testid="entries-count">{entries.length}</div>
            <button onClick={() => addEntry({ title: 'Test', username: 'user', password: 'pw' } as any)}>
                Add Entry
            </button>
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

    it('should queue changes to outbox when offline', async () => {
        // Mock offline
        Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
        window.dispatchEvent(new Event('offline'));

        renderWithProviders(<TestComponent />);

        // Verify initial state
        expect(screen.getByTestId('online-status')).toHaveTextContent('Offline');

        // Add Entry
        const btn = screen.getByText('Add Entry');
        btn.click(); // Synchronous click, but addEntry is async. Vault updates state.

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

    // Note: Testing full sync loop requires mocking fetch/MSW which we can add. 
    // For now, this validates the key requirement: Offline -> Outbox persistence.
});
