// Housekeeping for the uploads directory.
//
// /api/ai/image writes the file as soon as Hugging Face returns it, and the
// dream is created by a separate request afterwards. Anything that happens in
// between — the interpretation failing, the tab being closed, the save being
// rejected — leaves a file nobody will ever reference. Each one is around a
// megabyte and was paid for.
//
// This lives outside storage.ts on purpose: storage handles files and knows
// nothing about the database, and it should stay that way.

import { readdir, stat, unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Dream } from './models/index.js';
import { UPLOADS_DIR } from './storage.js';
import { logger } from './logger.js';

export interface SweepResult {
    /** Files deleted. */
    removed: number;
    /** Unreferenced, but too recent to touch. */
    keptRecent: number;
    /** Files still attached to a dream. */
    referenced: number;
    bytesFreed: number;
}

export interface SweepOptions {
    /**
     * How long an unreferenced file is left alone.
     *
     * Without this the sweep would race the very flow that creates orphans:
     * an image written seconds ago, with its dream still being interpreted,
     * is indistinguishable from one abandoned an hour back.
     */
    graceMs?: number;
    /** Report what would go, delete nothing. */
    dryRun?: boolean;
}

export async function sweepOrphanedImages(options: SweepOptions = {}): Promise<SweepResult> {
    const graceMs = options.graceMs ?? 24 * 60 * 60 * 1000;
    const result: SweepResult = { removed: 0, keptRecent: 0, referenced: 0, bytesFreed: 0 };

    let files: string[];
    try {
        files = await readdir(UPLOADS_DIR);
    } catch (err) {
        // No directory yet is the normal state on a fresh volume.
        if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
            logger.warn('could not read the uploads directory', { err });
        }
        return result;
    }

    if (files.length === 0) return result;

    // Only the column that matters; a dream row carries the whole interpretation.
    const dreams = await Dream.findAll({ attributes: ['imageUrl'] });
    const referenced = new Set(
        dreams
            .map(dream => dream.imageUrl)
            .filter((url): url is string => Boolean(url))
            .map(url => basename(url))
    );

    const cutoff = Date.now() - graceMs;

    for (const file of files) {
        if (referenced.has(file)) {
            result.referenced++;
            continue;
        }

        const path = join(UPLOADS_DIR, file);
        let size = 0;
        try {
            const stats = await stat(path);
            if (stats.mtimeMs > cutoff) {
                result.keptRecent++;
                continue;
            }
            size = stats.size;
        } catch {
            // Vanished between the listing and now; nothing to do.
            continue;
        }

        if (options.dryRun) {
            result.removed++;
            result.bytesFreed += size;
            continue;
        }

        try {
            await unlink(path);
            result.removed++;
            result.bytesFreed += size;
        } catch (err) {
            logger.warn('could not delete an orphaned image', { file, err });
        }
    }

    return result;
}

/**
 * Runs the sweep now and on a timer.
 *
 * Returns a stop function. The interval is unref'd so it never holds the
 * process open during shutdown.
 */
export function startImageSweeper(opts: { graceMs?: number; intervalMs?: number } = {}) {
    const intervalMs = opts.intervalMs ?? 6 * 60 * 60 * 1000;

    const run = async () => {
        try {
            const result = await sweepOrphanedImages({ graceMs: opts.graceMs });
            if (result.removed > 0) {
                logger.info('removed orphaned images', {
                    removed: result.removed,
                    kilobytesFreed: Math.round(result.bytesFreed / 1024),
                    referenced: result.referenced,
                    keptRecent: result.keptRecent
                });
            } else {
                logger.debug('image sweep found nothing to remove', {
                    referenced: result.referenced,
                    keptRecent: result.keptRecent
                });
            }
        } catch (err) {
            // Housekeeping must never take the server down with it.
            logger.error('image sweep failed', { err });
        }
    };

    void run();

    const timer = setInterval(() => void run(), intervalMs);
    if (typeof timer.unref === 'function') timer.unref();

    return () => clearInterval(timer);
}
