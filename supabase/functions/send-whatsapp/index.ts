// @ts-nocheck
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
        try {
          return await sendTwilioWhatsApp(cleanPhone, text, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER)
        } catch (err: any) {
          console.error('sendResponse failed:', err)
          if (matchingLead) {
            try {
              await supabase.from('whatsapp_messages').insert({
                lead_id: matchingLead.id,
                sender: 'user',
                content: `⚠️ Twilio Error: ${err.message || String(err)}. (If using Twilio Sandbox, verify if the contact has joined the sandbox by sending the sandbox keyword first)`,
                status: 'read'
              })
            } catch (dbErr) {
              console.error('Failed to log Twilio error to database:', dbErr)
            }
          }
          throw err;
        }
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
        .from('tours')
        .select('*')
        .eq('status', 'active')
        .order('title', { ascending: true })

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
      // STATE 1: Welcome / Re-initiate Menu (Collect Name)
      // -------------------------------------------------------------
      if (!conversation || isResetRequest) {
        // Create or reset conversation record to collect_name
        if (conversation) {
          await supabase
            .from('whatsapp_conversations')
            .update({ stage: 'collect_name', selected_package: null, updated_at: new Date().toISOString() })
            .eq('phone', cleanPhone)
        } else {
          await supabase
            .from('whatsapp_conversations')
            .insert({ phone: cleanPhone, stage: 'collect_name', updated_at: new Date().toISOString() })
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
              status: 'new'
            })
            .select()
            .single()

          if (createError) throw createError
          matchingLead = newLead
        } else if (matchingLead.notes === '[DELETED]') {
          const { data: restoredLead, error: restoreError } = await supabase
            .from('leads')
            .update({ notes: null })
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

        // Prompt for Name and Package
        let welcomeText = "Thank you for contacting Errances Voyages. 🌟\n\nCould you please reply with your *Full Name* and select the *Tour Package Number* you are interested in from the list below:\n\n"
        if (tourPackages && tourPackages.length > 0) {
          const listStr = tourPackages.map((p: any, idx: number) => `${idx + 1}. ${p.title}`).join('\n')
          welcomeText += `*Active Tour Packages:*\n${listStr}\n\nExample reply: John Doe - 2`
        } else {
          welcomeText += "We currently do not have any active packages available. Please reply with your *Full Name* so our travel consultant can contact you."
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
      // STATE 2: Collect Name Stage
      // -------------------------------------------------------------
      if (conversation.stage === 'collect_name') {
        if (!matchingLead) {
          const { data: fallbackLead } = await supabase
            .from('leads')
            .insert({ name: `WhatsApp (${cleanPhone})`, phone: cleanPhone, email: `${normalizedSearch}@whatsapp.crm`, source: 'WhatsApp', status: 'new' })
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

        // If a package was already selected (e.g. they only sent package number first previously)
        if (conversation.selected_package) {
          const userName = rawBody
          const selectedPkg = tourPackages?.find((p: any) => p.title === conversation.selected_package)
          const packagePrice = selectedPkg ? selectedPkg.price : null

          // Update lead details
          await supabase
            .from('leads')
            .update({
              name: userName,
              status: 'qualified',
              selected_package: conversation.selected_package,
              tour_interest: conversation.selected_package,
              budget: packagePrice,
              selection_timestamp: new Date().toISOString()
            })
            .eq('id', matchingLead.id)

          // Mark conversation completed
          await supabase
            .from('whatsapp_conversations')
            .update({
              stage: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('phone', cleanPhone)

          // Send confirmation
          const confirmationText = `Thank you, ${userName}!\n\nWe have received your interest for ${conversation.selected_package}.\n\nOur travel consultant will contact you shortly.`
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

        // Otherwise, parse the reply to extract name and package number
        let parsedName = rawBody
        let selectedIndex = -1

        const numbers = rawBody.match(/\d+/g)
        if (numbers && tourPackages && tourPackages.length > 0) {
          for (const numStr of numbers) {
            const val = parseInt(numStr, 10)
            if (val >= 1 && val <= tourPackages.length) {
              selectedIndex = val - 1
              // Remove the number and common separators from the name
              const numRegex = new RegExp(`\\s*[-–—,\\.]*\\s*${numStr}\\s*|\\s*${numStr}\\s*[-–—,\\.]*\\s*`)
              parsedName = rawBody.replace(numRegex, ' ').replace(/\s+/g, ' ').trim()
              break
            }
          }
        }

        const hasValidPackage = selectedIndex >= 0 && tourPackages && selectedIndex < tourPackages.length
        const GREETINGS = ['hi', 'hii', 'hiii', 'hello', 'hey', 'heyy', 'hola', 'start', 'menu', 'restart']
        const isGreeting = GREETINGS.includes(parsedName.toLowerCase().trim())
        const hasValidName = parsedName.length >= 2 && !isGreeting

        if (hasValidName && hasValidPackage) {
          const selectedPackage = tourPackages[selectedIndex]

          // Update lead details
          await supabase
            .from('leads')
            .update({
              name: parsedName,
              status: 'qualified',
              selected_package: selectedPackage.title,
              tour_interest: selectedPackage.title,
              budget: selectedPackage.price,
              selection_timestamp: new Date().toISOString()
            })
            .eq('id', matchingLead.id)

          // Mark conversation completed
          await supabase
            .from('whatsapp_conversations')
            .update({
              stage: 'completed',
              selected_package: selectedPackage.title,
              updated_at: new Date().toISOString()
            })
            .eq('phone', cleanPhone)

          // Send Confirmation Message
          const confirmationText = `Thank you, ${parsedName}!\n\nWe have received your interest for ${selectedPackage.title}.\n\nOur travel consultant will contact you shortly.`
          await sendResponse(confirmationText)

          // Save bot confirmation message to CRM logs
          await supabase.from('whatsapp_messages').insert({
            lead_id: matchingLead.id,
            sender: 'user',
            content: confirmationText,
            status: 'read'
          })
        } else if (hasValidName) {
          // Update lead's name with their reply
          await supabase
            .from('leads')
            .update({ name: parsedName })
            .eq('id', matchingLead.id)

          // Move conversation tracking to package_selection stage
          await supabase
            .from('whatsapp_conversations')
            .update({
              stage: 'package_selection',
              updated_at: new Date().toISOString()
            })
            .eq('phone', cleanPhone)

          // Format and send Package Selection menu
          let selectMenuText = ''
          if (tourPackages && tourPackages.length > 0) {
            const listStr = tourPackages.map((p: any, idx: number) => `${idx + 1}. ${p.title}`).join('\n')
            const greetingName = (parsedName && !parsedName.startsWith('WhatsApp (')) ? `, ${parsedName}` : ''
            selectMenuText = `Thank you${greetingName}!\n\nPlease select one of our tour packages:\n\n${listStr}\n\nReply with the package number.`
          } else {
            const greetingName = (parsedName && !parsedName.startsWith('WhatsApp (')) ? `, ${parsedName}` : ''
            selectMenuText = `Thank you${greetingName}!\n\nWe currently do not have any active packages available. A travel consultant will contact you shortly.`
          }

          await sendResponse(selectMenuText)

          // Save bot welcome message to CRM logs
          await supabase.from('whatsapp_messages').insert({
            lead_id: matchingLead.id,
            sender: 'user',
            content: selectMenuText,
            status: 'read'
          })
        } else if (hasValidPackage) {
          const selectedPackage = tourPackages[selectedIndex]

          // Save selected package in conversation stage
          await supabase
            .from('whatsapp_conversations')
            .update({
              selected_package: selectedPackage.title,
              updated_at: new Date().toISOString()
            })
            .eq('phone', cleanPhone)

          const promptNameText = `Thank you!\n\nPlease reply with your *Full Name* to complete your request for ${selectedPackage.title}.`
          await sendResponse(promptNameText)

          // Save bot welcome message to CRM logs
          await supabase.from('whatsapp_messages').insert({
            lead_id: matchingLead.id,
            sender: 'user',
            content: promptNameText,
            status: 'read'
          })
        } else {
          // Prompt for name and package again
          let errorPrompt = "We couldn't quite understand your message.\n\nPlease reply with your *Full Name* and the *Tour Package Number* you are interested in:\n\n"
          if (tourPackages && tourPackages.length > 0) {
            const listStr = tourPackages.map((p: any, idx: number) => `${idx + 1}. ${p.title}`).join('\n')
            errorPrompt += `*Active Tour Packages:*\n${listStr}\n\nExample reply: John Doe - 2`
          } else {
            errorPrompt += "Please reply with your *Full Name* so our travel consultant can contact you."
          }

          await sendResponse(errorPrompt)

          await supabase.from('whatsapp_messages').insert({
            lead_id: matchingLead.id,
            sender: 'user',
            content: errorPrompt,
            status: 'read'
          })
        }

        return new Response('<Response></Response>', {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          status: 200
        })
      }

      // -------------------------------------------------------------
      // STATE 3: Package Selection stage
      // -------------------------------------------------------------
      if (conversation.stage === 'package_selection') {
        if (!matchingLead) {
          const { data: fallbackLead } = await supabase
            .from('leads')
            .insert({ name: `WhatsApp (${cleanPhone})`, phone: cleanPhone, email: `${normalizedSearch}@whatsapp.crm`, source: 'WhatsApp', status: 'new' })
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
          const listStr = tourPackages?.map((p: any, idx: number) => `${idx + 1}. ${p.title}`).join('\n') || ''
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
            status: 'qualified',
            selected_package: selectedPackage.title,
            tour_interest: selectedPackage.title,
            budget: selectedPackage.price,
            selection_timestamp: new Date().toISOString()
          })
          .eq('id', matchingLead.id)

        // Mark conversation tracking stage as completed
        await supabase
          .from('whatsapp_conversations')
          .update({
            stage: 'completed',
            selected_package: selectedPackage.title,
            updated_at: new Date().toISOString()
          })
          .eq('phone', cleanPhone)

        // Send Confirmation Message
        const confirmationText = `Thank you for choosing ${selectedPackage.title}.\n\nOur travel consultant will contact you shortly.`
        
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

    if (body.action === 'check_birthdays') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
      const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
      const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER') || 'whatsapp:+17752555600'

      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
        throw new Error('Twilio credentials not configured')
      }

      // Fetch all active/non-deleted leads
      const { data: leads, error: leadsError } = await supabase.from('leads').select('*')
      if (leadsError) {
        throw leadsError
      }

      // Get current date/month in India/Kolkata timezone (UTC+5:30)
      const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
      const currentMonth = today.getMonth() + 1
      const currentDate = today.getDate()

      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      const todayISOOnlyDate = `${yyyy}-${mm}-${dd}` // "YYYY-MM-DD"
      const todayStartISO = `${yyyy}-${mm}-${dd}T00:00:00+05:30`

      const results = []

      for (const lead of leads) {
        if (!lead.notes || !lead.phone || lead.notes === '[DELETED]') continue

        let dobStr = ''
        let departureStr = ''
        let arrivalStr = ''
        try {
          const parsed = JSON.parse(lead.notes)
          if (parsed) {
            if (parsed.dob) dobStr = parsed.dob // YYYY-MM-DD
            if (parsed.tour_departure) departureStr = parsed.tour_departure // YYYY-MM-DD
            if (parsed.tour_arrival) arrivalStr = parsed.tour_arrival // YYYY-MM-DD
          }
        } catch (_) {
          continue
        }

        // Helper to lazy load existing messages sent today to avoid redundant DB queries
        let existingMessages: any[] | null = null
        const getExistingMessages = async () => {
          if (existingMessages !== null) return existingMessages
          const { data, error } = await supabase
            .from('whatsapp_messages')
            .select('*')
            .eq('lead_id', lead.id)
            .eq('sender', 'user')
            .gte('created_at', todayStartISO)
          
          if (error) {
            console.error(`[Travel Job] Error checking existing messages for ${lead.name}:`, error.message)
            existingMessages = []
          } else {
            existingMessages = data || []
          }
          return existingMessages
        }

        // 1. Check Birthday
        if (dobStr) {
          const dobParts = dobStr.split('-')
          if (dobParts.length === 3) {
            const dobMonth = parseInt(dobParts[1], 10)
            const dobDate = parseInt(dobParts[2], 10)

            if (dobMonth === currentMonth && dobDate === currentDate) {
              const msgs = await getExistingMessages()
              const alreadySent = msgs.some((m: any) => m.content.includes('Happy Birthday'))

              if (!alreadySent) {
                const wishMessage = `Happy Birthday ${lead.name}! 🎂🎉 The team at Errances Voyages wishes you a wonderful day and many beautiful travels ahead! ✈️`
                try {
                  console.log(`[Birthday Job] Sending birthday wish via Twilio to ${lead.name}...`)
                  const sid = await sendTwilioWhatsApp(lead.phone, wishMessage, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER)
                  await supabase.from('whatsapp_messages').insert({
                    lead_id: lead.id,
                    sender: 'user',
                    content: wishMessage,
                    status: 'sent'
                  })
                  results.push({ lead: lead.name, type: 'birthday', status: 'success', sid })
                } catch (sendErr: any) {
                  console.error(`[Birthday Job] Failed to send wish to ${lead.name}:`, sendErr)
                  results.push({ lead: lead.name, type: 'birthday', status: 'error', error: sendErr.message || String(sendErr) })
                }
              } else {
                results.push({ lead: lead.name, type: 'birthday', status: 'already_sent' })
              }
            }
          }
        }

        // 2. Check Departure Date
        if (departureStr && departureStr === todayISOOnlyDate) {
          const msgs = await getExistingMessages()
          const alreadySent = msgs.some((m: any) => 
            m.content.includes('wonderful journey') || 
            m.content.includes('safe flight')
          )

          if (!alreadySent) {
            const departureMessage = `Wishing you a wonderful journey, ${lead.name}! ✈️ The team at Errances Voyages hopes you have a safe flight and an amazing trip starting today! 🌍`
            try {
              console.log(`[Departure Job] Sending departure wish via Twilio to ${lead.name}...`)
              const sid = await sendTwilioWhatsApp(lead.phone, departureMessage, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER)
              await supabase.from('whatsapp_messages').insert({
                lead_id: lead.id,
                sender: 'user',
                content: departureMessage,
                status: 'sent'
              })
              results.push({ lead: lead.name, type: 'departure', status: 'success', sid })
            } catch (sendErr: any) {
              console.error(`[Departure Job] Failed to send departure message to ${lead.name}:`, sendErr)
              results.push({ lead: lead.name, type: 'departure', status: 'error', error: sendErr.message || String(sendErr) })
            }
          } else {
            results.push({ lead: lead.name, type: 'departure', status: 'already_sent' })
          }
        }

        // 3. Check Arrival Date
        if (arrivalStr && arrivalStr === todayISOOnlyDate) {
          const msgs = await getExistingMessages()
          const alreadySent = msgs.some((m: any) => 
            m.content.includes('Welcome home') || 
            m.content.includes('fantastic travel')
          )

          if (!alreadySent) {
            const arrivalMessage = `Welcome home, ${lead.name}! 🏡 We hope you had a fantastic travel experience with Errances Voyages. We would love to hear your feedback and see your beautiful pictures! 📸`
            try {
              console.log(`[Arrival Job] Sending arrival welcome back via Twilio to ${lead.name}...`)
              const sid = await sendTwilioWhatsApp(lead.phone, arrivalMessage, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER)
              await supabase.from('whatsapp_messages').insert({
                lead_id: lead.id,
                sender: 'user',
                content: arrivalMessage,
                status: 'sent'
              })
              results.push({ lead: lead.name, type: 'arrival', status: 'success', sid })
            } catch (sendErr: any) {
              console.error(`[Arrival Job] Failed to send arrival message to ${lead.name}:`, sendErr)
              results.push({ lead: lead.name, type: 'arrival', status: 'error', error: sendErr.message || String(sendErr) })
            }
          } else {
            results.push({ lead: lead.name, type: 'arrival', status: 'already_sent' })
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Handle delete_lead action using service role to bypass RLS
    if (body.action === 'debug_db') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const { data: leads } = await supabase.from('leads').select('*')
      const { data: messages } = await supabase.from('whatsapp_messages').select('*')
      const { data: conversations } = await supabase.from('whatsapp_conversations').select('*')

      // TEST: Try inserting a test conversation with 'collect_name' stage to verify constraints
      const testPhone = '+99999999999'
      const insertResult = await supabase
        .from('whatsapp_conversations')
        .insert({ phone: testPhone, stage: 'collect_name', updated_at: new Date().toISOString() })
        .select()
      
      let testInsertError = null
      if (insertResult.error) {
        testInsertError = insertResult.error.message || String(insertResult.error)
      } else {
        // Clean up test insert if it succeeded
        await supabase.from('whatsapp_conversations').delete().eq('phone', testPhone)
      }

      return new Response(
        JSON.stringify({ 
          leads, 
          messages, 
          conversations,
          test_insert_success: !insertResult.error, 
          test_insert_error: testInsertError,
          twilio_account_sid_defined: !!Deno.env.get('TWILIO_ACCOUNT_SID'),
          twilio_auth_token_defined: !!Deno.env.get('TWILIO_AUTH_TOKEN'),
          twilio_whatsapp_number: Deno.env.get('TWILIO_WHATSAPP_NUMBER') || 'whatsapp:+17752555600'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (body.action === 'reset_phone') {
      const { phone } = body
      if (!phone) {
        throw new Error('Missing phone for reset_phone action')
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Delete conversation state
      await supabase.from('whatsapp_conversations').delete().eq('phone', phone)
      
      // Fetch and delete matching leads
      const { data: leads } = await supabase.from('leads').select('*')
      const targetLeads = leads?.filter((l: any) => {
        if (!l.phone) return false
        const cleanLPhone = l.phone.replace(/\D/g, '')
        const cleanTarget = phone.replace(/\D/g, '')
        return cleanLPhone === cleanTarget || cleanLPhone.endsWith(cleanTarget) || cleanTarget.endsWith(cleanLPhone)
      })

      if (targetLeads && targetLeads.length > 0) {
        const leadIds = targetLeads.map((l: any) => l.id)
        // Delete messages
        await supabase.from('whatsapp_messages').delete().in('lead_id', leadIds)
        // Delete leads
        await supabase.from('leads').delete().in('id', leadIds)
      }

      return new Response(
        JSON.stringify({ success: true }),
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

      // Fetch lead to get the phone number for conversation cleanup
      const { data: lead } = await supabase
        .from('leads')
        .select('phone')
        .eq('id', leadId)
        .maybeSingle()

      if (lead && lead.phone) {
        const cleanPhone = lead.phone.replace('whatsapp:', '').trim()
        // Delete conversation tracking state
        await supabase
          .from('whatsapp_conversations')
          .delete()
          .eq('phone', cleanPhone)
      }

      // Hard delete the lead (cascades to whatsapp_messages table)
      const { error: leadError } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId)

      if (leadError) {
        console.error('Error hard deleting lead in Edge Function:', leadError)
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
