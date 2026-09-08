import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { scrubPath } from './requestLog.js';
import { initDB } from '../models/db.js';
import { migrateDB } from '../models/index.js';

beforeAll(async () => {
    await initDB();
    await migrateDB();
});

describe('request ids', () => {
    // Without one there is no way to connect "it failed for me around three
    // o'clock" to a line in the log.
    it('puts an id on every response', async () => {
        const res = await request(app).get('/api/health');

        expect(res.headers['x-request-id']).toEqual(expect.any(String));
        expect(res.headers['x-request-id'].length).toBeGreaterThan(10);
    });

    it('gives each request its own', async () => {
        const a = await request(app).get('/api/health');
        const b = await request(app).get('/api/health');

        expect(a.headers['x-request-id']).not.toBe(b.headers['x-request-id']);
    });

    // A proxy that already assigned one lets the trace survive the hop.
    it('adopts a well-formed id from the proxy', async () => {
        const res = await request(app).get('/api/health').set('x-request-id', 'edge-abc-123');
        expect(res.headers['x-request-id']).toBe('edge-abc-123');
    });

    it('refuses a malformed one rather than echoing it back', async () => {
        const res = await request(app)
            .get('/api/health')
            .set('x-request-id', '<script>alert(1)</script>');

        expect(res.headers['x-request-id']).not.toContain('script');
    });

    it('refuses an absurdly long one', async () => {
        const res = await request(app).get('/api/health').set('x-request-id', 'x'.repeat(500));
        expect(res.headers['x-request-id'].length).toBeLessThan(100);
    });

    it('is present on error responses too, which is when it matters', async () => {
        const res = await request(app).get('/api/dreams');

        expect(res.status).toBe(401);
        expect(res.headers['x-request-id']).toEqual(expect.any(String));
    });
});

describe('what gets logged', () => {
    const lines: string[] = [];

    beforeEach(() => {
        lines.length = 0;
        for (const stream of [process.stdout, process.stderr]) {
            vi.spyOn(stream, 'write').mockImplementation(chunk => {
                lines.push(String(chunk));
                return true;
            });
        }
    });

    const output = () => lines.join('');

    it('records the outcome of a request', async () => {
        await request(app).get('/api/dreams');
        vi.restoreAllMocks();

        expect(output()).toMatch(/request rejected|request/);
        expect(output()).toContain('401');
    });

    // The whole reason the redactor exists: a POST body is somebody's dream.
    it('never writes the request body', async () => {
        await request(app)
            .post('/api/auth/register')
            .send({ name: 'Dreamer', email: 'log@test.local', password: 'secret123' });
        vi.restoreAllMocks();

        expect(output()).not.toContain('secret123');
        expect(output()).not.toContain('log@test.local');
    });

    it('logs the route pattern rather than the id in the path', async () => {
        await request(app).delete('/api/dreams/11111111-2222-3333-4444-555555555555');
        vi.restoreAllMocks();

        expect(output()).not.toContain('11111111-2222-3333-4444-555555555555');
    });
});

describe('scrubPath', () => {
    it('masks a uuid segment', () => {
        expect(scrubPath('/api/dreams/11111111-2222-3333-4444-555555555555')).toBe('/api/dreams/:id');
    });

    it('masks an upload filename', () => {
        // The real shape saveImage produces, plus the undashed variant.
        expect(scrubPath('/uploads/882e4d88-a279-4867-a047-e3f7f175ce8c.png')).toBe('/uploads/:id');
        expect(scrubPath('/uploads/882e4d88a2794867a047e3f7f175ce8c.png')).toBe('/uploads/:id');
    });

    it('drops the query string, which can carry anything', () => {
        expect(scrubPath('/api/dreams?token=secret&q=my+dream')).toBe('/api/dreams');
    });

    it('leaves ordinary paths alone', () => {
        expect(scrubPath('/api/auth/login')).toBe('/api/auth/login');
        expect(scrubPath('/')).toBe('/');
    });

    it('treats a trailing slash as the same endpoint', () => {
        expect(scrubPath('/api/dreams/')).toBe('/api/dreams');
    });
});
