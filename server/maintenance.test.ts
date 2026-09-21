import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { existsSync, utimesSync, readdirSync, unlinkSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import request from 'supertest';
import app from './app.js';
import { initDB } from './models/db.js';
import { migrateDB, Dream } from './models/index.js';
import { saveImage, ensureUploadsDir, UPLOADS_DIR } from './storage.js';
import { sweepOrphanedImages, startImageSweeper } from './maintenance.js';

const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
);

const HOUR = 60 * 60 * 1000;

let token = '';

/** Backdates a file so it falls outside the grace period. */
function age(publicPath: string, ms: number) {
    const path = join(UPLOADS_DIR, basename(publicPath));
    const when = new Date(Date.now() - ms);
    utimesSync(path, when, when);
}

const onDisk = (publicPath: string) => existsSync(join(UPLOADS_DIR, basename(publicPath)));

beforeAll(async () => {
    await initDB();
    await migrateDB();
    // start() does this in production; the tests mount the app directly.
    await ensureUploadsDir();
    const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Sweeper', email: `sweep-${Date.now()}@test.local`, password: 'secret123' });
    token = res.body.token;
});

beforeEach(async () => {
    // Each test starts from an empty directory.
    await ensureUploadsDir();
    for (const file of readdirSync(UPLOADS_DIR)) {
        try { unlinkSync(join(UPLOADS_DIR, file)); } catch { /* already gone */ }
    }
});

describe('sweeping orphaned images', () => {
    // The whole reason this exists: the image is written before the dream, so
    // an interpretation that fails leaves a paid-for file with no owner.
    it('removes a file no dream references', async () => {
        const orphan = await saveImage(PNG, 'image/png');
        age(orphan, 48 * HOUR);

        const result = await sweepOrphanedImages({ graceMs: 24 * HOUR });

        expect(result.removed).toBe(1);
        expect(onDisk(orphan)).toBe(false);
    });

    it('leaves a file that belongs to a dream, however old', async () => {
        const kept = await saveImage(PNG, 'image/png');
        age(kept, 365 * 24 * HOUR);
        await request(app)
            .post('/api/dreams')
            .set('Authorization', `Bearer ${token}`)
            .send({ text: 'a dream with a picture', imageUrl: kept });

        const result = await sweepOrphanedImages({ graceMs: 24 * HOUR });

        expect(result.removed).toBe(0);
        expect(result.referenced).toBe(1);
        expect(onDisk(kept)).toBe(true);
    });

    // Without the grace period the sweep would race the flow that creates
    // orphans: an image written seconds ago, with its dream still being
    // interpreted, looks exactly like one abandoned an hour back.
    it('leaves a recent orphan alone', async () => {
        const inFlight = await saveImage(PNG, 'image/png');

        const result = await sweepOrphanedImages({ graceMs: 24 * HOUR });

        expect(result.removed).toBe(0);
        expect(result.keptRecent).toBe(1);
        expect(onDisk(inFlight)).toBe(true);
    });

    it('measures how much it would free without deleting anything', async () => {
        const orphan = await saveImage(PNG, 'image/png');
        age(orphan, 48 * HOUR);

        const result = await sweepOrphanedImages({ graceMs: 24 * HOUR, dryRun: true });

        expect(result.removed).toBe(1);
        expect(result.bytesFreed).toBe(PNG.length);
        expect(onDisk(orphan), 'a dry run deleted a file').toBe(true);
    });

    it('sorts a mixed directory correctly', async () => {
        const attached = await saveImage(PNG, 'image/png');
        const stale = await saveImage(PNG, 'image/png');
        const fresh = await saveImage(PNG, 'image/png');

        age(attached, 48 * HOUR);
        age(stale, 48 * HOUR);

        await request(app)
            .post('/api/dreams')
            .set('Authorization', `Bearer ${token}`)
            .send({ text: 'keeps its picture', imageUrl: attached });

        const result = await sweepOrphanedImages({ graceMs: 24 * HOUR });

        expect(result).toMatchObject({ removed: 1, referenced: 1, keptRecent: 1 });
        expect(onDisk(attached)).toBe(true);
        expect(onDisk(stale)).toBe(false);
        expect(onDisk(fresh)).toBe(true);
    });

    it('reports nothing for an empty directory', async () => {
        const result = await sweepOrphanedImages({ graceMs: 24 * HOUR });
        expect(result).toEqual({ removed: 0, keptRecent: 0, referenced: 0, bytesFreed: 0 });
    });

    it('copes with the directory not existing yet', async () => {
        rmSync(UPLOADS_DIR, { recursive: true, force: true });

        const result = await sweepOrphanedImages({ graceMs: 24 * HOUR });

        expect(result).toEqual({ removed: 0, keptRecent: 0, referenced: 0, bytesFreed: 0 });
        await ensureUploadsDir();
    });

    it('adds up what it freed', async () => {
        for (let i = 0; i < 3; i++) age(await saveImage(PNG, 'image/png'), 48 * HOUR);

        const result = await sweepOrphanedImages({ graceMs: 24 * HOUR });

        expect(result.removed).toBe(3);
        expect(result.bytesFreed).toBe(PNG.length * 3);
    });
});

describe('the scheduled sweeper', () => {
    it('runs once as soon as it starts', async () => {
        const orphan = await saveImage(PNG, 'image/png');
        age(orphan, 48 * HOUR);

        const stop = startImageSweeper({ graceMs: 24 * HOUR, intervalMs: 60 * HOUR });
        await vi.waitFor(() => expect(onDisk(orphan)).toBe(false));
        stop();
    });

    // Housekeeping must never take the server down with it. The sweep itself
    // is allowed to fail loudly; the scheduler around it is what has to hold.
    it('swallows a failure the sweep would otherwise propagate', async () => {
        // An empty directory short-circuits before the query, so there has to
        // be something to sweep for the failure to happen at all.
        await saveImage(PNG, 'image/png');

        const spy = vi.spyOn(Dream, 'findAll').mockRejectedValue(new Error('database gone'));
        const logged = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

        // Direct call: the error is not hidden at this level.
        await expect(sweepOrphanedImages({ graceMs: 24 * HOUR })).rejects.toThrow('database gone');

        // Through the scheduler: contained, and recorded.
        const stop = startImageSweeper({ graceMs: 24 * HOUR, intervalMs: 60 * HOUR });
        await vi.waitFor(() =>
            expect(logged.mock.calls.flat().join('')).toMatch(/image sweep failed/)
        );
        stop();

        logged.mockRestore();
        spy.mockRestore();
    });
});
