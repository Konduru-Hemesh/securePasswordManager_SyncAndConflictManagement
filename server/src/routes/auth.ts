import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

/**
 * POST /api/auth/register
 * 
 * Registers a new user with the provided email, password, and optional display name.
 * 
 * @param {string} req.body.email - User's email address.
 * @param {string} req.body.password - User's password (will be hashed).
 * @param {string} [req.body.displayName] - Optional display name.
 * @returns {object} JSON object containing the JWT token and user details.
 */
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password, displayName } = req.body;
        console.log('Registration request:', { email, displayName, password: '***' });

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            email,
            password: hashedPassword,
            displayName
        });

        await user.save();

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                displayName: user.displayName
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/auth/login
 * 
 * Authenticates a user and returns a JWT token.
 * 
 * @param {string} req.body.email - User's email.
 * @param {string} req.body.password - User's password.
 * @returns {object} JSON object containing the JWT token and user details.
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        console.log('Login request:', { email, password: '***' });

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                displayName: user.displayName
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/auth/me
 * 
 * Retrieves the currently authenticated user's profile.
 * Protected route: Requires valid JWT token in Authorization header.
 * 
 * @returns {object} User profile object (excluding password).
 */
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch {
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/auth/profile
router.patch('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const { displayName } = req.body;
        const user = await User.findByIdAndUpdate(
            req.userId,
            { displayName },
            { new: true }
        ).select('-password');

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json(user);
    } catch {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
