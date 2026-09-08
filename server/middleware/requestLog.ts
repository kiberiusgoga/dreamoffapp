// Request logging and correlation ids.
//
// Without a request id there is no way to connect "it failed for me around
// three o'clock" to a line in the log. The id goes out on the response too, so
// a user can quote it and it can be found directly.
//
// The body is never logged. It is the dream.

import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { logger } from '../logger.js';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            /** Correlates every line emitted while handling this request. */
            id?: string;
        }
    }
}

/** Health checks run every few seconds and would drown everything else. */
const QUIET_PATHS = new Set(['/api/health']);

/**
 * Replaces identifier-shaped segments with a placeholder.
 *
 * req.route only exists once a route has matched, so a request rejected by
 * authentication never has one and would otherwise be logged with the raw
 * URL — dream ids included. Grouping by shape is also simply better to read.
 */
export function scrubPath(url: string): string {
    // Query strings can carry anything, and none of it is worth logging.
    const pathname = url.split('?')[0];

    const scrubbed = pathname
        .split('/')
        .map(segment => {
            if (!segment) return segment;

            // Upload filenames carry an extension; test the stem.
            const stem = segment.replace(/.[a-z0-9]{1,5}$/i, '');

            // UUID, with or without an extension.
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stem)) return ':id';
            // Any other long opaque token.
            if (/^[0-9a-z_-]{16,}$/i.test(stem)) return ':id';

            return segment;
        })
        .join('/');

    // "/api/dreams/" and "/api/dreams" are the same endpoint; grouping them
    // apart would be noise.
    return scrubbed.length > 1 && scrubbed.endsWith('/') ? scrubbed.slice(0, -1) : scrubbed;
}

export function requestLogger() {
    return function requestLog(req: Request, res: Response, next: NextFunction) {
        // Honour an id from the proxy when there is one, so a trace survives
        // the hop, but never trust its shape.
        const inbound = req.header('x-request-id');
        req.id = inbound && /^[\w-]{1,64}$/.test(inbound) ? inbound : randomUUID();
        res.setHeader('X-Request-Id', req.id);

        const startedAt = process.hrtime.bigint();

        res.on('finish', () => {
            const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

            const context = {
                requestId: req.id,
                method: req.method,
                // originalUrl rather than req.path: inside a mounted router
                // req.path is relative, so /api/dreams rejected before the
                // route matched used to be logged as "/".
                path: scrubPath(req.originalUrl),
                status: res.statusCode,
                durationMs: Math.round(durationMs),
                // Who, not what. The user id is enough to investigate; the
                // email is personal data and the body is the dream itself.
                userId: req.user?.id
            };

            if (res.statusCode >= 500) {
                logger.error('request failed', context);
            } else if (res.statusCode >= 400) {
                logger.warn('request rejected', context);
            } else if (QUIET_PATHS.has(req.path)) {
                logger.debug('request', context);
            } else {
                logger.info('request', context);
            }
        });

        next();
    };
}

/**
 * Last line of defence. An error escaping a route handler would otherwise be
 * swallowed by Express's default handler, which prints a stack in development
 * and an empty 500 in production.
 */
export function errorHandler() {
    return function handleError(err: Error, req: Request, res: Response, next: NextFunction) {
        if (res.headersSent) return next(err);

        logger.error('unhandled error in request', {
            requestId: req.id,
            method: req.method,
            path: scrubPath(req.originalUrl),
            err
        });

        // The id is the whole point of returning anything here: a user can
        // quote it, and it finds the line. The cause itself stays server-side.
        res.status(500).json({
            error: 'Internal server error.',
            requestId: req.id
        });
    };
}
