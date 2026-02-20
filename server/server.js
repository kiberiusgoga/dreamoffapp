// DreamOff API Server — Production-ready
// Express + lowdb + JWT authentication
// Serves built React frontend in production

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDB } from './models/db.js';
import authRoutes from './routes/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS — restrict in production, open in dev ──
const isProduction = process.env.NODE_ENV === 'production';
app.use(cors(isProduction ? { origin: false } : {}));

// Parse JSON bodies
app.use(express.json());

// ── API Routes ──
app.use('/api/auth', authRoutes);

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Serve built React frontend (production) ──
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback — all non-API routes serve index.html
app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
});

// ── Start ──
async function start() {
    await initDB();
    app.listen(PORT, () => {
        console.log(`[DreamOff] Server running on port ${PORT} (${isProduction ? 'production' : 'development'})`);
    });
}

start().catch(console.error);
