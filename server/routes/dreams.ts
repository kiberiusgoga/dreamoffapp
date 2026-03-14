import { Router, Request, Response } from 'express';
import { Dream, User } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// All dream routes require authentication
router.use(authenticateToken);

// ── Get all dreams for the current user ──
router.get('/', async (req: any, res: Response): Promise<any> => {
    try {
        const user = await User.findOne({ where: { email: req.user.email } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const dreams = await Dream.findAll({ 
            where: { userId: user.id }, 
            order: [['date', 'DESC']] 
        });
        
        // Map to format expected by frontend
        const formattedDreams = dreams.map(d => ({
            id: d.id,
            date: d.date,
            title: d.title || '',
            content: d.content || '',
            lucid: d.lucid || false,
            themes: d.themes || [],
            mood: d.mood || '',
            chatHistory: d.chatHistory || []
        }));
        
        res.json(formattedDreams);
    } catch (err) {
        console.error('Fetch dreams error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ── Add a new dream ──
router.post('/', async (req: any, res: Response): Promise<any> => {
    try {
        const user = await User.findOne({ where: { email: req.user.email } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const newDream = await Dream.create({
            ...req.body,
            userId: user.id
        });
        
        res.status(201).json({
            id: newDream.id,
            date: newDream.date,
            title: newDream.title || '',
            content: newDream.content || '',
            lucid: newDream.lucid || false,
            themes: newDream.themes || [],
            mood: newDream.mood || '',
            chatHistory: newDream.chatHistory || []
        });
    } catch (err) {
        console.error('Add dream error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ── Delete a dream ──
router.delete('/:id', async (req: any, res: Response): Promise<any> => {
    try {
        const user = await User.findOne({ where: { email: req.user.email } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const deletedCount = await Dream.destroy({ 
            where: { id: req.params.id, userId: user.id } 
        });
        
        if (deletedCount === 0) {
            return res.status(404).json({ error: 'Dream not found' });
        }

        res.json({ success: true, id: req.params.id });
    } catch (err) {
        console.error('Delete dream error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
