// Graceful shutdown, kept out of the entrypoint so it can be tested.
//
// Signals cannot be exercised on every platform — Windows terminates a process
// on SIGTERM without running handlers — so the sequence itself is a plain
// function that a test can call directly.

export interface ShutdownDeps {
    /** Stops accepting connections and waits for in-flight requests. */
    closeServer: () => Promise<void>;
    /** Releases the database handle so the next process can open the file. */
    closeDatabase: () => Promise<void>;
    /** How long to wait for in-flight requests before closing anyway. */
    graceMs: number;
    /** Injected so a test does not have to end the test runner's process. */
    exit: (code: number) => void;
    log?: { log: (m: string) => void; warn: (m: string) => void; error: (m: string, err?: unknown) => void };
}

export function createShutdown(deps: ShutdownDeps) {
    const log = deps.log ?? console;
    let running = false;

    return async function shutdown(signal: string): Promise<void> {
        // A second signal during shutdown means someone is impatient; obey it
        // rather than waiting out the grace period twice.
        if (running) {
            log.warn(`[DreamOff] ${signal} received again — exiting now`);
            deps.exit(1);
            return;
        }
        running = true;
        log.log(`[DreamOff] ${signal} received, finishing in-flight requests`);

        // Without this a deploy cuts off whatever request was mid-flight,
        // including a dream the user had just written.
        const timer = setTimeout(() => {}, deps.graceMs);
        const timedOut = new Promise<'timeout'>(resolve => {
            clearTimeout(timer);
            const t = setTimeout(() => resolve('timeout'), deps.graceMs);
            // Never hold the process open just to wait for the timeout.
            if (typeof t.unref === 'function') t.unref();
        });

        try {
            const outcome = await Promise.race([deps.closeServer().then(() => 'closed' as const), timedOut]);
            if (outcome === 'timeout') {
                log.warn(`[DreamOff] Requests still open after ${deps.graceMs}ms — closing anyway`);
            }
        } catch (err) {
            log.error('[DreamOff] Error closing the server:', err);
        }

        // Always attempt this: leaving the SQLite file locked would stop the
        // replacement process from starting.
        try {
            await deps.closeDatabase();
        } catch (err) {
            log.error('[DreamOff] Error closing the database:', err);
        }

        log.log('[DreamOff] Shutdown complete');
        deps.exit(0);
    };
}
