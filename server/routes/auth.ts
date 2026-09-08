// Authentication routes
// POST /register — create new user with hashed password
// POST /login    — validate credentials, return JWT
// GET  /me       — return current user profile (protected)

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Dream } from '../models/index.js';
import { deleteImage } from '../storage.js';
import { authenticateToken } from '../middleware/auth.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();
const SALT_ROUNDS = 10;

function generateToken(user: { id: string; email: string; name: string }) {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

// ── Register ──
router.post('/register', authLimiter, async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format.' });
        }

        const existing = await User.findOne({ where: { email: email.toLowerCase() } });
        if (existing) {
            return res.status(409).json({ error: 'User already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const dbUser = await User.create({
            email: email.toLowerCase(),
            name,
            password: hashedPassword
        });

        // Sign from the persisted row: only it has the generated id.
        const token = generateToken(dbUser);
        res.status(201).json({
            token,
            user: { email: dbUser.email, name: dbUser.name, createdAt: dbUser.createdAt }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ── Login ──
router.post('/login', authLimiter, async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = await User.findOne({ where: { email: email.toLowerCase() } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const token = generateToken(user);
        res.json({
            token,
            user: { email: user.email, name: user.name, createdAt: user.createdAt }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ── Get current user (protected) ──
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
    try {
        const user = await User.findByPk(req.user!.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({
            user: { email: user.email, name: user.name, createdAt: user.createdAt }
        });
    } catch (err) {
        console.error('Me error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ── Export everything this account holds ──
// The right to a portable copy is not satisfied by a screen you can read;
// it has to be a file you can take somewhere else.
router.get('/me/export', authenticateToken, async (req: Request, res: Response) => {
    try {
        const user = await User.findByPk(req.user!.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const dreams = await Dream.findAll({
            where: { userId: user.id },
            order: [['date', 'ASC']]
        });

        const filename = `dreamoff-export-${new Date().toISOString().slice(0, 10)}.json`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json({
            exportedAt: new Date().toISOString(),
            account: {
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            },
            dreams: dreams.map(d => ({
                id: d.id,
                date: d.date,
                text: d.text,
                title: d.title,
                content: d.content,
                transcription: d.transcription,
                model: d.model,
                language: d.language,
                mood: d.mood,
                lucid: d.lucid,
                themes: d.themes,
                interpretation: d.interpretation,
                chatHistory: d.chatHistory,
                // A path, not the bytes: the images are downloadable while the
                // account exists, and inlining them would make this enormous.
                imageUrl: d.imageUrl
            }))
        });
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ── Delete the account and everything in it ──
router.delete('/me', authenticateToken, authLimiter, async (req: Request, res: Response) => {
    try {
        const { password } = req.body ?? {};

        // Deleting years of someone's dreams should not be one stray click,
        // and a stolen token should not be enough to do it.
        if (typeof password !== 'string' || !password) {
            return res.status(400).json({ error: 'Your password is required to delete the account.' });
        }

        const user = await User.findByPk(req.user!.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        if (!(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // Explicit rather than relying on the foreign key: SQLite only
        // enforces ON DELETE CASCADE when the pragma is on, and a cascade
        // could never remove the image files from disk anyway.
        const dreams = await Dream.findAll({ where: { userId: user.id } });
        for (const dream of dreams) {
            await deleteImage(dream.imageUrl);
        }

        const removed = await Dream.destroy({ where: { userId: user.id } });
        await user.destroy();

        console.log(`[DreamOff] Account deleted, ${removed} dream(s) removed`);
        res.json({ success: true, dreamsDeleted: removed });
    } catch (err) {
        console.error('Delete account error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;
