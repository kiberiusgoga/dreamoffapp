import { test, expect } from '@playwright/test';
import { signUp, tokenFrom, seedDream } from './helpers';

test.describe('exporting', () => {
    test('downloads a file containing the dreams', async ({ page, request }) => {
        await signUp(page);
        const token = await tokenFrom(page);
        await seedDream(request, token, {
            text: 'I was flying over a red ocean',
            interpretation: { summary: 'A dream of release' }
        });

        await page.goto('/profile');

        const download = page.waitForEvent('download', { timeout: 30_000 });
        await page.getByText(/download my data/i).click();
        const file = await download;

        expect(file.suggestedFilename()).toMatch(/^dreamoff-export-\d{4}-\d{2}-\d{2}\.json$/);

        const stream = await file.createReadStream();
        const chunks: Buffer[] = [];
        for await (const chunk of stream) chunks.push(chunk as Buffer);
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));

        expect(body.account.name).toBe('Dreamer');
        expect(body.dreams).toHaveLength(1);
        expect(body.dreams[0].text).toBe('I was flying over a red ocean');
        expect(body.dreams[0].interpretation).toEqual({ summary: 'A dream of release' });
    });

    test('never puts the password hash in the file', async ({ page }) => {
        await signUp(page);
        await page.goto('/profile');

        const download = page.waitForEvent('download', { timeout: 30_000 });
        await page.getByText(/download my data/i).click();
        const file = await download;

        const stream = await file.createReadStream();
        const chunks: Buffer[] = [];
        for await (const chunk of stream) chunks.push(chunk as Buffer);

        expect(Buffer.concat(chunks).toString('utf8')).not.toMatch(/\$2[aby]\$/);
    });
});

test.describe('deleting the account', () => {
    test('warns before doing anything', async ({ page }) => {
        await signUp(page);
        await page.goto('/profile');

        await page.getByText('Delete account').click();

        await expect(page.getByText(/every dream you have recorded/i)).toBeVisible();
        await expect(page.getByText(/cannot be undone/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /^delete$/i })).toBeDisabled();
    });

    test('can be backed out of', async ({ page }) => {
        await signUp(page);
        await page.goto('/profile');

        await page.getByText('Delete account').click();
        await page.getByRole('button', { name: /cancel/i }).click();

        await expect(page.getByLabel(/confirm your password/i)).toBeHidden();
        await expect(page).toHaveURL(/\/profile$/);
    });

    // Regression, found by this test: the server answered a failed password
    // confirmation with 401, which the API client reads as "your session is
    // dead" — so mistyping your own password signed you out of the app.
    test('refuses the wrong password without signing the person out', async ({ page }) => {
        await signUp(page);
        await page.goto('/profile');

        await page.getByText('Delete account').click();
        await page.getByLabel(/confirm your password/i).fill('not-my-password');
        await page.getByRole('button', { name: /^delete$/i }).click();

        await expect(page.getByRole('alert')).toContainText(/incorrect password/i);

        // Still signed in, still on the profile, dialog still open to retry.
        await expect(page).toHaveURL(/\/profile$/);
        await expect(page.getByLabel(/confirm your password/i)).toBeVisible();
        expect(await page.evaluate(() => localStorage.getItem('dreamoff_token'))).toBeTruthy();
    });

    test('lets the person retry with the right password', async ({ page }) => {
        const creds = await signUp(page);
        await page.goto('/profile');

        await page.getByText('Delete account').click();
        await page.getByLabel(/confirm your password/i).fill('wrong-first');
        await page.getByRole('button', { name: /^delete$/i }).click();
        await expect(page.getByRole('alert')).toBeVisible();

        await page.getByLabel(/confirm your password/i).fill(creds.password);
        await page.getByRole('button', { name: /^delete$/i }).click();

        await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
    });

    test('removes everything and signs the person out', async ({ page, request }) => {
        const creds = await signUp(page);
        const token = await tokenFrom(page);
        await seedDream(request, token, { text: 'a dream about to be erased' });

        await page.goto('/profile');
        await page.getByText('Delete account').click();
        await page.getByLabel(/confirm your password/i).fill(creds.password);
        await page.getByRole('button', { name: /^delete$/i }).click();

        // The auth guard takes over the moment the session clears.
        await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
        expect(await page.evaluate(() => localStorage.getItem('dreamoff_token'))).toBeNull();

        // And the old token no longer resolves to anything.
        const after = await request.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
        });
        expect(after.status()).toBe(404);
    });

    test('frees the email address for reuse', async ({ page }) => {
        const creds = await signUp(page);

        await page.goto('/profile');
        await page.getByText('Delete account').click();
        await page.getByLabel(/confirm your password/i).fill(creds.password);
        await page.getByRole('button', { name: /^delete$/i }).click();
        await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });

        await page.getByPlaceholder('Your Name').fill(creds.name);
        await page.getByPlaceholder('Email Address').fill(creds.email);
        await page.getByPlaceholder('Password').fill(creds.password);
        await page.getByRole('button', { name: /create account/i }).click();

        // Signed in again. The landing page is /profile rather than home,
        // because the guard remembers where the visitor was sent away from —
        // the same mechanism that makes a shared dream link survive sign-in.
        await expect(page).not.toHaveURL(/\/login$/);
        await expect(page.getByRole('button', { name: /profile/i })).toBeVisible();
    });
});

test.describe('the privacy notice from inside the app', () => {
    test('is one tap from the profile', async ({ page }) => {
        await signUp(page);
        await page.goto('/profile');

        await page.getByText(/how your data is handled/i).click();

        await expect(page).toHaveURL(/\/privacy$/);
        await expect(page.getByRole('heading', { name: /^privacy$/i })).toBeVisible();
    });

    test('still carries its unfinished-document banner', async ({ page }) => {
        await page.goto('/privacy');

        // If this ever disappears without the placeholders being filled in,
        // a half-written legal document is being presented as a finished one.
        await expect(page.getByText(/before launch/i)).toBeVisible();
        await expect(page.getByText(/\[operator legal name\]/)).toBeVisible();
    });
});
