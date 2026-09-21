import { describe, it, expect, afterEach, vi } from 'vitest';

/**
 * config.ts reads the environment once, at import time, so each case needs a
 * fresh module graph.
 */
async function loadWith(env: Record<string, string | undefined>) {
    vi.resetModules();
    for (const [key, value] of Object.entries(env)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
    return import('./config.js');
}

const original = { ...process.env };

afterEach(() => {
    process.env = { ...original };
    vi.resetModules();
});

describe('AI keys', () => {
    it('are absent when the variable is unset', async () => {
        const config = await loadWith({ GEMINI_API_KEY: undefined, HUGGINGFACE_API_KEY: undefined });

        expect(config.GEMINI_API_KEY).toBe('');
        expect(config.HUGGINGFACE_API_KEY).toBe('');
    });

    it('are absent when the line is left empty', async () => {
        const config = await loadWith({ GEMINI_API_KEY: '', HUGGINGFACE_API_KEY: '   ' });

        expect(config.GEMINI_API_KEY).toBe('');
        expect(config.HUGGINGFACE_API_KEY).toBe('');
    });

    // Copying .env.example and not filling it in is the likeliest mistake, and
    // it used to look like a configured key: the app would call Gemini with a
    // bogus value and report "Failed to interpret dream" rather than saying
    // the key was never set.
    it('are absent when the placeholder from .env.example is left in place', async () => {
        const config = await loadWith({
            GEMINI_API_KEY: 'your_gemini_api_key_here',
            HUGGINGFACE_API_KEY: 'your_huggingface_api_key_here'
        });

        expect(config.GEMINI_API_KEY).toBe('');
        expect(config.HUGGINGFACE_API_KEY).toBe('');
    });

    it('are used when a real value is given', async () => {
        const config = await loadWith({
            GEMINI_API_KEY: 'AIzaSyExampleKeyValue',
            HUGGINGFACE_API_KEY: 'hf_ExampleTokenValue'
        });

        expect(config.GEMINI_API_KEY).toBe('AIzaSyExampleKeyValue');
        expect(config.HUGGINGFACE_API_KEY).toBe('hf_ExampleTokenValue');
    });

    // A value pasted with a stray newline or leading space is still the key.
    it('ignore surrounding whitespace', async () => {
        const config = await loadWith({ GEMINI_API_KEY: '  AIzaSyExampleKeyValue  ' });
        expect(config.GEMINI_API_KEY).toBe('AIzaSyExampleKeyValue');
    });
});

describe('the key check the routes use', () => {
    it('reports not-configured for a placeholder, so the message is accurate', async () => {
        vi.resetModules();
        process.env.GEMINI_API_KEY = 'your_gemini_api_key_here';

        const { isGeminiConfigured } = await import('./services/gemini.js');
        expect(isGeminiConfigured()).toBe(false);
    });

    it('reports configured for a real value', async () => {
        vi.resetModules();
        process.env.GEMINI_API_KEY = 'AIzaSyExampleKeyValue';

        const { isGeminiConfigured } = await import('./services/gemini.js');
        expect(isGeminiConfigured()).toBe(true);
    });
});
