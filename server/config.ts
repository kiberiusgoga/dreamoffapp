// Centralised, validated configuration.
//
// Everything the server cannot run correctly without is resolved here, at
// import time, so a misconfigured deploy dies immediately with a clear message
// instead of surfacing as a confusing 500 on the first login attempt.

import 'dotenv/config';

// Values shipped in .env.example. Present in a real .env they mean the operator
// copied the template and never filled it in — treat as missing, not as a value.
const PLACEHOLDERS = new Set([
    'your_strong_random_secret_here',
    'your_gemini_api_key_here',
    'your_huggingface_api_key_here',
    'changeme'
]);

const problems: string[] = [];

function required(name: string, hint: string): string {
    const raw = process.env[name]?.trim();
    if (!raw) {
        problems.push(`  • ${name} is missing. ${hint}`);
        return '';
    }
    if (PLACEHOLDERS.has(raw)) {
        problems.push(`  • ${name} is still the placeholder from .env.example. ${hint}`);
        return '';
    }
    return raw;
}

/**
 * Reads a value the server can run without.
 *
 * Placeholders count as absent here too. Someone who copies .env.example and
 * leaves `your_gemini_api_key_here` in place would otherwise look configured:
 * the app would make a real call with a bogus key and report "Failed to
 * interpret dream", instead of the accurate "not configured on the server".
 */
function optional(name: string): string {
    const raw = process.env[name]?.trim();
    if (!raw || PLACEHOLDERS.has(raw)) return '';
    return raw;
}

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const PORT = Number(process.env.PORT) || 5000;

export const JWT_SECRET = required(
    'JWT_SECRET',
    'Generate one with:  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
);

// jsonwebtoken accepts a number of seconds or an ms-style string ("7d", "12h").
export const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN?.trim() || '7d') as `${number}${'d' | 'h' | 'm' | 's'}`;

// A short secret is technically valid but not worth shipping — warn, don't block.
if (JWT_SECRET && JWT_SECRET.length < 32) {
    console.warn(`[DreamOff] Warning: JWT_SECRET is only ${JWT_SECRET.length} characters. 32+ is recommended.`);
}

if (problems.length > 0) {
    console.error(
        `\n[DreamOff] Cannot start — invalid configuration in server/.env:\n\n${problems.join('\n')}\n`
    );
    process.exit(1);
}

// ── Rate limiting for /login and /register ──
// Defaults allow a person who mistypes their password a few times while still
// making a password-guessing run impractical. Tests raise the budget so that
// the rest of the suite is not throttled by its own fixtures.
export const AUTH_RATE_LIMIT_WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
export const AUTH_RATE_LIMIT_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX) || 10;

// Spend limit for the paid model calls.
//
// Counted per request, not per dream: writing one dream spends two, because
// the interpretation and the image are separate calls to separate providers.
// 30 is therefore about fifteen dreams an hour — generous for a person working
// through their night, and nowhere near enough for a loop.
export const AI_RATE_LIMIT_WINDOW_MS = Number(process.env.AI_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000;
export const AI_RATE_LIMIT_MAX = Number(process.env.AI_RATE_LIMIT_MAX) || 30;

// Orphaned uploads: an image is written before its dream exists, so anything
// that interrupts the flow leaves a paid-for file behind. The grace period is
// what stops the sweep racing an image that is still being attached.
export const UPLOAD_SWEEP_GRACE_MS = Number(process.env.UPLOAD_SWEEP_GRACE_MS) || 24 * 60 * 60 * 1000;
export const UPLOAD_SWEEP_INTERVAL_MS = Number(process.env.UPLOAD_SWEEP_INTERVAL_MS) || 6 * 60 * 60 * 1000;

// Snapshots. Local, on the same volume — enough for a bad migration or a
// mistaken delete, not enough for losing the disk. Set BACKUP_INTERVAL_MS to 0
// to switch them off.
export const BACKUP_INTERVAL_MS = process.env.BACKUP_INTERVAL_MS === '0'
    ? 0
    : Number(process.env.BACKUP_INTERVAL_MS) || 6 * 60 * 60 * 1000;
export const BACKUP_KEEP = Number(process.env.BACKUP_KEEP) || 8;
export const BACKUP_DIR = process.env.BACKUP_DIR?.trim() || '';

// AI keys are optional: the server runs fine without them, and the /api/ai
// routes already return a clear 500 when they are absent.
export const GEMINI_API_KEY = optional('GEMINI_API_KEY');

// Model names get retired: gemini-2.5-flash stopped accepting new users and
// returned a 404 that read like a broken key. Configurable so the next
// retirement is a line in .env rather than a code change.
export const GEMINI_MODEL = optional('GEMINI_MODEL') || 'gemini-3.6-flash';
export const HUGGINGFACE_API_KEY = optional('HUGGINGFACE_API_KEY');
