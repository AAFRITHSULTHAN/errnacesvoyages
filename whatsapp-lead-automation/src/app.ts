import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api';

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(cors());

// CRITICAL: Twilio sends webhooks as application/x-www-form-urlencoded.
// This parser maps those parameters to req.body.
app.use(express.urlencoded({ extended: true }));

// Standard JSON parser
app.use(express.json());

// API routing mount points
app.use('/api', apiRouter);
app.use('/', apiRouter); // Root mapping fallback for convenience

// Basic health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        service: 'WhatsApp Lead Automation'
    });
});

export default app;
