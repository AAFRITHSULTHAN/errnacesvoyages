import { Request, Response } from 'express';
import { supabaseService } from '../services/supabaseService';
import { twilioService } from '../services/twilioService';

export class WebhookController {
    /**
     * Handle incoming WhatsApp message webhook from Twilio
     */
    static async handleIncomingMessage(req: Request, res: Response): Promise<Response> {
        const { From, Body } = req.body;

        if (!From || !Body) {
            console.error('❌ Missing From or Body in Twilio payload');
            return res.status(400).send('Missing From or Body');
        }

        const rawFrom = From.toString();
        const rawBody = Body.toString().trim();

        // Clean phone number format (remove "whatsapp:" prefix)
        const cleanPhone = rawFrom.replace('whatsapp:', '').trim(); // e.g. "+1234567890"

        console.log(`\n--- 📥 Incoming WhatsApp Message ---`);
        console.log(`From: ${cleanPhone}`);
        console.log(`Message: "${rawBody}"`);
        console.log(`-----------------------------------`);

        try {
            // 1. Check if conversation state already exists for this phone number
            let conversation = await supabaseService.getConversationByPhone(cleanPhone);
            const activePackages = await supabaseService.getActiveTourPackages();

            if (activePackages.length === 0) {
                console.warn('⚠️ No active tour packages found in database.');
                await twilioService.sendWhatsAppMessage(
                    cleanPhone,
                    "Thank you for contacting us. We currently do not have any active packages available. A travel consultant will contact you shortly."
                );
                return res.status(200).send('<Response></Response>');
            }

            // A. New User / Reset Menu command
            const isResetRequest = ['menu', 'restart', 'start'].includes(rawBody.toLowerCase());
            
            if (!conversation || isResetRequest) {
                if (isResetRequest && conversation) {
                    console.log(`🔄 Resetting conversation state for ${cleanPhone} to menu`);
                    await supabaseService.updateConversation(cleanPhone, 'package_selection', null);
                } else {
                    console.log(`🆕 Creating new conversation state for ${cleanPhone}`);
                    conversation = await supabaseService.createConversation(cleanPhone);
                }

                // 2. Prevent duplicates: Check if lead already exists in CRM
                let lead = await supabaseService.getLeadByPhone(cleanPhone);
                if (!lead) {
                    console.log(`👤 Creating new CRM lead for ${cleanPhone}`);
                    lead = await supabaseService.createLead(cleanPhone);
                } else {
                    console.log(`👤 Matching existing CRM lead found: ID ${lead.id}`);
                }

                // 3. Send package selection prompt
                const packageListString = activePackages
                    .map((pkg, idx) => `${idx + 1}. ${pkg.name}`)
                    .join('\n');

                const replyMessage = `Thank you for contacting us.\n\nPlease select one of our tour packages:\n\n${packageListString}\n\nReply with the package number.`;
                
                await twilioService.sendWhatsAppMessage(cleanPhone, replyMessage);
                return res.status(200).send('<Response></Response>');
            }

            // B. Existing User - Stage: package_selection
            if (conversation.stage === 'package_selection') {
                const selectedIndex = parseInt(rawBody, 10) - 1;

                // Validate selection index
                if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= activePackages.length) {
                    console.log(`⚠️ Invalid input index "${rawBody}" from ${cleanPhone}`);
                    
                    const packageListString = activePackages
                        .map((pkg, idx) => `${idx + 1}. ${pkg.name}`)
                        .join('\n');

                    const invalidReply = `Invalid selection. Please choose a valid tour package number:\n\n${packageListString}\n\nReply with the package number.`;
                    
                    await twilioService.sendWhatsAppMessage(cleanPhone, invalidReply);
                    return res.status(200).send('<Response></Response>');
                }

                const selectedPackage = activePackages[selectedIndex];
                console.log(`✅ Selected Package: ${selectedPackage.name} for user ${cleanPhone}`);

                // Retrieve lead (should exist, fallback if deleted or missing)
                let lead = await supabaseService.getLeadByPhone(cleanPhone);
                if (!lead) {
                    lead = await supabaseService.createLead(cleanPhone);
                }

                // 4. Update lead selection details
                await supabaseService.updateLeadSelection(lead.id, selectedPackage.name);

                // 5. Move conversation stage to completed
                await supabaseService.updateConversation(cleanPhone, 'completed', selectedPackage.name);

                // 6. Send confirmation message
                const confirmationMessage = `Thank you for choosing ${selectedPackage.name}.\n\nOur travel consultant will contact you shortly.`;
                
                await twilioService.sendWhatsAppMessage(cleanPhone, confirmationMessage);
                return res.status(200).send('<Response></Response>');
            }

            // C. Completed Stage
            // If conversation stage is already completed, the user is chatting in open thread.
            // Do not reply automatically (let human agent take over) unless they type 'menu' or 'restart'.
            console.log(`🤖 Conversation state for ${cleanPhone} is already COMPLETED. Human agent mode.`);
            return res.status(200).send('<Response></Response>');

        } catch (error: any) {
            console.error(`❌ Error processing WhatsApp message for ${cleanPhone}:`, error);
            // Internal safety fallback message
            try {
                await twilioService.sendWhatsAppMessage(
                    cleanPhone,
                    "Sorry, we encountered an error while processing your request. Please try again later or reply with 'menu' to restart."
                );
            } catch (twilioErr) {
                console.error('Failed to send error response message via Twilio:', twilioErr);
            }
            return res.status(500).send('Internal Server Error');
        }
    }
}
