import twilio from 'twilio';
import { env } from '../config/env';

class TwilioService {
    private client: twilio.Twilio;

    constructor() {
        this.client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    }

    /**
     * Send a WhatsApp message to a customer
     * @param to Customer phone number (e.g. "+1234567890" or "whatsapp:+1234567890")
     * @param body Message content text
     */
    async sendWhatsAppMessage(to: string, body: string): Promise<string> {
        try {
            // Ensure the numbers are formatted in the correct format for Twilio WhatsApp
            const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
            const formattedFrom = env.TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:') 
                ? env.TWILIO_WHATSAPP_NUMBER 
                : `whatsapp:${env.TWILIO_WHATSAPP_NUMBER}`;

            console.log(`[Twilio SMS] Sending WhatsApp from ${formattedFrom} to ${formattedTo}...`);

            const response = await this.client.messages.create({
                to: formattedTo,
                from: formattedFrom,
                body: body
            });

            console.log(`[Twilio SMS] Message sent successfully. SID: ${response.sid}`);
            return response.sid;
        } catch (error: any) {
            console.error('[Twilio SMS] Error sending WhatsApp message:', error);
            throw new Error(`Failed to send WhatsApp message via Twilio: ${error.message}`);
        }
    }
}

export const twilioService = new TwilioService();
