import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthState } from '../types/auth.types';
import { useToast } from './ToastContext';

interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, displayName?: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = 'http://localhost:5000/api/auth';

/**
 * Provider component for the Authentication Context.
 * 
 * Manages the user's authentication state, including:
 * - Storing/retrieving the JWT token from localStorage
 * - persisting user session
 * - Handling login and registration API calls
 * 
 * @param {object} props - Component props.
 * @param {React.ReactNode} props.children - Child components.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { showToast } = useToast();
    const [state, setState] = useState<AuthState>({
        user: null,
        token: localStorage.getItem('vault_token'),
        isAuthenticated: !!localStorage.getItem('vault_token'),
        isLoading: true,
    });

    useEffect(() => {
        const initializeAuth = async () => {
            const token = localStorage.getItem('vault_token');
            const savedUser = localStorage.getItem('vault_user');

            if (token && savedUser) {
                try {
                    setState({
                        user: JSON.parse(savedUser),
                        token,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch {
                    localStorage.removeItem('vault_token');
                    localStorage.removeItem('vault_user');
                    setState(prev => ({ ...prev, isLoading: false, token: null, isAuthenticated: false }));
                }
            } else {
                setState(prev => ({ ...prev, isLoading: false }));
            }
        };

        initializeAuth();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            localStorage.setItem('vault_token', data.token);
            localStorage.setItem('vault_user', JSON.stringify(data.user));
            // For backward compatibility with existing code
            localStorage.setItem('vaultEmail', data.user.email);

            setState({
                user: data.user,
                token: data.token,
                isAuthenticated: true,
                isLoading: false,
            });

            showToast('Login successful', 'success');
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Login failed';
            showToast(msg, 'error');
            throw error;
        }
    };

    const register = async (email: string, password: string, displayName?: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, displayName }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            localStorage.setItem('vault_token', data.token);
            localStorage.setItem('vault_user', JSON.stringify(data.user));
            // For backward compatibility
            localStorage.setItem('vaultEmail', data.user.email);

            setState({
                user: data.user,
                token: data.token,
                isAuthenticated: true,
                isLoading: false,
            });

            showToast('Registration successful', 'success');
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Registration failed';
            showToast(msg, 'error');
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('vault_token');
        localStorage.removeItem('vault_user');
        localStorage.removeItem('vaultEmail');
        setState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
        });
        showToast('Logged out', 'info');
    };

    return (
        <AuthContext.Provider value={{ ...state, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
/**
 * Hook to access the Authentication Context.
 * 
 * Provides access to the current user, authentication status, and methods for logging in,
 * registering, and logging out.
 * 
 * @returns {AuthContextType} The auth context properties and methods.
 * @throws {Error} If used outside of an AuthProvider.
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
