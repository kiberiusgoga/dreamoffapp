import { test, expect } from '@playwright/test';

/**
 * The things only a real browser can answer.
 *
 * A unit test can assert the text of a Content-Security-Policy header. It
 * cannot tell you whether Chrome then refused to run the bundle — which is
 * exactly how a wrong CSP fails: silently, with a blank page.
 */

test.describe('the page actually loads', () => {
    test('renders the app rather than a blank document', async ({ page }) => {
        const consoleErrors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
        });

        await page.goto('/');
        await expect(page.locator('#root')).not.toBeEmpty();

        // A CSP that blocks the bundle shows up here first.
        const cspViolations = consoleErrors.filter(e => /content security policy|refused to/i.test(e));
        expect(cspViolations, 'the CSP blocked something the app needs').toEqual([]);
    });

    test('serves the CSP it claims to', async ({ page }) => {
        const response = await page.goto('/');
        const csp = response?.headers()['content-security-policy'];

        expect(csp).toBeTruthy();
        expect(csp).toContain("default-src 'self'");
        expect(csp).toContain("frame-ancestors 'none'");
    });

    test('sends the other hardening headers', async ({ page }) => {
        const headers = (await page.goto('/'))?.headers() ?? {};

        expect(headers['x-content-type-options']).toBe('nosniff');
        expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
        expect(headers['strict-transport-security']).toContain('max-age=');
    });

    test('gives every response a request id to quote', async ({ page }) => {
        const response = await page.goto('/');
        expect(response?.headers()['x-request-id']).toMatch(/^[\w-]+$/);
    });
});

test.describe('fonts', () => {
    // The declared families were never loaded at all until recently, so the
    // whole app rendered in Times New Roman. Checking the stylesheet is not
    // enough; this asks the browser what it actually used.
    test('loads the self-hosted families, not a fallback', async ({ page }) => {
        await page.goto('/login');
        await page.waitForFunction(() => document.fonts.status === 'loaded');

        const loaded = await page.evaluate(() =>
            [...document.fonts].map(f => f.family).filter((v, i, a) => a.indexOf(v) === i)
        );

        expect(loaded.join(',')).toContain('Inter Variable');
        expect(loaded.join(',')).toContain('Playfair Display Variable');
    });

    test('fetches no font from a third-party host', async ({ page }) => {
        const external: string[] = [];
        page.on('request', req => {
            const url = req.url();
            if (!url.startsWith('http://127.0.0.1') && !url.startsWith('data:')) external.push(url);
        });

        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        expect(external, 'something reached outside this origin').toEqual([]);
    });
});

test.describe('the icon set', () => {
    test('serves a favicon rather than the SPA fallback', async ({ request }) => {
        for (const [path, type] of [
            ['/favicon.ico', 'image/x-icon'],
            ['/favicon.svg', 'image/svg+xml'],
            ['/apple-touch-icon.png', 'image/png'],
            ['/site.webmanifest', 'application/manifest+json']
        ]) {
            const res = await request.get(path);
            expect(res.status(), path).toBe(200);
            expect(res.headers()['content-type'], path).toContain(type);
        }
    });
});
