import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { _internals } from './logger.js';

const { sanitize, REDACTED } = _internals;
const clean = (value: unknown) => sanitize(value) as Record<string, unknown>;

describe('redaction', () => {
    // The point of the whole list. A log line is read by whoever is debugging;
    // the dream is not theirs to read, and the privacy notice says dreams go
    // to the interpretation service and nowhere else.
    it('never lets the dream itself into a log line', () => {
        const out = clean({
            text: 'I was flying over a red ocean',
            content: 'the long version',
            transcription: 'what I dictated',
            interpretation: { summary: 'freedom' },
            chatHistory: [{ role: 'user', content: 'what does it mean?' }]
        });

        for (const key of ['text', 'content', 'transcription', 'interpretation', 'chatHistory']) {
            expect(out[key], key).toBe(REDACTED);
        }
        expect(JSON.stringify(out)).not.toMatch(/red ocean|freedom|what does it mean/);
    });

    it('never lets a credential into a log line', () => {
        const out = clean({
            password: 'secret123',
            token: 'eyJhbGciOiJIUzI1NiJ9.abc',
            authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.abc',
            JWT_SECRET: 'aabbccdd',
            GEMINI_API_KEY: 'AIza-something'
        });

        expect(Object.values(out).every(v => v === REDACTED)).toBe(true);
        expect(JSON.stringify(out)).not.toMatch(/secret123|eyJ|AIza/);
    });

    it('redacts an email but keeps the user id, which is enough to investigate', () => {
        const out = clean({ email: 'someone@example.com', userId: 'abc-123' });

        expect(out.email).toBe(REDACTED);
        expect(out.userId).toBe('abc-123');
    });

    it('matches keys whatever their casing', () => {
        const out = clean({ Password: 'x', TOKEN: 'y', Text: 'z' });
        expect(Object.values(out)).toEqual([REDACTED, REDACTED, REDACTED]);
    });

    it('reaches into nested objects', () => {
        const out = clean({ body: { dream: { text: 'private', model: 'jung' } } });
        const dream = (out.body as Record<string, Record<string, unknown>>).dream;

        expect(dream.text).toBe(REDACTED);
        expect(dream.model).toBe('jung');
    });

    it('reaches into arrays', () => {
        const out = clean({ dreams: [{ text: 'one', id: 'a' }, { text: 'two', id: 'b' }] });
        const dreams = out.dreams as Record<string, unknown>[];

        expect(dreams.map(d => d.text)).toEqual([REDACTED, REDACTED]);
        expect(dreams.map(d => d.id)).toEqual(['a', 'b']);
    });

    it('keeps the fields worth logging', () => {
        const out = clean({ requestId: 'r-1', method: 'POST', path: '/api/dreams', status: 500, durationMs: 12 });
        expect(out).toEqual({ requestId: 'r-1', method: 'POST', path: '/api/dreams', status: 500, durationMs: 12 });
    });
});

describe('robustness', () => {
    // A logger that throws inside an error handler loses the very thing it was
    // called to record.
    it('survives a circular reference', () => {
        const node: Record<string, unknown> = { id: 'a' };
        node.self = node;

        expect(() => clean({ node })).not.toThrow();
        expect(JSON.stringify(clean({ node }))).toContain('[circular]');
    });

    it('stops descending instead of recursing forever', () => {
        let deep: Record<string, unknown> = { bottom: true };
        for (let i = 0; i < 30; i++) deep = { nested: deep };

        expect(() => JSON.stringify(clean(deep))).not.toThrow();
        expect(JSON.stringify(clean(deep))).toContain('[deep]');
    });

    it('serialises an Error with its stack, which JSON.stringify drops', () => {
        const err = Object.assign(new Error('boom'), { code: 'ENOENT' });
        const out = clean({ err }).err as Record<string, unknown>;

        expect(out.message).toBe('boom');
        expect(out.name).toBe('Error');
        expect(out.code).toBe('ENOENT');
        expect(out.stack).toEqual(expect.stringContaining('boom'));
        expect(JSON.stringify(new Error('boom'))).toBe('{}');
    });

    it('caps a long array rather than emitting all of it', () => {
        const out = clean({ items: Array.from({ length: 500 }, (_, i) => i) });
        expect((out.items as unknown[]).length).toBe(50);
    });

    it('passes primitives through untouched', () => {
        expect(sanitize(42)).toBe(42);
        expect(sanitize('plain')).toBe('plain');
        expect(sanitize(null)).toBeNull();
        expect(sanitize(undefined)).toBeUndefined();
    });
});

describe('output', () => {
    const written: string[] = [];

    beforeEach(() => {
        written.length = 0;
        vi.spyOn(process.stdout, 'write').mockImplementation(chunk => {
            written.push(String(chunk));
            return true;
        });
        vi.spyOn(process.stderr, 'write').mockImplementation(chunk => {
            written.push(String(chunk));
            return true;
        });
    });

    afterEach(() => vi.restoreAllMocks());

    it('writes something for each level above the threshold', async () => {
        const { logger } = await import('./logger.js');

        logger.info('hello', { requestId: 'r-1' });
        logger.error('bad', { requestId: 'r-2' });

        expect(written.join('')).toContain('hello');
        expect(written.join('')).toContain('bad');
    });

    it('carries the redaction through the real call, not just the helper', async () => {
        const { logger } = await import('./logger.js');

        logger.error('request failed', { text: 'I was flying over a red ocean' });

        expect(written.join('')).not.toContain('red ocean');
        expect(written.join('')).toContain(REDACTED);
    });
});
