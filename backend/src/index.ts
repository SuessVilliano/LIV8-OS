import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './api/auth.js';
import operatorRouter from './api/operator.js';
import setupRouter from './api/setup.js';
import analyticsRouter from './api/analytics.js';
import taskmagicRouter from './api/taskmagic.js';
import socialContentRouter from './api/social-content.js';
import settingsRouter from './api/settings.js';
import agentsRouter from './api/agents.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow extension side panel (no origin or chrome-extension)
        if (!origin || origin.startsWith('chrome-extension://')) {
            callback(null, true);
        }
        // Allow GHL webhook calls
        else if (origin?.includes('gohighlevel.com') || origin?.includes('leadconnectorhq.com')) {
            callback(null, true);
        }
        else if (process.env.NODE_ENV === 'production') {
            const allowed = [
                'https://your-dashboard-domain.vercel.app',
                'https://os.liv8ai.com',
                'https://app.gohighlevel.com'
            ];
            if (allowed.includes(origin)) {
                callback(null, true);
            } else {
                // Allow webhooks (no origin) in production
                callback(null, true);
            }
        } else {
            callback(null, true);
        }
    },
    credentials: true
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'LIV8 GHL Backend' });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/operator', operatorRouter);
app.use('/api/setup', setupRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/taskmagic', taskmagicRouter);
app.use('/api/social', socialContentRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/agents', agentsRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server (for local development)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 LIV8 GHL Backend running on http://localhost:${PORT}`);
    });
}

// Export for Vercel
export default app;
