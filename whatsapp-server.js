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

async function syncContactToSupabase(jid, name, isGroup) {
    const id = jidToUuid(jid);
    const cleanPhone = cleanJidPhone(jid);
    
    // Check if lead already exists
    const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .eq('id', id)
        .maybeSingle();

    if (!existing) {
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
    }
}

async function syncMessageToSupabase(msg, jid) {
    const leadId = jidToUuid(jid);
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
                await syncContactToSupabase(chat.id, chat.name || chat.subject, isGroup);
            }
        }

        // 2. Sync Messages
        if (messages) {
            for (const msg of messages) {
                if (msg.key?.remoteJid) {
                    await syncMessageToSupabase(msg, msg.key.remoteJid);
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
            
            // Sync contact first if we don't have it
            await syncContactToSupabase(jid, null, isGroup);
            
            // Sync live message
            await syncMessageToSupabase(msg, jid);
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
