export type ConversationStage = 'package_selection' | 'completed';

export interface TourPackage {
    id: string;
    name: string;
    active: boolean;
    created_at?: string;
}

export interface Lead {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: 'New Lead' | 'Interested' | 'Contacted' | 'Qualified' | 'Proposal Sent' | 'Converted' | 'Lost' | string;
    source: string;
    selected_package?: string | null;
    selection_timestamp?: string | null;
    created_at: string;
}

export interface Conversation {
    id: string;
    phone: string;
    stage: ConversationStage;
    selected_package?: string | null;
    created_at: string;
    updated_at: string;
}

export interface TwilioIncomingPayload {
    MessageSid: string;
    AccountSid: string;
    MessagingServiceSid?: string;
    From: string; // e.g. "whatsapp:+14155238886"
    To: string; // e.g. "whatsapp:+17752555600"
    Body: string;
    NumMedia: string;
    SmsSid: string;
    SmsMessageSid: string;
    SmsStatus: string;
    ApiVersion: string;
}
