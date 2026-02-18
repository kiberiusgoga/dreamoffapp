// DreamOff API Server
// Express + lowdb + JWT authentication

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDB } from './models/db.js';
import authRoutes from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server after DB is ready
async function start() {
    await initDB();
    app.listen(PORT, () => {
        console.log(`[DreamOff API] Running on http://localhost:${PORT}`);
    });
}

start().catch(console.error);
