import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { Lead, TourPackage, Conversation, ConversationStage } from '../types';

class SupabaseService {
    private client: SupabaseClient;

    constructor() {
        this.client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            }
        });
    }

    /**
     * Fetch active tour packages from Supabase
     */
    async getActiveTourPackages(): Promise<TourPackage[]> {
        const { data, error } = await this.client
            .from('tours')
            .select('id, title, status')
            .eq('status', 'active')
            .order('title', { ascending: true });

        if (error) {
            console.error('Error fetching active tour packages:', error);
            throw new Error(`Failed to fetch active tour packages: ${error.message}`);
        }

        return (data || []).map((pkg: any) => ({
            id: pkg.id,
            name: pkg.title,
            active: pkg.status === 'active'
        })) as TourPackage[];
    }

    /**
     * Retrieve conversation details by customer phone number
     */
    async getConversationByPhone(phone: string): Promise<Conversation | null> {
        const { data, error } = await this.client
            .from('whatsapp_conversations')
            .select('*')
            .eq('phone', phone)
            .maybeSingle();

        if (error) {
            console.error(`Error fetching conversation for ${phone}:`, error);
            throw new Error(`Failed to fetch conversation: ${error.message}`);
        }

        return data as Conversation | null;
    }

    /**
     * Create a new tracking conversation state for a user
     */
    async createConversation(phone: string): Promise<Conversation> {
        const { data, error } = await this.client
            .from('whatsapp_conversations')
            .insert({
                phone,
                stage: 'package_selection',
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error(`Error creating conversation for ${phone}:`, error);
            throw new Error(`Failed to create conversation: ${error.message}`);
        }

        return data as Conversation;
    }

    /**
     * Update the conversation state (stage, selected package, update timestamp)
     */
    async updateConversation(
        phone: string,
        stage: ConversationStage,
        selectedPackage: string | null = null
    ): Promise<Conversation> {
        const { data, error } = await this.client
            .from('whatsapp_conversations')
            .update({
                stage,
                selected_package: selectedPackage,
                updated_at: new Date().toISOString()
            })
            .eq('phone', phone)
            .select()
            .single();

        if (error) {
            console.error(`Error updating conversation for ${phone}:`, error);
            throw new Error(`Failed to update conversation: ${error.message}`);
        }

        return data as Conversation;
    }

    /**
     * Find existing lead by phone number (using digits-only normalization to prevent duplicates)
     */
    async getLeadByPhone(phone: string): Promise<Lead | null> {
        // Clean target phone number for normalized matching
        const cleanTarget = phone.replace(/\D/g, '');

        // Fetch all leads to do normalized phone comparison (robust against formatting issues)
        const { data: leads, error } = await this.client
            .from('leads')
            .select('*');

        if (error) {
            console.error('Error fetching leads for duplicate check:', error);
            throw new Error(`Failed to check existing leads: ${error.message}`);
        }

        const match = leads?.find((lead: any) => {
            if (!lead.phone) return false;
            const cleanLeadPhone = lead.phone.replace(/\D/g, '');
            return cleanLeadPhone === cleanTarget || 
                   cleanLeadPhone.endsWith(cleanTarget) || 
                   cleanTarget.endsWith(cleanLeadPhone);
        });

        return match ? (match as Lead) : null;
    }

    /**
     * Create a new lead record
     */
    async createLead(phone: string): Promise<Lead> {
        // Build clean default name using number
        const cleanNumber = phone.replace(/\D/g, '');
        const newLead = {
            name: `WhatsApp Lead (${phone})`,
            phone: phone,
            email: `${cleanNumber}@whatsapp.crm`,
            source: 'WhatsApp',
            status: 'New Lead',
            created_at: new Date().toISOString()
        };

        const { data, error } = await this.client
            .from('leads')
            .insert(newLead)
            .select()
            .single();

        if (error) {
            console.error(`Error creating lead for ${phone}:`, error);
            throw new Error(`Failed to create lead: ${error.message}`);
        }

        return data as Lead;
    }

    /**
     * Update the lead's tour selection status, package name, and timestamp
     */
    async updateLeadSelection(leadId: string, packageName: string): Promise<Lead> {
        const { data, error } = await this.client
            .from('leads')
            .update({
                status: 'Interested',
                selected_package: packageName,
                selection_timestamp: new Date().toISOString()
            })
            .eq('id', leadId)
            .select()
            .single();

        if (error) {
            console.error(`Error updating lead tour package selection for ${leadId}:`, error);
            throw new Error(`Failed to update lead selection: ${error.message}`);
        }

        return data as Lead;
    }
}

export const supabaseService = new SupabaseService();
