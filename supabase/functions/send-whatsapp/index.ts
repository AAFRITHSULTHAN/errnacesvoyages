import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendTwilioWhatsApp(
  to: string,
  body: string,
  accountSid: string,
  authToken: string,
  fromNumber: string
) {
  const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
  const formattedFrom = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`
  
  const twilioPayload = new URLSearchParams({
    To: formattedTo,
    From: formattedFrom,
    Body: body
  })

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: twilioPayload.toString(),
    }
  )

  if (!res.ok) {
    const errData = await res.json()
    console.error('Failed to send WhatsApp message via Twilio:', errData)
    throw new Error(errData.message || 'Twilio send error')
  }

  const data = await res.json()
  return data.sid
}

serve(async (req: Request) => {
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
      const rawBody = body.toString().trim()
      // Clean phone number: remove 'whatsapp:' prefix
      const cleanPhone = rawFrom.replace('whatsapp:', '').trim() // e.g. "+15551234567"

      // Initialize Supabase Client with service role key to bypass RLS policies
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || ''
      const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || ''
      const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER') || 'whatsapp:+17752555600'

      const sendResponse = async (text: string) => {
        return await sendTwilioWhatsApp(cleanPhone, text, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER)
      }

      // Fetch all leads to do normalized phone matching
      const { data: leads, error: leadsError } = await supabase.from('leads').select('*')
      if (leadsError) {
        console.error('Error fetching leads:', leadsError)
        throw leadsError
      }

      // Normalize incoming phone (digits only)
      const normalizedSearch = cleanPhone.replace(/\D/g, '')

      let matchingLead = leads?.find((lead: any) => {
        if (!lead.phone) return false
        const cleanLeadPhone = lead.phone.replace(/\D/g, '')
        return cleanLeadPhone === normalizedSearch || 
               cleanLeadPhone.endsWith(normalizedSearch) || 
               normalizedSearch.endsWith(cleanLeadPhone)
      })

      // Fetch active tour packages
      const { data: tourPackages, error: pkgError } = await supabase
        .from('tour_packages')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true })

      if (pkgError) {
        console.error('Error fetching tour packages:', pkgError)
      }

      // Fetch conversation state
      const { data: conversation, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle()

      if (convError) {
        console.error('Error fetching conversation state:', convError)
      }

      const isResetRequest = ['menu', 'restart', 'start'].includes(rawBody.toLowerCase())

      // -------------------------------------------------------------
      // STATE 1: Welcome / Re-initiate Menu
      // -------------------------------------------------------------
      if (!conversation || isResetRequest) {
        // Create or reset conversation record
        if (conversation) {
          await supabase
            .from('whatsapp_conversations')
            .update({ stage: 'package_selection', selected_package: null, updated_at: new Date().toISOString() })
            .eq('phone', cleanPhone)
        } else {
          await supabase
            .from('whatsapp_conversations')
            .insert({ phone: cleanPhone, stage: 'package_selection', updated_at: new Date().toISOString() })
        }

        // Create or restore lead record
        if (!matchingLead) {
          let { data: newLead, error: createError } = await supabase
            .from('leads')
            .insert({
              name: `WhatsApp (${cleanPhone})`,
              phone: cleanPhone,
              email: `${normalizedSearch}@whatsapp.crm`,
              source: 'WhatsApp',
              status: 'New Lead',
              is_deleted: false
            })
            .select()
            .single()

          if (createError && (createError.message?.includes('is_deleted') || createError.code === 'PGRST100')) {
            const fallbackResult = await supabase
              .from('leads')
              .insert({
                name: `WhatsApp (${cleanPhone})`,
                phone: cleanPhone,
                email: `${normalizedSearch}@whatsapp.crm`,
                source: 'WhatsApp',
                status: 'New Lead'
              })
              .select()
              .single()
            newLead = fallbackResult.data
            createError = fallbackResult.error
          }

          if (createError) throw createError
          matchingLead = newLead
        } else if (matchingLead.is_deleted) {
          const { data: restoredLead, error: restoreError } = await supabase
            .from('leads')
            .update({ is_deleted: false })
            .eq('id', matchingLead.id)
            .select()
            .single()
          if (!restoreError && restoredLead) {
            matchingLead = restoredLead
          }
        }

        // Save incoming user message to CRM logs
        await supabase.from('whatsapp_messages').insert({
          lead_id: matchingLead.id,
          sender: 'contact',
          content: rawBody,
          status: 'read'
        })

        // Send Welcome Message with Tour Menu options
        let welcomeText = ''
        if (tourPackages && tourPackages.length > 0) {
          const listStr = tourPackages.map((p: any, idx: number) => `${idx + 1}. ${p.name}`).join('\n')
          welcomeText = `Thank you for contacting us.\n\nPlease select one of our tour packages:\n\n${listStr}\n\nReply with the package number.`
        } else {
          welcomeText = "Thank you for contacting us. We currently do not have any active packages available. A travel consultant will contact you shortly."
        }

        await sendResponse(welcomeText)

        // Save bot welcome message to CRM logs
        await supabase.from('whatsapp_messages').insert({
          lead_id: matchingLead.id,
          sender: 'user',
          content: welcomeText,
          status: 'read'
        })

        return new Response('<Response></Response>', {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          status: 200
        })
      }

      // -------------------------------------------------------------
      // STATE 2: Package Selection stage
      // -------------------------------------------------------------
      if (conversation.stage === 'package_selection') {
        if (!matchingLead) {
          const { data: fallbackLead } = await supabase
            .from('leads')
            .insert({ name: `WhatsApp (${cleanPhone})`, phone: cleanPhone, email: `${normalizedSearch}@whatsapp.crm`, source: 'WhatsApp', status: 'New Lead' })
            .select().single()
          matchingLead = fallbackLead
        }

        // Save incoming user message to CRM logs
        await supabase.from('whatsapp_messages').insert({
          lead_id: matchingLead.id,
          sender: 'contact',
          content: rawBody,
          status: 'read'
        })

        const selectedIndex = parseInt(rawBody, 10) - 1
        if (isNaN(selectedIndex) || !tourPackages || selectedIndex < 0 || selectedIndex >= tourPackages.length) {
          const listStr = tourPackages?.map((p: any, idx: number) => `${idx + 1}. ${p.name}`).join('\n') || ''
          const invalidText = `Invalid selection. Please choose a valid tour package number:\n\n${listStr}\n\nReply with the package number.`

          await sendResponse(invalidText)

          await supabase.from('whatsapp_messages').insert({
            lead_id: matchingLead.id,
            sender: 'user',
            content: invalidText,
            status: 'read'
          })

          return new Response('<Response></Response>', {
            headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
            status: 200
          })
        }

        const selectedPackage = tourPackages[selectedIndex]

        // Update lead selection details
        await supabase
          .from('leads')
          .update({
            status: 'Interested',
            selected_package: selectedPackage.name,
            selection_timestamp: new Date().toISOString()
          })
          .eq('id', matchingLead.id)

        // Mark conversation tracking stage as completed
        await supabase
          .from('whatsapp_conversations')
          .update({
            stage: 'completed',
            selected_package: selectedPackage.name,
            updated_at: new Date().toISOString()
          })
          .eq('phone', cleanPhone)

        // Send Confirmation Message
        const confirmationText = `Thank you for choosing ${selectedPackage.name}.\n\nOur travel consultant will contact you shortly.`
        
        await sendResponse(confirmationText)

        // Save bot confirmation message to CRM logs
        await supabase.from('whatsapp_messages').insert({
          lead_id: matchingLead.id,
          sender: 'user',
          content: confirmationText,
          status: 'read'
        })

        return new Response('<Response></Response>', {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          status: 200
        })
      }

      // -------------------------------------------------------------
      // STATE 3: Completed stage (Human takeover mode)
      // -------------------------------------------------------------
      if (conversation.stage === 'completed') {
        if (matchingLead) {
          await supabase.from('whatsapp_messages').insert({
            lead_id: matchingLead.id,
            sender: 'contact',
            content: rawBody,
            status: 'read'
          })
        }

        return new Response('<Response></Response>', {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          status: 200
        })
      }
    }

    // Outgoing message or custom action (JSON request from frontend)
    const body = await req.json()

    // Handle delete_lead action using service role to bypass RLS
    if (body.action === 'debug_db') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const { data: leads } = await supabase.from('leads').select('*')
      const { data: messages } = await supabase.from('whatsapp_messages').select('*')

      return new Response(
        JSON.stringify({ leads, messages }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (body.action === 'delete_lead') {
      const { leadId } = body
      if (!leadId) {
        throw new Error('Missing leadId for delete_lead action')
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Soft delete the lead by setting is_deleted = true
      // This preserves associated messages due to the leads row staying intact
      const { error: leadError } = await supabase
        .from('leads')
        .update({ is_deleted: true })
        .eq('id', leadId)

      if (leadError) {
        console.error('Error soft deleting lead in Edge Function:', leadError)
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
    const err = error as any
    return new Response(
      JSON.stringify({ error: err.message || String(err) }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
