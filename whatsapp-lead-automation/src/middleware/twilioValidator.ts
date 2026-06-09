import { Request, Response, NextFunction } from 'express';
import twilio from 'twilio';
import { env } from '../config/env';

/**
 * Express middleware to validate incoming requests from Twilio.
 * Ensures the request originates from Twilio and hasn't been tampered with.
 */
export const validateTwilioSignature = (req: Request, res: Response, next: NextFunction) => {
    // Option to bypass validation in local development scenarios
    if (process.env.SKIP_TWILIO_VALIDATION === 'true' || process.env.NODE_ENV === 'test') {
        console.warn('⚠️ Twilio signature validation skipped (development bypass active)');
        return next();
    }

    const signature = req.header('x-twilio-signature');
    if (!signature) {
        console.error('❌ Request Rejected: Missing x-twilio-signature header');
        return res.status(401).send('Unauthorized: Missing x-twilio-signature header');
    }

    // Resolve original protocol and host, handling proxies (e.g. Ngrok, Cloudflare, load balancers)
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
    const originalUrl = req.originalUrl;
    
    // Construct the exact URL Twilio hit
    const fullUrl = `${protocol}://${host}${originalUrl}`;
    
    // In Express, URLencoded parser populates req.body with key-value pairs
    const params = req.body;

    try {
        const isValid = twilio.validateRequest(
            env.TWILIO_AUTH_TOKEN,
            signature,
            fullUrl,
            params
        );

        if (!isValid) {
            console.error(`❌ Twilio signature validation failed.`);
            console.error(`Expected URL: ${fullUrl}`);
            console.error(`Received Signature: ${signature}`);
            return res.status(403).send('Forbidden: Twilio signature validation failed');
        }

        console.log(`✅ Twilio webhook signature verified for request: ${fullUrl}`);
        return next();
    } catch (err) {
        console.error('Error occurred during Twilio signature validation:', err);
        return res.status(500).send('Internal Server Error: Webhook validation failed');
    }
};
