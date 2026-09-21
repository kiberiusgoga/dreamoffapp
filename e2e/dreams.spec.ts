import { test, expect, Page, APIRequestContext } from '@playwright/test';
import { signUp, tokenFrom, seedDream } from './helpers';

const DREAMS = [
    {
        text: 'I was flying over a red ocean',
        model: 'jung',
        themes: ['freedom', 'water'],
        interpretation: { summary: 'A dream of release', symbols: [{ element: 'ocean', meaning: 'the unconscious' }] }
    },
    {
        text: 'A dark forest full of whispers',
        model: 'freud',
        mood: 'anxious',
        interpretation: { summary: 'Something unspoken' }
    },
    {
        text: 'Climbing an endless staircase',
        model: 'cbt',
        interpretation: { summary: 'Ambition without a summit' }
    }
];

async function signUpWithDreams(page: Page, request: APIRequestContext) {
    await signUp(page);
    const token = await tokenFrom(page);
    for (const dream of DREAMS) await seedDream(request, token, dream);
    // The store loads dreams once, at sign-in.
    await page.reload();
    return token;
}

test.describe('the archive', () => {
    test('lists what was recorded', async ({ page, request }) => {
        await signUpWithDreams(page, request);
        await page.getByRole('button', { name: /journal/i }).click();

        for (const dream of DREAMS) {
            await expect(page.getByText(dream.text)).toBeVisible();
        }
    });

    test('says so when there is nothing yet', async ({ page }) => {
        await signUp(page);
        await page.getByRole('button', { name: /journal/i }).click();

        await expect(page.getByText(/no dreams recorded yet/i)).toBeVisible();
    });

    test('filters as you type', async ({ page, request }) => {
        await signUpWithDreams(page, request);
        await page.goto('/archive');

        await page.getByLabel(/search dreams/i).fill('forest');

        await expect(page.getByText(/dark forest/i)).toBeVisible();
        await expect(page.getByText(/red ocean/i)).toBeHidden();
        await expect(page.getByText('1 dream found')).toBeVisible();
    });

    test('searches the interpretation, not just the text', async ({ page, request }) => {
        await signUpWithDreams(page, request);
        await page.goto('/archive');

        await page.getByLabel(/search dreams/i).fill('ambition');
        await expect(page.getByText(/staircase/i)).toBeVisible();
    });

    test('distinguishes no matches from an empty archive', async ({ page, request }) => {
        await signUpWithDreams(page, request);
        await page.goto('/archive');

        await page.getByLabel(/search dreams/i).fill('zeppelin');

        await expect(page.getByText(/no dreams match/i)).toBeVisible();
        await expect(page.getByText(/no dreams recorded yet/i)).toBeHidden();
    });

    test('clears back to the full list', async ({ page, request }) => {
        await signUpWithDreams(page, request);
        await page.goto('/archive');

        await page.getByLabel(/search dreams/i).fill('forest');
        await page.getByLabel(/clear search/i).click();

        await expect(page.getByText(/red ocean/i)).toBeVisible();
        await expect(page.getByText(/staircase/i)).toBeVisible();
    });
});

test.describe('opening a dream', () => {
    test('shows the interpretation that was stored', async ({ page, request }) => {
        await signUpWithDreams(page, request);
        await page.goto('/archive');

        await page.getByText(/red ocean/i).click();

        await expect(page).toHaveURL(/\/dream\/[0-9a-f-]{36}$/);
        await expect(page.getByText(/A dream of release/)).toBeVisible();

        // Scoped to the symbols table: "ocean" also appears in the dream text.
        const symbols = page.getByRole('table');
        await expect(symbols.getByRole('cell', { name: 'ocean' })).toBeVisible();
        await expect(symbols.getByRole('cell', { name: 'the unconscious' })).toBeVisible();
    });

    // Regression: this used to be a white screen, because the interpretation
    // never persisted and the detail screen dereferenced it anyway.
    test('does not blank out for a dream with no interpretation', async ({ page, request }) => {
        await signUp(page);
        const token = await tokenFrom(page);
        const dream = await seedDream(request, token, { text: 'a bare dream' });
        await page.goto(`/dream/${dream.id}`);

        await expect(page.getByText(/no interpretation is available/i)).toBeVisible();
        await expect(page.locator('#root')).not.toBeEmpty();
    });

    test('survives a reload on the deep link', async ({ page, request }) => {
        await signUp(page);
        const token = await tokenFrom(page);
        const dream = await seedDream(request, token, DREAMS[0]);

        await page.goto(`/dream/${dream.id}`);
        await page.reload();

        await expect(page.getByText(/A dream of release/)).toBeVisible();
    });

    test('hides the bottom nav so there is one way back', async ({ page, request }) => {
        await signUp(page);
        const token = await tokenFrom(page);
        const dream = await seedDream(request, token, DREAMS[0]);

        await page.goto(`/dream/${dream.id}`);
        await expect(page.getByRole('button', { name: /journal/i })).toBeHidden();
    });
});

test.describe('navigation', () => {
    // The unit tests drive MemoryRouter's own history stack. This is the
    // browser's, which is the thing that was broken before routing existed.
    test('the browser Back button walks back through the app', async ({ page, request }) => {
        await signUpWithDreams(page, request);

        await page.getByRole('button', { name: /journal/i }).click();
        await expect(page).toHaveURL(/\/archive$/);

        await page.getByRole('button', { name: /profile/i }).click();
        await expect(page).toHaveURL(/\/profile$/);

        await page.goBack();
        await expect(page).toHaveURL(/\/archive$/);

        await page.goBack();
        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByText(/welcome, dreamer/i)).toBeVisible();
    });

    test('Forward works too', async ({ page }) => {
        await signUp(page);

        await page.getByRole('button', { name: /journal/i }).click();
        await page.goBack();
        await page.goForward();

        await expect(page).toHaveURL(/\/archive$/);
    });

    test('back out of a dream returns to the archive with the search intact', async ({ page, request }) => {
        await signUpWithDreams(page, request);
        await page.goto('/archive');
        await page.getByLabel(/search dreams/i).fill('forest');

        await page.getByText(/dark forest/i).click();
        await expect(page).toHaveURL(/\/dream\//);

        await page.getByRole('button', { name: /^back$/i }).click();
        await expect(page).toHaveURL(/\/archive$/);
    });

    test('every nav destination has its own URL', async ({ page }) => {
        await signUp(page);

        for (const [button, url] of [
            [/journal/i, '/archive'],
            [/profile/i, '/profile'],
            [/^add$/i, '/add/write'],
            [/home/i, '/']
        ] as const) {
            await page.getByRole('button', { name: button }).click();
            await expect(page).toHaveURL(new RegExp(`${url.replace('/', '\\/')}$`));
        }
    });

    test('an unknown path lands on home rather than nothing', async ({ page }) => {
        await signUp(page);
        await page.goto('/no/such/page');

        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByText(/welcome, dreamer/i)).toBeVisible();
    });
});

test.describe('writing a dream', () => {
    test('offers the write form from the bottom nav', async ({ page }) => {
        await signUp(page);
        await page.getByRole('button', { name: /^add$/i }).click();

        await expect(page).toHaveURL(/\/add\/write$/);
        await expect(page.getByPlaceholder(/describe your dream/i)).toBeVisible();
    });

    test('offers the recorder from the home screen', async ({ page }) => {
        await signUp(page);
        await page.getByText(/record dream/i).click();

        await expect(page).toHaveURL(/\/add\/record$/);
        await expect(page.getByText(/tap to speak/i)).toBeVisible();
    });

    test('will not submit an empty dream', async ({ page }) => {
        await signUp(page);
        await page.goto('/add/write');

        await expect(page.getByRole('button', { name: /interpret dream/i })).toBeDisabled();
    });

    // No AI keys are configured in this environment, so this is the path a
    // user hits today. It has to fail visibly rather than hang.
    test('reports failure when the AI is unreachable', async ({ page }) => {
        // A browser dialog would block the page, ignore the design and be
        // impossible to style. Nothing should open one.
        const dialogs: string[] = [];
        page.on('dialog', async dialog => {
            dialogs.push(dialog.message());
            await dialog.dismiss();
        });

        await signUp(page);
        await page.goto('/add/write');

        await page.getByPlaceholder(/describe your dream/i).fill('I was flying over a red ocean');
        await page.getByRole('button', { name: /interpret dream/i }).click();

        // Nothing stands between the click and the request: the five second
        // rewarded-video gate is gone, so there is no "Skip Ad" to wait for.
        await expect(page.getByText(/skip ad/i)).toBeHidden();

        // The reason the server actually gave, inline and styled, rather than
        // a generic "Failed to process dream." in a browser dialog.
        const alert = page.getByRole('alert');
        await expect(alert).toBeVisible({ timeout: 30_000 });
        await expect(alert).toContainText(/GEMINI_API_KEY|failed to interpret/i);

        expect(dialogs, 'a browser dialog was opened').toEqual([]);

        // Back on the form with the text still in it, so a retry does not
        // mean retyping the dream.
        const textarea = page.getByPlaceholder(/describe your dream/i);
        await expect(textarea).toBeVisible();
        await expect(textarea).toHaveValue('I was flying over a red ocean');
    });
});

test.describe('keyboard', () => {
    // Most of this app's navigation goes through Card, which was a bare div
    // with an onClick: reachable with a mouse and by nothing else.
    test('the home menu can be used without a mouse', async ({ page }) => {
        await signUp(page);

        await page.getByRole('button', { name: /write dream/i }).focus();
        await page.keyboard.press('Enter');

        await expect(page).toHaveURL(/\/add\/write$/);
    });

    test('an archive row opens with the keyboard', async ({ page, request }) => {
        await signUpWithDreams(page, request);
        await page.goto('/archive');

        await page.getByRole('button', { name: /red ocean/i }).focus();
        await page.keyboard.press('Enter');

        await expect(page).toHaveURL(/\/dream\//);
    });

    test('Space activates a card as well as Enter', async ({ page }) => {
        await signUp(page);

        await page.getByRole('button', { name: /psych\. models/i }).focus();
        await page.keyboard.press('Space');

        await expect(page).toHaveURL(/\/models$/);
    });

    test('the menu tiles are announced as buttons', async ({ page }) => {
        await signUp(page);
        await expect(page.getByRole('button', { name: /record dream/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /psych\. models/i })).toBeVisible();
    });
});
