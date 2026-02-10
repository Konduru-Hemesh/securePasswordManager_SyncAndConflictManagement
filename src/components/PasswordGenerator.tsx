import { useState } from 'react';
import { Shuffle, Copy, Check } from 'lucide-react';

interface PasswordGeneratorProps {
    onGenerate?: (password: string) => void;
}

import { generatePassword as generatePwd } from '../utils/passwordGenerator';



export default function PasswordGenerator({ onGenerate }: PasswordGeneratorProps) {
    const [length, setLength] = useState(16);
    const [includeUppercase, setIncludeUppercase] = useState(true);
    const [includeLowercase, setIncludeLowercase] = useState(true);
    const [includeNumbers, setIncludeNumbers] = useState(true);
    const [includeSymbols, setIncludeSymbols] = useState(true);
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [copied, setCopied] = useState(false);

    // ... inside component
    const generatePassword = () => {
        const password = generatePwd(
            length,
            includeUppercase,
            includeLowercase,
            includeNumbers,
            includeSymbols
        );

        setGeneratedPassword(password);
        if (onGenerate) {
            onGenerate(password);
        }
        return password;
    };

    const handleCopy = () => {
        if (generatedPassword) {
            navigator.clipboard.writeText(generatedPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="space-y-4">
            {/* Generated Password Display */}
            {generatedPassword && (
                <div className="bg-black/30 rounded-xl p-4 border border-primary/20">
                    <div className="flex items-center gap-2">
                        <code className="flex-1 font-mono text-sm break-all text-primary">
                            {generatedPassword}
                        </code>
                        <button
                            onClick={handleCopy}
                            className="flex-shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            )}

            {/* Length Slider */}
            <div>
                <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium">Length</label>
                    <span className="text-sm text-primary font-mono">{length}</span>
                </div>
                <input
                    type="range"
                    min="8"
                    max="32"
                    value={length}
                    onChange={(e) => setLength(Number(e.target.value))}
                    className="w-full h-2 bg-secondary/50 rounded-lg appearance-none cursor-pointer slider accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>8</span>
                    <span>32</span>
                </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
                <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                    <input
                        type="checkbox"
                        checked={includeUppercase}
                        onChange={(e) => setIncludeUppercase(e.target.checked)}
                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                    />
                    <span className="text-sm">Uppercase (A-Z)</span>
                </label>

                <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                    <input
                        type="checkbox"
                        checked={includeLowercase}
                        onChange={(e) => setIncludeLowercase(e.target.checked)}
                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                    />
                    <span className="text-sm">Lowercase (a-z)</span>
                </label>

                <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                    <input
                        type="checkbox"
                        checked={includeNumbers}
                        onChange={(e) => setIncludeNumbers(e.target.checked)}
                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                    />
                    <span className="text-sm">Numbers (0-9)</span>
                </label>

                <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                    <input
                        type="checkbox"
                        checked={includeSymbols}
                        onChange={(e) => setIncludeSymbols(e.target.checked)}
                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                    />
                    <span className="text-sm">Symbols (!@#$...)</span>
                </label>
            </div>

            {/* Generate Button */}
            <button
                onClick={generatePassword}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
            >
                <Shuffle className="w-5 h-5" />
                Generate Password
            </button>
        </div>
    );
}
