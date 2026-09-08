import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import app from '../app.js';
import { initDB } from '../models/db.js';
import { migrateDB } from '../models/index.js';
import { saveImage, UPLOADS_DIR } from '../storage.js';

const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
);

let seq = 0;
async function newAccount() {
    const email = `acct${seq++}-${Date.now()}@test.local`;
    const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Owner', email, password: 'secret123' });
    return { email, token: res.body.token as string };
}

const addDream = (token: string, body: Record<string, unknown>) =>
    request(app).post('/api/dreams').set('Authorization', `Bearer ${token}`).send(body);

beforeAll(async () => {
    await initDB();
    await migrateDB();
});

describe('GET /api/auth/me/export', () => {
    let token = '';

    beforeEach(async () => {
        ({ token } = await newAccount());
    });

    it('requires a token', async () => {
        expect((await request(app).get('/api/auth/me/export')).status).toBe(401);
    });

    it('returns the account and its dreams', async () => {
        await addDream(token, { text: 'flying over a red ocean', model: 'jung' });
        await addDream(token, { text: 'a dark forest', model: 'freud' });

        const res = await request(app).get('/api/auth/me/export').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.account.name).toBe('Owner');
        expect(res.body.dreams).toHaveLength(2);
        expect(res.body.dreams.map((d: { text: string }) => d.text)).toEqual([
            'flying over a red ocean',
            'a dark forest'
        ]);
        expect(res.body.exportedAt).toEqual(expect.any(String));
    });

    it('offers itself as a download rather than a page', async () => {
        const res = await request(app).get('/api/auth/me/export').set('Authorization', `Bearer ${token}`);
        expect(res.headers['content-disposition']).toMatch(/attachment; filename="dreamoff-export-\d{4}-\d{2}-\d{2}\.json"/);
    });

    it('never includes the password hash', async () => {
        const res = await request(app).get('/api/auth/me/export').set('Authorization', `Bearer ${token}`);
        expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
        expect(res.body.account).not.toHaveProperty('password');
    });

    it('carries the interpretation and the conversation, not just the text', async () => {
        await addDream(token, {
            text: 'a dream',
            interpretation: { summary: 'freedom' },
            chatHistory: [{ role: 'user', content: 'why?' }]
        });

        const res = await request(app).get('/api/auth/me/export').set('Authorization', `Bearer ${token}`);
        expect(res.body.dreams[0].interpretation).toEqual({ summary: 'freedom' });
        expect(res.body.dreams[0].chatHistory).toEqual([{ role: 'user', content: 'why?' }]);
    });

    it('exports only the caller’s dreams', async () => {
        const other = await newAccount();
        await addDream(other.token, { text: 'someone else’s dream' });
        await addDream(token, { text: 'mine' });

        const res = await request(app).get('/api/auth/me/export').set('Authorization', `Bearer ${token}`);
        expect(res.body.dreams).toHaveLength(1);
        expect(res.body.dreams[0].text).toBe('mine');
    });

    it('works for an account with no dreams', async () => {
        const res = await request(app).get('/api/auth/me/export').set('Authorization', `Bearer ${token}`);
        expect(res.body.dreams).toEqual([]);
    });
});

describe('DELETE /api/auth/me', () => {
    let token = '';
    let email = '';

    beforeEach(async () => {
        ({ token, email } = await newAccount());
    });

    const remove = (body: Record<string, unknown>, auth = token) =>
        request(app).delete('/api/auth/me').set('Authorization', `Bearer ${auth}`).send(body);

    it('requires a token', async () => {
        expect((await request(app).delete('/api/auth/me').send({ password: 'secret123' })).status).toBe(401);
    });

    // A stolen token should not be enough to erase years of someone's diary.
    it('requires the password, not just a session', async () => {
        const res = await remove({});
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/password is required/i);
    });

    it('rejects the wrong password', async () => {
        const res = await remove({ password: 'not-my-password' });
        expect(res.status).toBe(401);

        // And the account is still there.
        expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(200);
    });

    it('deletes the account with the right password', async () => {
        const res = await remove({ password: 'secret123' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('takes the dreams with it', async () => {
        await addDream(token, { text: 'one' });
        await addDream(token, { text: 'two' });

        const res = await remove({ password: 'secret123' });
        expect(res.body.dreamsDeleted).toBe(2);
    });

    // A cascade could never do this part: the rows would go and the files
    // would stay on the volume forever.
    it('removes the stored images from disk', async () => {
        const imageUrl = await saveImage(PNG, 'image/png');
        const file = join(UPLOADS_DIR, basename(imageUrl));
        await addDream(token, { text: 'with an image', imageUrl });
        expect(existsSync(file)).toBe(true);

        await remove({ password: 'secret123' });
        expect(existsSync(file), 'image survived account deletion').toBe(false);
    });

    it('leaves the token useless afterwards', async () => {
        await remove({ password: 'secret123' });

        // The signature is still valid, but the account behind it is gone.
        expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(404);
        expect((await request(app).get('/api/dreams').set('Authorization', `Bearer ${token}`)).body).toEqual([]);
    });

    it('frees the email address for reuse', async () => {
        await remove({ password: 'secret123' });

        const again = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Owner', email, password: 'secret123' });
        expect(again.status).toBe(201);
    });

    it('does not touch anyone else’s data', async () => {
        const other = await newAccount();
        await addDream(other.token, { text: 'still here' });

        await remove({ password: 'secret123' });

        const res = await request(app).get('/api/dreams').set('Authorization', `Bearer ${other.token}`);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].text).toBe('still here');
    });
});
