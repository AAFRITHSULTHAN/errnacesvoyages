import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';
import { validateTwilioSignature } from '../middleware/twilioValidator';

const router = Router();

/**
 * Route: POST /api/webhook/whatsapp
 * Receives incoming Twilio WhatsApp messages, runs signature validation,
 * and handles state machine conversions.
 */
router.post(
    '/webhook/whatsapp',
    validateTwilioSignature,
    WebhookController.handleIncomingMessage
);

export default router;
