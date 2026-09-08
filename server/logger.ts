// Structured logging to stdout.
//
// No external service: the host already collects stdout, and shipping errors
// to a third party would add a recipient of user data that the privacy notice
// would then have to account for. One JSON object per line in production is
// something any log viewer can filter and any grep can read.
//
// Deliberately hand-written rather than pulling in a logging framework: the
// whole contract is four levels and a redactor, and the redactor is the part
// that actually matters here.

import { IS_PRODUCTION } from './config.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const configuredLevel = (process.env.LOG_LEVEL?.toLowerCase() as LogLevel) || (IS_PRODUCTION ? 'info' : 'debug');
const threshold = LEVELS[configuredLevel] ?? LEVELS.info;

/**
 * Keys whose values never belong in a log line.
 *
 * `text`, `content` and `transcription` are on this list because they are the
 * dream itself. Someone reading the logs to debug a failing request has no
 * business reading what the user wrote, and the privacy notice promises that
 * dreams go to the interpretation service and nowhere else.
 */
const REDACTED_KEYS = new Set([
    'password',
    'token',
    'authorization',
    'jwt_secret',
    'gemini_api_key',
    'huggingface_api_key',
    'text',
    'content',
    'transcription',
    'interpretation',
    'chathistory',
    'message',
    'reply',
    'email'
]);

const REDACTED = '[redacted]';

function serializeError(err: Error & { code?: string; status?: number }) {
    return {
        name: err.name,
        message: err.message,
        ...(err.code ? { code: err.code } : {}),
        ...(err.status ? { status: err.status } : {}),
        stack: err.stack
    };
}

/**
 * Redacts sensitive keys and survives circular references, because a logger
 * that throws inside an error handler loses the very thing it was called to
 * record.
 */
function sanitize(value: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
    if (value === null || typeof value !== 'object') return value;
    if (depth > 6) return '[deep]';

    if (value instanceof Error) return serializeError(value);
    if (value instanceof Date) return value.toISOString();

    if (seen.has(value)) return '[circular]';
    seen.add(value);

    if (Array.isArray(value)) {
        return value.slice(0, 50).map(item => sanitize(item, seen, depth + 1));
    }

    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        out[key] = REDACTED_KEYS.has(key.toLowerCase()) ? REDACTED : sanitize(item, seen, depth + 1);
    }
    return out;
}

function write(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (LEVELS[level] < threshold) return;

    const fields = context ? (sanitize(context) as Record<string, unknown>) : undefined;

    if (IS_PRODUCTION) {
        let line: string;
        try {
            line = JSON.stringify({
                level,
                time: new Date().toISOString(),
                msg: message,
                ...fields
            });
        } catch {
            // Last resort: losing the context is better than losing the event.
            line = JSON.stringify({ level, time: new Date().toISOString(), msg: message, context: '[unserializable]' });
        }
        process.stdout.write(line + '\n');
        return;
    }

    // Development: one readable line, with any context appended.
    const suffix = fields && Object.keys(fields).length ? ' ' + JSON.stringify(fields) : '';
    const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
    stream.write(`[DreamOff] ${level.toUpperCase().padEnd(5)} ${message}${suffix}\n`);
}

export const logger = {
    debug: (message: string, context?: Record<string, unknown>) => write('debug', message, context),
    info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
    warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context),
    error: (message: string, context?: Record<string, unknown>) => write('error', message, context),

    /** The level actually in effect, for the startup banner and for tests. */
    level: configuredLevel
};

/** Exposed for tests; not part of the logging surface. */
export const _internals = { sanitize, REDACTED_KEYS, REDACTED };
