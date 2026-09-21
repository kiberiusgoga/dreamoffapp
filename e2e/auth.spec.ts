import { test, expect } from '@playwright/test';
import { newCredentials, signUp } from './helpers';

test.describe('signing up', () => {
    test('a first-time visitor can create an account and land in the app', async ({ page }) => {
        const creds = newCredentials('signup');

        await page.goto('/');
        // Signed out, any route sends you to the sign-in screen.
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole('heading', { name: /join dreamoff/i })).toBeVisible();

        await page.getByPlaceholder('Your Name').fill(creds.name);
        await page.getByPlaceholder('Email Address').fill(creds.email);
        await page.getByPlaceholder('Password').fill(creds.password);
        await page.getByRole('button', { name: /create account/i }).click();

        await expect(page).toHaveURL(`${new URL(page.url()).origin}/`);
        await expect(page.getByText(/welcome, dreamer/i)).toBeVisible();
    });

    test('refuses a password the server considers too short', async ({ page }) => {
        const creds = newCredentials('short');

        await page.goto('/login');
        await page.getByPlaceholder('Your Name').fill(creds.name);
        await page.getByPlaceholder('Email Address').fill(creds.email);
        await page.getByPlaceholder('Password').fill('12345');
        await page.getByRole('button', { name: /create account/i }).click();

        await expect(page.getByText(/at least 6 characters/i)).toBeVisible();
        await expect(page).toHaveURL(/\/login$/);
    });

    test('says so when the email is already taken', async ({ page }) => {
        const creds = await signUp(page);

        await page.evaluate(() => localStorage.clear());
        await page.goto('/login');
        await page.getByPlaceholder('Your Name').fill(creds.name);
        await page.getByPlaceholder('Email Address').fill(creds.email);
        await page.getByPlaceholder('Password').fill(creds.password);
        await page.getByRole('button', { name: /create account/i }).click();

        await expect(page.getByText(/already exists/i)).toBeVisible();
    });
});

test.describe('the session', () => {
    // The token lives in localStorage and is validated on mount. A reload is
    // the only honest test of that.
    test('survives a reload', async ({ page }) => {
        await signUp(page);

        await page.reload();

        await expect(page.getByText(/welcome, dreamer/i)).toBeVisible();
        await expect(page).not.toHaveURL(/\/login/);
    });

    test('survives a reload on a deep link, staying where it was', async ({ page }) => {
        await signUp(page);

        await page.goto('/archive');
        await page.reload();

        await expect(page).toHaveURL(/\/archive$/);
        await expect(page.getByText(/dream archive/i)).toBeVisible();
    });

    test('signing out clears it and cannot be undone with Back', async ({ page }) => {
        await signUp(page);

        await page.getByRole('button', { name: /profile/i }).click();
        await page.getByText(/log out/i).click();

        await expect(page).toHaveURL(/\/login$/);
        expect(await page.evaluate(() => localStorage.getItem('dreamoff_token'))).toBeNull();

        await page.goBack();
        await expect(page).toHaveURL(/\/login$/);
    });
});

test.describe('signing back in', () => {
    test('works with the same credentials', async ({ page }) => {
        const creds = await signUp(page);
        await page.evaluate(() => localStorage.clear());
        await page.goto('/login');

        await page.getByRole('button', { name: /^login$/i }).click();
        await page.getByPlaceholder('Email Address').fill(creds.email);
        await page.getByPlaceholder('Password').fill(creds.password);
        await page.getByRole('button', { name: /^login$/i }).click();

        await expect(page.getByText(/welcome, dreamer/i)).toBeVisible();
    });

    // The reason the redirect carries a destination at all: a shared link
    // should survive the detour through sign-in. Signing out from a screen and
    // back in also returns there, which is the same mechanism.
    test('returns to the page the visitor was trying to reach', async ({ page }) => {
        const creds = await signUp(page);
        await page.evaluate(() => localStorage.clear());

        await page.goto('/archive');
        await expect(page).toHaveURL(/\/login$/);

        await page.getByRole('button', { name: /^login$/i }).click();
        await page.getByPlaceholder('Email Address').fill(creds.email);
        await page.getByPlaceholder('Password').fill(creds.password);
        await page.getByRole('button', { name: /^login$/i }).click();

        await expect(page).toHaveURL(/\/archive$/);
        await expect(page.getByText(/dream archive/i)).toBeVisible();
    });

    test('rejects the wrong password without saying which field was wrong', async ({ page }) => {
        const creds = await signUp(page);
        await page.evaluate(() => localStorage.clear());

        await page.goto('/login');
        await page.getByRole('button', { name: /^login$/i }).click();
        await page.getByPlaceholder('Email Address').fill(creds.email);
        await page.getByPlaceholder('Password').fill('not-the-password');
        await page.getByRole('button', { name: /^login$/i }).click();

        await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    });
});

test.describe('the auth gate', () => {
    test('sends a signed-out visitor from a deep link to sign-in', async ({ page }) => {
        await page.goto('/dream/11111111-2222-3333-4444-555555555555');
        await expect(page).toHaveURL(/\/login$/);
    });

    // The notice has to be readable before you decide to hand over anything.
    test('lets a signed-out visitor read the privacy notice', async ({ page }) => {
        await page.goto('/privacy');

        await expect(page).toHaveURL(/\/privacy$/);
        await expect(page.getByRole('heading', { name: /^privacy$/i })).toBeVisible();
        await expect(page.getByText(/Hugging Face/)).toBeVisible();
    });

    test('links to the notice from the sign-in screen', async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('link', { name: /how your data is handled/i }).click();

        await expect(page).toHaveURL(/\/privacy$/);
    });
});

test.describe('the sign-in screen offers only what works', () => {
    // These three called onClick={() => {}}: an offer the app could not keep.
    test('shows no social sign-in buttons', async ({ page }) => {
        await page.goto('/login');

        for (const provider of ['Google', 'Apple', 'Facebook']) {
            await expect(
                page.getByRole('button', { name: new RegExp(`continue with ${provider}`, 'i') })
            ).toBeHidden();
        }
        await expect(page.getByText(/or continue with/i)).toBeHidden();
    });

    test('still signs people up with the form that does work', async ({ page }) => {
        await signUp(page);
        await expect(page.getByText(/welcome, dreamer/i)).toBeVisible();
    });

    test('labels every field for assistive technology', async ({ page }) => {
        await page.goto('/login');

        await expect(page.getByLabel(/your name/i)).toBeVisible();
        await expect(page.getByLabel(/email address/i)).toBeVisible();
        await expect(page.getByLabel(/^password$/i)).toBeVisible();
    });
});
