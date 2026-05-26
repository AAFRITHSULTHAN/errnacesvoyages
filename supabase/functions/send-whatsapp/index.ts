import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Incoming message webhook from Twilio
      const formData = await req.formData()
      const from = formData.get('From') // e.g. "whatsapp:+15551234567"
      const body = formData.get('Body') // message content

      if (!from || !body) {
        throw new Error('Missing From or Body in Twilio webhook payload')
      }

      const rawFrom = from.toString()
      // Clean phone number: remove 'whatsapp:' prefix
      const cleanPhone = rawFrom.replace('whatsapp:', '').trim() // e.g. "+15551234567"

      // Initialize Supabase Client with service role key to bypass RLS policies
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Fetch all leads to do normalized phone matching
      const { data: leads, error: leadsError } = await supabase.from('leads').select('*')
      if (leadsError) {
        console.error('Error fetching leads:', leadsError)
        throw leadsError
      }

      // Normalize incoming phone (digits only)
      const normalizedSearch = cleanPhone.replace(/\D/g, '')

      let matchingLead = leads?.find(lead => {
        if (!lead.phone) return false
        const cleanLeadPhone = lead.phone.replace(/\D/g, '')
        // Match full normalized string, or suffixes for safety
        return cleanLeadPhone === normalizedSearch || 
               cleanLeadPhone.endsWith(normalizedSearch) || 
               normalizedSearch.endsWith(cleanLeadPhone)
      })

      if (!matchingLead) {
        // Automatically create a new lead for the incoming WhatsApp contact
        const { data: newLead, error: createError } = await supabase
          .from('leads')
          .insert({
            name: `WhatsApp (${cleanPhone})`,
            phone: cleanPhone,
            source: 'WhatsApp',
            status: 'new'
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating new lead for unknown WhatsApp sender:', createError)
          throw createError
        }
        matchingLead = newLead
      }

      // Save the received WhatsApp message to the database
      const { error: insertError } = await supabase
        .from('whatsapp_messages')
        .insert({
          lead_id: matchingLead.id,
          sender: 'contact',
          content: body.toString(),
          status: 'read'
        })

      if (insertError) {
        console.error('Error saving incoming message to DB:', insertError)
        throw insertError
      }

      // Return an empty XML response as required by Twilio
      return new Response(
        '<Response></Response>',
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          status: 200
        }
      )
    }

    // Outgoing message or custom action (JSON request from frontend)
    const body = await req.json()

    // Handle delete_lead action using service role to bypass RLS
    if (body.action === 'delete_lead') {
      const { leadId } = body
      if (!leadId) {
        throw new Error('Missing leadId for delete_lead action')
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // 1. Delete associated messages
      const { error: msgError } = await supabase
        .from('whatsapp_messages')
        .delete()
        .eq('lead_id', leadId)

      if (msgError) {
        console.error('Error deleting messages in Edge Function:', msgError)
        throw msgError
      }

      // 2. Delete lead
      const { error: leadError } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId)

      if (leadError) {
        console.error('Error deleting lead in Edge Function:', leadError)
        throw leadError
      }

      return new Response(
        JSON.stringify({ success: true }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    const { to, message, contentSid, contentVariables } = body

    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
    const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER') || 'whatsapp:+17752555600'

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured')
    }

    // Format phone number: strip all non-digits, then prefix with + for Twilio WhatsApp format
    const cleanTo = to.replace(/\D/g, '')
    const whatsappTo = `whatsapp:+${cleanTo}`

    const twilioPayload: Record<string, string> = {
      From: TWILIO_WHATSAPP_NUMBER,
      To: whatsappTo,
    }

    if (contentSid) {
      twilioPayload.ContentSid = contentSid
      if (contentVariables) {
        twilioPayload.ContentVariables = typeof contentVariables === 'string'
          ? contentVariables
          : JSON.stringify(contentVariables)
      }
    } else {
      twilioPayload.Body = message
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(twilioPayload).toString(),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Failed to send WhatsApp message')
    }

    return new Response(
      JSON.stringify({ success: true, sid: result.sid }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
