// DreamOff API Server — entrypoint.
// Boots the database and image storage, then binds the port.
// The Express app itself lives in app.ts so it can be tested in isolation,
// and the shutdown sequence in shutdown.ts for the same reason.

// Import config first — it validates the environment and exits on failure.
import { PORT, IS_PRODUCTION } from './config.js';
import app from './app.js';
import sequelize, { initDB } from './models/db.js';
import { migrateDB } from './models/index.js';
import { ensureUploadsDir } from './storage.js';
import { createShutdown } from './shutdown.js';

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
        console.log(`[DreamOff] Server running on port ${PORT} (${IS_PRODUCTION ? 'production' : 'development'})`);
    });

    const shutdown = createShutdown({
        closeServer: () => new Promise(resolve => server.close(() => resolve())),
        closeDatabase: () => sequelize.close(),
        graceMs: SHUTDOWN_GRACE_MS,
        exit: code => process.exit(code)
    });

    for (const signal of ['SIGTERM', 'SIGINT'] as const) {
        process.on(signal, () => void shutdown(signal));
    }

    // Log the reason before the platform restarts the process, so it is not
    // lost to whatever the container runtime does next.
    process.on('unhandledRejection', reason => {
        console.error('[DreamOff] Unhandled promise rejection:', reason);
    });

    process.on('uncaughtException', err => {
        console.error('[DreamOff] Uncaught exception:', err);
        void shutdown('uncaughtException');
    });
}

start().catch(err => {
    console.error('[DreamOff] Failed to start:', err);
    process.exit(1);
});
