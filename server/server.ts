// DreamOff API Server — entrypoint.
// Boots the database and image storage, then binds the port.
// The Express app itself lives in app.ts so it can be tested in isolation,
// and the shutdown sequence in shutdown.ts for the same reason.

// Import config first — it validates the environment and exits on failure.
import { PORT, IS_PRODUCTION } from './config.js';
import { logger } from './logger.js';
import app from './app.js';
import sequelize, { initDB, dbPath } from './models/db.js';
import { migrateDB } from './models/index.js';
import { ensureUploadsDir } from './storage.js';
import { createShutdown } from './shutdown.js';
import { startImageSweeper } from './maintenance.js';
import { startBackups, backupDir } from './backup.js';
import {
    UPLOAD_SWEEP_GRACE_MS, UPLOAD_SWEEP_INTERVAL_MS,
    BACKUP_INTERVAL_MS, BACKUP_KEEP, BACKUP_DIR
} from './config.js';

/**
 * How long to let in-flight requests finish. A platform usually sends SIGKILL
 * some seconds after SIGTERM, so this has to stay inside that window.
 */
const SHUTDOWN_GRACE_MS = Number(process.env.SHUTDOWN_GRACE_MS) || 10_000;

async function start() {
    await initDB();
    await migrateDB();
    await ensureUploadsDir();

    const server = app.listen(PORT, () => {
        logger.info('server listening', { port: PORT, env: IS_PRODUCTION ? 'production' : 'development', logLevel: logger.level });
    });

    // Runs once now, then on a timer. Anything abandoned mid-flow is
    // reclaimed rather than accumulating a megabyte at a time.
    const stopSweeper = startImageSweeper({
        graceMs: UPLOAD_SWEEP_GRACE_MS,
        intervalMs: UPLOAD_SWEEP_INTERVAL_MS
    });

    // VACUUM INTO gives a consistent copy while the server keeps serving, so
    // this can run on a timer rather than needing a maintenance window.
    const stopBackups = BACKUP_INTERVAL_MS > 0
        ? startBackups({
            directory: backupDir(dbPath, BACKUP_DIR),
            intervalMs: BACKUP_INTERVAL_MS,
            keep: BACKUP_KEEP
        })
        : () => {};

    const shutdown = createShutdown({
        closeServer: () => new Promise(resolve => {
            stopSweeper();
            stopBackups();
            server.close(() => resolve());
        }),
        closeDatabase: () => sequelize.close(),
        graceMs: SHUTDOWN_GRACE_MS,
        exit: code => process.exit(code),
        // Otherwise the shutdown lines would go through console and miss the
        // structured output the host collects.
        log: { log: m => logger.info(m), warn: m => logger.warn(m), error: (m, err) => logger.error(m, { err }) }
    });

    for (const signal of ['SIGTERM', 'SIGINT'] as const) {
        process.on(signal, () => void shutdown(signal));
    }

    // Log the reason before the platform restarts the process, so it is not
    // lost to whatever the container runtime does next.
    process.on('unhandledRejection', reason => {
        logger.error('unhandled promise rejection', { reason: reason instanceof Error ? reason : String(reason) });
    });

    process.on('uncaughtException', err => {
        logger.error('uncaught exception', { err });
        void shutdown('uncaughtException');
    });
}

start().catch(err => {
    logger.error('failed to start', { err });
    process.exit(1);
});
