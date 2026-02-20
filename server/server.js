// DreamOff API Server — Production (cPanel-ready)
// Single entry point: serves API + built React frontend

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { initDB } from './models/db.js';
import authRoutes from './routes/auth.js';

// Resolve project root (one level up from server/)
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──
// In production Express serves both API and frontend (same origin).
// In dev, Vite proxy handles forwarding so CORS isn't needed either.
// Enable CORS only if explicitly needed.
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// ── API Routes ──
app.use('/api/auth', authRoutes);

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});

// ── Serve built React frontend ──
const distPath = join(ROOT, 'dist');

if (existsSync(distPath)) {
    app.use(express.static(distPath));

    // SPA fallback — any non-API route returns index.html
    app.get('*', (_req, res) => {
        res.sendFile(join(distPath, 'index.html'));
    });
}

// ── Start ──
async function start() {
    await initDB();
    app.listen(PORT, () => {
        console.log(`[DreamOff] Running on port ${PORT}`);
    });
}

start().catch(console.error);
