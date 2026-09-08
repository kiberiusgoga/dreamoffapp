import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAuthLimiter, createAiLimiter } from './rateLimit.js';

/**
 * Builds a throwaway app around the real limiter with a small budget. The
 * suite's own fixtures run with a very high limit (see test/server-setup.ts),
 * so this is where the throttling behaviour is actually exercised.
 */
function appWithLimit(limit: number, extra: Record<string, unknown> = {}) {
    const app = express();
    app.use(express.json());
    app.post(
        '/login',
        createAuthLimiter({ limit, windowMs: 60_000, ...extra }),
        (req, res) => {
            if (req.body?.password === 'correct') {
                res.json({ token: 'ok' });
                return;
            }
            res.status(401).json({ error: 'Invalid credentials.' });
        }
    );
    return app;
}

const attempt = (app: express.Express, password = 'wrong') =>
    request(app).post('/login').send({ email: 'a@test.local', password });

describe('auth rate limiter', () => {
    it('allows attempts up to the limit', async () => {
        const app = appWithLimit(3);
        for (let i = 0; i < 3; i++) {
            expect((await attempt(app)).status).toBe(401);
        }
    });

    it('returns 429 once the budget is spent', async () => {
        const app = appWithLimit(3);
        for (let i = 0; i < 3; i++) await attempt(app);

        const blocked = await attempt(app);
        expect(blocked.status).toBe(429);
        expect(blocked.body.error).toMatch(/too many attempts/i);
    });

    it('keeps refusing after the limit is passed', async () => {
        const app = appWithLimit(1);
        await attempt(app);
        expect((await attempt(app)).status).toBe(429);
        expect((await attempt(app)).status).toBe(429);
    });

    // A person who signs in successfully should never be throttled by their
    // own activity; only failures burn the budget.
    it('does not count successful sign-ins', async () => {
        const app = appWithLimit(2);
        for (let i = 0; i < 5; i++) {
            expect((await attempt(app, 'correct')).status).toBe(200);
        }
        expect((await attempt(app, 'correct')).status).toBe(200);
    });

    it('still throttles failures mixed in with successes', async () => {
        const app = appWithLimit(2);
        await attempt(app, 'correct');
        await attempt(app);
        await attempt(app, 'correct');
        await attempt(app);

        expect((await attempt(app)).status).toBe(429);
    });

    it('advertises the limit with standard headers', async () => {
        const app = appWithLimit(5);
        const res = await attempt(app);

        expect(res.headers['ratelimit']).toBeDefined();
        // The deprecated X-RateLimit-* set is deliberately off.
        expect(res.headers['x-ratelimit-limit']).toBeUndefined();
    });
});

/**
 * The AI routes each cost money at Google or Hugging Face, so the budget is
 * keyed on the account rather than the address. Building the app here with a
 * stub "authenticated" user lets the real middleware be exercised.
 */
function aiApp(limit: number) {
    const app = express();
    app.use(express.json());
    app.post(
        '/interpret',
        (req, _res, next) => {
            const id = req.header('x-test-user');
            if (id) req.user = { id, email: `${id}@test.local`, name: id };
            next();
        },
        createAiLimiter({ limit, windowMs: 60_000 }),
        (_req, res) => { res.json({ ok: true }); }
    );
    return app;
}

const call = (app: express.Express, user?: string) => {
    const r = request(app).post('/interpret').send({ text: 'a dream' });
    return user ? r.set('x-test-user', user) : r;
};

describe('AI spend limiter', () => {
    it('allows calls up to the budget', async () => {
        const app = aiApp(3);
        for (let i = 0; i < 3; i++) {
            expect((await call(app, 'alice')).status).toBe(200);
        }
    });

    it('refuses once the budget is spent', async () => {
        const app = aiApp(3);
        for (let i = 0; i < 3; i++) await call(app, 'alice');

        const blocked = await call(app, 'alice');
        expect(blocked.status).toBe(429);
        expect(blocked.body.error).toMatch(/limit for ai requests/i);
    });

    // The whole reason for keying on the account: two people behind one
    // office NAT must not throttle each other.
    it('gives each account its own budget', async () => {
        const app = aiApp(2);
        await call(app, 'alice');
        await call(app, 'alice');
        expect((await call(app, 'alice')).status).toBe(429);

        expect((await call(app, 'bob')).status).toBe(200);
        expect((await call(app, 'bob')).status).toBe(200);
        expect((await call(app, 'bob')).status).toBe(429);
    });

    // Unlike a failed sign-in, a successful AI call is exactly the expensive
    // one, so it must count.
    it('counts successful calls, unlike the auth limiter', async () => {
        const app = aiApp(1);
        expect((await call(app, 'alice')).status).toBe(200);
        expect((await call(app, 'alice')).status).toBe(429);
    });

    it('falls back to the address when no user is attached', async () => {
        const app = aiApp(2);
        expect((await call(app)).status).toBe(200);
        expect((await call(app)).status).toBe(200);
        expect((await call(app)).status).toBe(429);
    });

    it('advertises the budget with standard headers', async () => {
        const res = await call(aiApp(5), 'alice');
        expect(res.headers['ratelimit']).toBeDefined();
    });
});
