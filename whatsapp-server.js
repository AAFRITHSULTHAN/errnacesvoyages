import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import Boom from '@hapi/boom';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import qrcode from 'qrcode';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon Key is missing in environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const app = express();
app.use(express.json());

let sock = null;
let connectionStatus = 'close'; // 'connecting', 'qr', 'open', 'close'
let qrCodeDataUrl = '';

// Deterministic UUID helper from any string JID to prevent duplicate leads
function jidToUuid(jid) {
    let hash = 0;
    for (let i = 0; i < jid.length; i++) {
        const char = jid.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    const hex = Math.abs(hash).toString(16).padEnd(32, '0');
    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-4${hex.substring(12, 15)}-a${hex.substring(15, 18)}-${hex.substring(18, 30)}`;
}

// Clean JID phone number
function cleanJidPhone(jid) {
    return jid.split('@')[0];
}

async function syncContactToSupabase(jid, name, isGroup, isLive = false) {
    const cleanPhone = cleanJidPhone(jid);
    const normalizedSearch = cleanPhone.replace(/\D/g, '');
    
    // Fetch all leads to do normalized phone matching
    const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*');
        
    if (leadsError) {
        console.error('Failed to fetch leads for contact sync:', leadsError.message);
        return null;
    }

    let matchingLead = leads?.find(lead => {
        if (!lead.phone) return false;
        const cleanLeadPhone = lead.phone.replace(/\D/g, '');
        return cleanLeadPhone === normalizedSearch || 
               cleanLeadPhone.endsWith(normalizedSearch) || 
               normalizedSearch.endsWith(cleanLeadPhone);
    });

    if (matchingLead) {
        // If the matching lead was soft-deleted, restore it only on a live message!
        if (matchingLead.notes === '[DELETED]' && isLive) {
            console.log(`Restoring soft-deleted lead for contact on live message: ${matchingLead.name}`);
            const { error: restoreError } = await supabase
                .from('leads')
                .update({ notes: null })
                .eq('id', matchingLead.id);
            if (restoreError) {
                console.error(`Failed to restore lead:`, restoreError.message);
            }
        }

        // If the lead name is the default "WhatsApp (...)" format and we received a better name, update it!
        if (name && (matchingLead.name.startsWith('WhatsApp (') || matchingLead.name.startsWith('WhatsApp Lead ('))) {
            console.log(`Updating default contact name for ${cleanPhone} from "${matchingLead.name}" to "${name}"`);
            const { error: updateNameError } = await supabase
                .from('leads')
                .update({ name: name })
                .eq('id', matchingLead.id);
            if (updateNameError) {
                console.error(`Failed to update default lead name:`, updateNameError.message);
            }
        }
        return matchingLead.id;
    } else {
        // Create new lead using deterministic UUID
        const id = jidToUuid(jid);
        console.log(`Syncing new contact: ${name || cleanPhone} (${jid})`);
        const { error } = await supabase
            .from('leads')
            .insert({
                id: id,
                name: name || (isGroup ? 'Unnamed Group' : `WhatsApp (${cleanPhone})`),
                phone: isGroup ? `group-${cleanPhone}` : `+${cleanPhone}`,
                email: isGroup ? `group-${cleanPhone}@whatsapp.group` : `${cleanPhone}@whatsapp.crm`,
                source: isGroup ? 'WhatsApp Group' : 'WhatsApp Web',
                status: isGroup ? 'converted' : 'new',
                created_at: new Date().toISOString()
            });
        if (error) {
            console.error(`Failed to create lead for ${jid}:`, error.message);
        }
        return id;
    }
}

async function syncMessageToSupabase(msg, leadId) {
    const messageContent = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || 
                          msg.message?.imageMessage?.caption || 
                          (msg.message?.imageMessage ? '📷 Photo' : null) || 
                          '';

    if (!messageContent.trim()) return;

    const isUser = msg.key.fromMe;
    const sender = isUser ? 'user' : 'contact';
    const timestamp = new Date((msg.messageTimestamp?.low || msg.messageTimestamp) * 1000).toISOString();

    // Check if message already exists (prevent duplicates by content & timestamp match)
    const { data: existing } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('lead_id', leadId)
        .eq('content', messageContent)
        .eq('sender', sender)
        .maybeSingle();

    if (!existing) {
        const { error } = await supabase
            .from('whatsapp_messages')
            .insert({
                lead_id: leadId,
                sender: sender,
                content: messageContent,
                status: 'read',
                created_at: timestamp
            });
        if (error) {
            console.error(`Failed to save message:`, error.message);
        }
    }

    // Parse name and tour package from incoming contact messages (not groups)
    const remoteJid = msg.key.remoteJid || '';
    const isGroup = remoteJid.endsWith('@g.us');

    if (!isUser && !isGroup && messageContent.trim()) {
        try {
            const { data: lead, error: leadErr } = await supabase
                .from('leads')
                .select('name, selected_package, tour_interest')
                .eq('id', leadId)
                .maybeSingle();

            if (!leadErr && lead) {
                // Fetch active tour packages
                const { data: tourPackages, error: toursErr } = await supabase
                    .from('tours')
                    .select('id, title')
                    .eq('status', 'active')
                    .order('title', { ascending: true });

                if (!toursErr && tourPackages && tourPackages.length > 0) {
                    const rawBody = messageContent.trim();
                    let parsedName = rawBody;
                    let selectedPackage = null;

                    // A. Try parsing package by index number (e.g. "John Doe - 2")
                    const numbers = rawBody.match(/\d+/g);
                    if (numbers) {
                        for (const numStr of numbers) {
                            const val = parseInt(numStr, 10);
                            if (val >= 1 && val <= tourPackages.length) {
                                selectedPackage = tourPackages[val - 1];
                                const numRegex = new RegExp(`\\s*[-–—,\\.]*\\s*${numStr}\\s*|\\s*${numStr}\\s*[-–—,\\.]*\\s*`);
                                parsedName = rawBody.replace(numRegex, ' ').replace(/\s+/g, ' ').trim();
                                break;
                            }
                        }
                    }

                    // B. Try parsing package by title matching (e.g. "John Doe - Dubai Package")
                    if (!selectedPackage) {
                        for (const pkg of tourPackages) {
                            const titleEscaped = pkg.title.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                            const titleRegex = new RegExp(`\\b${titleEscaped}\\b`, 'i');
                            if (titleRegex.test(rawBody)) {
                                selectedPackage = pkg;
                                const replaceRegex = new RegExp(`\\s*[-–—,\\.]*\\s*${titleEscaped}\\s*|\\s*${titleEscaped}\\s*[-–—,\\.]*\\s*`, 'i');
                                parsedName = rawBody.replace(replaceRegex, ' ').replace(/\s+/g, ' ').trim();
                                break;
                            }
                        }
                    }

                    const GREETINGS = ['hi', 'hii', 'hiii', 'hello', 'hey', 'heyy', 'hola', 'start', 'menu', 'restart', 'good morning', 'good afternoon', 'good evening'];
                    const isGreeting = GREETINGS.includes(parsedName.toLowerCase().trim());
                    const hasValidName = parsedName.length >= 2 && !isGreeting;

                    if (selectedPackage) {
                        const updatePayload = {
                            selected_package: selectedPackage.title,
                            tour_interest: selectedPackage.title,
                            status: 'qualified',
                            selection_timestamp: new Date().toISOString()
                        };

                        if (hasValidName && (lead.name.startsWith('WhatsApp (') || lead.name.startsWith('WhatsApp Lead ('))) {
                            updatePayload.name = parsedName;
                        }

                        console.log(`[Parser] Updating lead ${leadId}: name="${updatePayload.name || lead.name}", package="${selectedPackage.title}"`);
                        const { error: updateErr } = await supabase
                            .from('leads')
                            .update(updatePayload)
                            .eq('id', leadId);
                        
                        if (updateErr) {
                            console.error('[Parser] Failed to update lead details:', updateErr.message);
                        }
                    }
                }
            }
        } catch (parseErr) {
            console.error('[Parser] Error parsing incoming message details:', parseErr);
        }
    }
}

async function startWhatsApp() {
    connectionStatus = 'connecting';
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        syncFullHistory: true,
        shouldSyncHistoryMessage: () => true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            connectionStatus = 'qr';
            qrCodeDataUrl = await qrcode.toDataURL(qr);
            console.log('New QR Code generated');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);
            connectionStatus = 'close';
            qrCodeDataUrl = '';
            if (shouldReconnect) {
                setTimeout(startWhatsApp, 3000);
            }
        } else if (connection === 'open') {
            console.log('WhatsApp connection successfully opened!');
            connectionStatus = 'open';
            qrCodeDataUrl = '';
        }
    });

    // History sync from linked device
    sock.ev.on('messaging-history.set', async ({ chats, contacts: rawContacts, messages }) => {
        console.log(`Initial history sync started. Syncing ${chats?.length || 0} chats, ${messages?.length || 0} messages.`);
        
        // 1. Sync Chats and Groups
        if (chats) {
            for (const chat of chats) {
                const isGroup = chat.id.endsWith('@g.us');
                await syncContactToSupabase(chat.id, chat.name || chat.subject, isGroup, false);
            }
        }

        // 2. Sync Messages
        if (messages) {
            for (const msg of messages) {
                if (msg.key?.remoteJid) {
                    const leadId = await syncContactToSupabase(msg.key.remoteJid, msg.pushName || null, msg.key.remoteJid.endsWith('@g.us'), false);
                    if (leadId) {
                        await syncMessageToSupabase(msg, leadId);
                    }
                }
            }
        }
        console.log('Initial history sync completed!');
    });

    // Live messages handler
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (!msg.key?.remoteJid) continue;
            
            const jid = msg.key.remoteJid;
            const isGroup = jid.endsWith('@g.us');
            
            // Sync contact first and get correct leadId
            const leadId = await syncContactToSupabase(jid, msg.pushName || null, isGroup, true);
            
            // Sync live message
            if (leadId) {
                await syncMessageToSupabase(msg, leadId);
            }
        }
    });
}

// API Endpoints
app.get('/whatsapp-api/status', (req, res) => {
    res.json({
        status: connectionStatus,
        qr: qrCodeDataUrl
    });
});

app.post('/whatsapp-api/send', async (req, res) => {
    const { to, message } = req.body;
    if (!to || !message) {
        return res.status(400).json({ error: 'Missing to or message' });
    }

    if (connectionStatus !== 'open' || !sock) {
        return res.status(500).json({ error: 'WhatsApp is not connected' });
    }

    try {
        let targetJid = to;
        // Format destination JID if it's not already a JID
        if (!to.includes('@')) {
            const clean = to.replace(/\D/g, '');
            targetJid = clean.includes('-') || clean.length > 15 
                ? `${clean}@g.us` 
                : `${clean}@s.whatsapp.net`;
        }

        const sent = await sock.sendMessage(targetJid, { text: message });
        res.json({ success: true, messageId: sent.key.id });
    } catch (err) {
        console.error('Failed to send message via Baileys:', err);
        res.status(500).json({ error: err.message });
    }
});

// Express Server
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Local WhatsApp Web sync server listening on port ${PORT}`);
    startWhatsApp();
});
