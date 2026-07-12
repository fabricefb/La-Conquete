import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import twilio from 'https://esm.sh/twilio@4.23.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ─── Auth check: verify the caller is a logged-in user ───
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ─── Parse request body ───
    const { to, message, channel = 'sms' } = await req.json()

    if (!to || !message) {
      return new Response(JSON.stringify({ error: 'Destinataire et message requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ─── Read secrets from environment (set in Supabase Dashboard) ───
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
    const WHATSAPP_PHONE_NUMBER = Deno.env.get('WHATSAPP_BUSINESS_PHONE_NUMBER')

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return new Response(JSON.stringify({
        error: 'Twilio non configuré. Contactez l\'administrateur.',
        hint: 'Les secrets TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN et TWILIO_PHONE_NUMBER doivent être définis dans Supabase Dashboard → Settings → Edge Functions → Secrets.',
      }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ─── Initialize Twilio client ───
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

    // ─── Send based on channel ───
    let result
    const from = channel === 'whatsapp'
      ? `whatsapp:${WHATSAPP_PHONE_NUMBER || TWILIO_PHONE_NUMBER}`
      : TWILIO_PHONE_NUMBER

    const toFormatted = channel === 'whatsapp' ? `whatsapp:${to}` : to

    if (channel === 'whatsapp') {
      result = await client.messages.create({
        body: message,
        from,
        to: toFormatted,
      })
    } else {
      result = await client.messages.create({
        body: message,
        from,
        to: toFormatted,
      })
    }

    return new Response(JSON.stringify({
      success: true,
      messageSid: result.sid,
      status: result.status,
      channel,
      to,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[send-sms] Error:', err)
    return new Response(JSON.stringify({
      error: err.message || 'Erreur lors de l\'envoi',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})