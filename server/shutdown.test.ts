import { describe, it, expect, vi } from 'vitest';
import { createShutdown } from './shutdown.js';

const silent = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };

function build(overrides: Partial<Parameters<typeof createShutdown>[0]> = {}) {
    const deps = {
        closeServer: vi.fn(async () => {}),
        closeDatabase: vi.fn(async () => {}),
        graceMs: 50,
        exit: vi.fn(),
        log: { ...silent, log: vi.fn(), warn: vi.fn(), error: vi.fn() },
        ...overrides
    };
    return { shutdown: createShutdown(deps), deps };
}

describe('graceful shutdown', () => {
    it('drains the server before closing the database', async () => {
        const order: string[] = [];
        const { shutdown, deps } = build({
            closeServer: vi.fn(async () => { order.push('server'); }),
            closeDatabase: vi.fn(async () => { order.push('database'); })
        });

        await shutdown('SIGTERM');

        expect(order).toEqual(['server', 'database']);
        expect(deps.exit).toHaveBeenCalledWith(0);
    });

    // The point of the whole sequence: a deploy must not cut off the request
    // that is writing someone's dream.
    it('waits for in-flight requests rather than dropping them', async () => {
        let finished = false;
        const { shutdown } = build({
            closeServer: vi.fn(
                () => new Promise<void>(resolve => setTimeout(() => { finished = true; resolve(); }, 20))
            )
        });

        await shutdown('SIGTERM');
        expect(finished).toBe(true);
    });

    it('gives up after the grace period instead of hanging forever', async () => {
        const { shutdown, deps } = build({
            graceMs: 30,
            // A request that never completes — a hung upstream, say.
            closeServer: vi.fn(() => new Promise<void>(() => {}))
        });

        await shutdown('SIGTERM');

        expect(deps.log.warn).toHaveBeenCalledWith(expect.stringMatching(/still open after 30ms/));
        expect(deps.exit).toHaveBeenCalledWith(0);
    });

    // Leaving the SQLite file locked would stop the replacement process from
    // starting, so this has to happen even when draining went wrong.
    it('closes the database even when the server refuses to close', async () => {
        const { shutdown, deps } = build({
            graceMs: 20,
            closeServer: vi.fn(() => new Promise<void>(() => {}))
        });

        await shutdown('SIGTERM');
        expect(deps.closeDatabase).toHaveBeenCalled();
    });

    it('closes the database even when the server throws', async () => {
        const { shutdown, deps } = build({
            closeServer: vi.fn(async () => { throw new Error('already closed'); })
        });

        await shutdown('SIGTERM');

        expect(deps.closeDatabase).toHaveBeenCalled();
        expect(deps.log.error).toHaveBeenCalledWith(expect.stringMatching(/closing the server/), expect.any(Error));
    });

    it('still exits when closing the database fails', async () => {
        const { shutdown, deps } = build({
            closeDatabase: vi.fn(async () => { throw new Error('locked'); })
        });

        await shutdown('SIGTERM');

        expect(deps.log.error).toHaveBeenCalledWith(expect.stringMatching(/closing the database/), expect.any(Error));
        expect(deps.exit).toHaveBeenCalledWith(0);
    });

    it('exits immediately on a second signal', async () => {
        const { shutdown, deps } = build({
            graceMs: 1000,
            closeServer: vi.fn(() => new Promise<void>(() => {}))
        });

        const first = shutdown('SIGTERM');
        await shutdown('SIGTERM');

        expect(deps.exit).toHaveBeenCalledWith(1);
        expect(deps.log.warn).toHaveBeenCalledWith(expect.stringMatching(/received again/));
        void first;
    });

    it('names the signal it is acting on', async () => {
        const { shutdown, deps } = build();
        await shutdown('SIGINT');
        expect(deps.log.log).toHaveBeenCalledWith(expect.stringContaining('SIGINT'));
    });
});
