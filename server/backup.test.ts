import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { mkdtempSync, readdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Sequelize } from 'sequelize';
import request from 'supertest';
import app from './app.js';
import sequelize, { initDB } from './models/db.js';
import { migrateDB } from './models/index.js';
import { createBackup, pruneBackups, backupDir, startBackups } from './backup.js';

let directory = '';

const snapshots = () =>
    readdirSync(directory).filter(f => f.startsWith('dreamoff-') && f.endsWith('.sqlite')).sort();

beforeAll(async () => {
    await initDB();
    await migrateDB();
});

beforeEach(() => {
    if (directory) rmSync(directory, { recursive: true, force: true });
    directory = mkdtempSync(join(tmpdir(), 'dreamoff-backup-'));
});

describe('where snapshots go', () => {
    it('sits beside the database by default', () => {
        expect(backupDir('/data/database.sqlite')).toBe(join('/data', 'backups'));
    });

    it('honours an explicit directory', () => {
        expect(backupDir('/data/database.sqlite', '/mnt/snapshots')).toBe('/mnt/snapshots');
    });
});

describe('taking a snapshot', () => {
    it('writes a file and reports its size', async () => {
        const result = await createBackup(directory);

        expect(existsSync(result.path)).toBe(true);
        expect(result.bytes).toBeGreaterThan(0);
        expect(snapshots()).toHaveLength(1);
    });

    it('creates the directory if it is missing', async () => {
        const nested = join(directory, 'deeper', 'still');
        await createBackup(nested);
        expect(readdirSync(nested)).toHaveLength(1);
    });

    // VACUUM INTO refuses to overwrite, so the timestamp is load-bearing
    // rather than decorative.
    it('does not collide with the previous one', async () => {
        const a = await createBackup(directory);
        const b = await createBackup(directory);

        expect(a.path).not.toBe(b.path);
        expect(snapshots()).toHaveLength(2);
    });

    // The whole reason for VACUUM INTO over copying the file: the copy has to
    // be a working database, not a torn page.
    it('produces a database that actually opens, with the data in it', async () => {
        const email = `backup-${Date.now()}@test.local`;
        await request(app).post('/api/auth/register').send({ name: 'Backed', email, password: 'secret123' });

        const { path } = await createBackup(directory);

        const restored = new Sequelize({ dialect: 'sqlite', storage: path, logging: false });
        const [rows] = (await restored.query(
            `SELECT COUNT(*) AS n FROM Users WHERE email = '${email}'`
        )) as unknown as [{ n: number }[], unknown];
        await restored.close();

        expect(rows[0].n).toBe(1);
    });

    it('carries the schema, not just the rows', async () => {
        const { path } = await createBackup(directory);

        const restored = new Sequelize({ dialect: 'sqlite', storage: path, logging: false });
        const [tables] = (await restored.query(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )) as unknown as [{ name: string }[], unknown];
        await restored.close();

        const names = tables.map(t => t.name);
        expect(names).toContain('Users');
        expect(names).toContain('Dreams');
        expect(names).toContain('SequelizeMeta');
    });

    it('leaves the live database usable afterwards', async () => {
        await createBackup(directory);

        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        await expect(sequelize.authenticate()).resolves.toBeUndefined();
    });
});

describe('pruning', () => {
    it('keeps the newest and deletes the rest', async () => {
        for (let i = 0; i < 5; i++) await createBackup(directory);
        expect(snapshots()).toHaveLength(5);

        const removed = await pruneBackups(directory, 2);

        expect(removed).toHaveLength(3);
        expect(snapshots()).toHaveLength(2);
    });

    it('keeps the most recent ones, not an arbitrary two', async () => {
        for (let i = 0; i < 4; i++) await createBackup(directory);
        const before = snapshots();

        await pruneBackups(directory, 2);

        // Names are ISO timestamps, so lexical order is chronological order.
        expect(snapshots()).toEqual(before.slice(-2));
    });

    it('does nothing when there are fewer than the limit', async () => {
        await createBackup(directory);
        expect(await pruneBackups(directory, 5)).toEqual([]);
        expect(snapshots()).toHaveLength(1);
    });

    it('ignores files it did not write', async () => {
        await createBackup(directory);
        const stranger = join(directory, 'notes.txt');
        writeFileSync(stranger, 'not a backup');

        await pruneBackups(directory, 0);

        expect(existsSync(stranger), 'pruning deleted an unrelated file').toBe(true);
    });

    it('copes with a directory that does not exist', async () => {
        expect(await pruneBackups(join(directory, 'nope'), 3)).toEqual([]);
    });
});

describe('the scheduler', () => {
    it('takes one immediately', async () => {
        const stop = startBackups({ directory, intervalMs: 60 * 60 * 1000, keep: 3 });
        await vi.waitFor(() => expect(snapshots().length).toBeGreaterThan(0));
        stop();
    });

    // A failed backup is worth knowing about and never worth crashing for.
    it('reports a failure without throwing', async () => {
        const logged = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const spy = vi.spyOn(sequelize, 'query').mockRejectedValue(new Error('disk full'));

        const stop = startBackups({ directory, intervalMs: 60 * 60 * 1000, keep: 3 });
        await vi.waitFor(() =>
            expect(logged.mock.calls.flat().join('')).toMatch(/database backup failed/)
        );
        stop();

        spy.mockRestore();
        logged.mockRestore();
    });
});
