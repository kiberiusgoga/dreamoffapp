// Authentication routes
// POST /register — create new user with hashed password
// POST /login    — validate credentials, return JWT
// GET  /me       — return current user profile (protected)

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDB } from '../models/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
const SALT_ROUNDS = 10;

function generateToken(user) {
    return jwt.sign(
        { email: user.email, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

// ── Register ──
router.post('/register', async (req, res) => {
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

        const db = getDB();
        const existing = db.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existing) {
            return res.status(409).json({ error: 'User already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const newUser = {
            email: email.toLowerCase(),
            name,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        db.data.users.push(newUser);
        await db.write();

        const token = generateToken(newUser);
        res.status(201).json({
            token,
            user: { email: newUser.email, name: newUser.name, createdAt: newUser.createdAt }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// ── Login ──
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const db = getDB();
        const user = db.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
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
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        const user = db.data.users.find(u => u.email === req.user.email);
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

export default router;
