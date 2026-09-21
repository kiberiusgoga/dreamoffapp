// Snapshots of the database.
//
// SQLite is a file, which makes "just copy it" tempting and wrong: a copy
// taken mid-write captures a torn page and restores to a corrupt database.
// VACUUM INTO is SQLite's own answer — it writes a consistent, already
// compacted copy while the server keeps serving.
//
// This is a local snapshot, on the same volume as the original. It protects
// against the ordinary accidents: a bad migration, a mistaken delete, a
// mangled row. It does not protect against losing the volume, and nothing
// written here pretends otherwise.

import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sequelize from './models/db.js';
import { logger } from './logger.js';

const PREFIX = 'dreamoff-';
const SUFFIX = '.sqlite';

/** Where snapshots live, next to the database unless told otherwise. */
export function backupDir(databasePath: string, configured?: string): string {
    return configured || join(dirname(databasePath), 'backups');
}

function stamp(date = new Date()): string {
    return date.toISOString().replace(/[:.]/g, '-').replace('Z', '');
}

export interface BackupResult {
    path: string;
    bytes: number;
    durationMs: number;
}

/**
 * Writes one snapshot.
 *
 * VACUUM INTO refuses to overwrite, so the timestamp in the name is not
 * decoration — two snapshots in the same second would collide.
 */
export async function createBackup(directory: string): Promise<BackupResult> {
    await mkdir(directory, { recursive: true });

    const path = join(directory, `${PREFIX}${stamp()}${SUFFIX}`);
    const startedAt = Date.now();

    // Escaping matters: the path is interpolated into SQL, and a Windows path
    // is full of characters a naive quote would break on.
    await sequelize.query(`VACUUM INTO ${sequelize.escape(path)}`);

    const { size } = await stat(path);
    return { path, bytes: size, durationMs: Date.now() - startedAt };
}

/** Deletes all but the newest `keep` snapshots. */
export async function pruneBackups(directory: string, keep: number): Promise<string[]> {
    let files: string[];
    try {
        files = await readdir(directory);
    } catch {
        return [];
    }

    const snapshots = files
        .filter(f => f.startsWith(PREFIX) && f.endsWith(SUFFIX))
        // The timestamp sorts lexicographically because it is ISO 8601.
        .sort()
        .reverse();

    const doomed = snapshots.slice(Math.max(0, keep));
    const removed: string[] = [];

    for (const file of doomed) {
        try {
            await unlink(join(directory, file));
            removed.push(file);
        } catch (err) {
            logger.warn('could not delete an old backup', { file, err });
        }
    }

    return removed;
}

/**
 * Takes a snapshot now and on a timer, keeping the most recent few.
 *
 * Returns a stop function. The interval is unref'd so it never holds the
 * process open during shutdown.
 */
export function startBackups(opts: { directory: string; intervalMs: number; keep: number }) {
    const run = async () => {
        try {
            const result = await createBackup(opts.directory);
            const pruned = await pruneBackups(opts.directory, opts.keep);

            logger.info('database backed up', {
                kilobytes: Math.round(result.bytes / 1024),
                durationMs: result.durationMs,
                prunedOldBackups: pruned.length
            });
        } catch (err) {
            // A failed backup is worth knowing about and never worth crashing
            // for — the server is still serving.
            logger.error('database backup failed', { err });
        }
    };

    void run();

    const timer = setInterval(() => void run(), opts.intervalMs);
    if (typeof timer.unref === 'function') timer.unref();

    return () => clearInterval(timer);
}
