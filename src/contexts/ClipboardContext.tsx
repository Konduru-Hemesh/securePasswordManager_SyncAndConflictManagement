import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface ClipboardContextType {
    copyToClipboard: (text: string) => Promise<void>;
    clipboardState: {
        hasCopied: boolean;
        timeLeft: number;
        copiedId: number | null;
    };
}

// eslint-disable-next-line react-refresh/only-export-components
export const ClipboardContext = createContext<ClipboardContextType | undefined>(undefined);

export function ClipboardProvider({ children }: { children: ReactNode }) {
    const [hasCopied, setHasCopied] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    useEffect(() => {
        if (timeLeft > 0) {
            const interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        setHasCopied(false);
                        setCopiedId(null);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [timeLeft]);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setHasCopied(true);
            setTimeLeft(30);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    return (
        <ClipboardContext.Provider value={{
            copyToClipboard,
            clipboardState: { hasCopied, timeLeft, copiedId }
        }}>
            {children}
        </ClipboardContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useClipboard() {
    const context = useContext(ClipboardContext);
    if (context === undefined) {
        throw new Error('useClipboard must be used within a ClipboardProvider');
    }
    return context;
}
