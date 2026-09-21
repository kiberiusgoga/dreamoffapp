import { defineConfig, devices } from '@playwright/test';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

// These tests run against the shape that actually ships: one Express process
// serving the built frontend and the API from the same origin, in production
// mode. That means the real Content-Security-Policy is in force — the header
// the unit tests could assert the text of but never prove a browser would
// accept.
const PORT = 5099;
export const BASE_URL = `http://127.0.0.1:${PORT}`;

// Created here rather than in globalSetup so it exists before the web server
// command runs, whatever order Playwright chooses.
const scratch = mkdtempSync(join(tmpdir(), 'dreamoff-e2e-'));
mkdirSync(join(scratch, 'uploads'), { recursive: true });

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    // One worker: the suite shares a single server and one SQLite file, and
    // SQLite takes one writer.
    workers: 1,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

    use: {
        baseURL: BASE_URL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        }
    ],

    webServer: {
        // Build first: the server serves dist, and a stale bundle would make
        // the run meaningless.
        command: 'npm run build && npm start --prefix server',
        url: `${BASE_URL}/api/health`,
        reuseExistingServer: false,
        timeout: 180_000,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
            NODE_ENV: 'production',
            PORT: String(PORT),
            DATABASE_PATH: join(scratch, 'database.sqlite'),
            UPLOADS_PATH: join(scratch, 'uploads'),
            JWT_SECRET: randomBytes(32).toString('hex'),
            // The suite signs in repeatedly; the limiter has its own coverage.
            AUTH_RATE_LIMIT_MAX: '10000',
            AI_RATE_LIMIT_MAX: '10000',
            LOG_LEVEL: 'warn',

            // Blank on purpose, and set here rather than left to chance.
            //
            // dotenv does not overwrite a variable that is already present, so
            // these win over whatever is in server/.env. Without them the suite
            // picks up a developer's real keys: the "AI is unreachable" journey
            // stops being reachable, and every run spends money at Google and
            // Hugging Face — in CI too, on every push.
            GEMINI_API_KEY: '',
            HUGGINGFACE_API_KEY: ''
        }
    }
});
