import { Page, APIRequestContext, expect } from '@playwright/test';

/** Each test gets its own account; nothing is shared between them. */
export function newCredentials(label = 'user') {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
        name: 'Dreamer',
        email: `e2e-${label}-${stamp}@test.local`,
        password: 'secret123'
    };
}

/** Signs up through the real form, the way a first-time visitor would. */
export async function signUp(page: Page, creds = newCredentials()) {
    await page.goto('/login');
    await page.getByPlaceholder('Your Name').fill(creds.name);
    await page.getByPlaceholder('Email Address').fill(creds.email);
    await page.getByPlaceholder('Password').fill(creds.password);
    await page.getByRole('button', { name: /create account/i }).click();

    // The home screen is the proof the session took.
    await expect(page.getByText(/welcome/i)).toBeVisible();
    return creds;
}

/** Reads the token the app stored, so the API can be driven as that user. */
export async function tokenFrom(page: Page): Promise<string> {
    const token = await page.evaluate(() => localStorage.getItem('dreamoff_token'));
    expect(token, 'expected a session token in localStorage').toBeTruthy();
    return token as string;
}

/**
 * Seeds a dream over the API.
 *
 * Writing one through the UI needs an interpretation, and no AI keys are
 * configured in this environment — so the screens that display dreams are
 * exercised with data put there the same way the app puts it.
 */
export async function seedDream(
    request: APIRequestContext,
    token: string,
    dream: Record<string, unknown>
) {
    const res = await request.post('/api/dreams', {
        headers: { Authorization: `Bearer ${token}` },
        data: dream
    });
    expect(res.status(), await res.text()).toBe(201);
    return res.json();
}
