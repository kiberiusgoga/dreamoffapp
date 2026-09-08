// Rate limiting.
//
// Two budgets, for two different kinds of damage:
//
//   The credential endpoints were unthrottled, so an attacker could try
//   passwords as fast as the network allowed. bcrypt makes each attempt
//   costly for the server too, which turns the same endpoint into a cheap way
//   to burn CPU.
//
//   The AI endpoints each cost real money at Google or Hugging Face. A signed
//   in account calling /interpret in a loop is an unbounded bill, and a valid
//   token was the only thing standing in the way.

import rateLimit, { Options, ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';
import {
    AUTH_RATE_LIMIT_MAX,
    AUTH_RATE_LIMIT_WINDOW_MS,
    AI_RATE_LIMIT_MAX,
    AI_RATE_LIMIT_WINDOW_MS
} from '../config.js';

/**
 * Exported as a factory so tests can build a limiter with a small budget and
 * exercise the real middleware rather than a stand-in.
 */
export function createAuthLimiter(overrides: Partial<Options> = {}) {
    return rateLimit({
        windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
        limit: AUTH_RATE_LIMIT_MAX,
        // Draft-8 RateLimit headers; the deprecated X-RateLimit-* set is off.
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        // Successful sign-ins should not count towards the budget, so a busy
        // legitimate user is never locked out by their own activity.
        skipSuccessfulRequests: true,
        message: { error: 'Too many attempts. Please try again later.' },
        ...overrides
    });
}

/**
 * Spend limit for anything that calls a paid model.
 *
 * Keyed on the account rather than the address: these routes sit behind
 * authenticateToken, and an IP is both too broad (a shared network or a
 * corporate NAT would throttle unrelated people) and too narrow (one account
 * can move between addresses).
 */
export function createAiLimiter(overrides: Partial<Options> = {}) {
    return rateLimit({
        windowMs: AI_RATE_LIMIT_WINDOW_MS,
        limit: AI_RATE_LIMIT_MAX,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        keyGenerator: (req: Request) =>
            // Falling back to the address covers a misordered route where the
            // limiter runs before authentication; ipKeyGenerator normalises
            // IPv6 so a /64 cannot be used to multiply the budget.
            req.user?.id ?? ipKeyGenerator(req.ip ?? ''),
        message: {
            error: 'You have reached the limit for AI requests. Please try again later.'
        },
        ...overrides
    });
}

export const authLimiter = createAuthLimiter();
export const aiLimiter = createAiLimiter();
