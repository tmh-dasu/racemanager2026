import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SITE_NAME = 'DASU RaceManager'
const DEFAULT_REDIRECT_URL = 'https://racemanager.dasu.dk/reset-password'
const ALLOWED_REDIRECT_HOSTS = new Set([
  'racemanager.dasu.dk',
  'dasuracemanager.lovable.app',
  'id-preview--3b0612ae-55c8-4ec0-a3ce-79c42d8d93c0.lovable.app',
])

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function sanitizeRedirectUrl(input?: string) {
  if (!input) return DEFAULT_REDIRECT_URL

  try {
    const url = new URL(input)
    if (url.pathname !== '/reset-password') return DEFAULT_REDIRECT_URL
    if (!ALLOWED_REDIRECT_HOSTS.has(url.hostname)) return DEFAULT_REDIRECT_URL
    return url.toString()
  } catch {
    return DEFAULT_REDIRECT_URL
  }
}

function buildRecoveryEmail(actionLink: string) {
  return {
    subject: `Nulstil din adgangskode — ${SITE_NAME}`,
    html: `
<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <tr>
            <td>
              <h1 style="color:#18181b;font-size:22px;margin:0 0 8px;">${SITE_NAME}</h1>
              <h2 style="color:#18181b;font-size:18px;margin:0 0 24px;">Nulstil din adgangskode</h2>
              <p style="color:#3f3f46;font-size:14px;line-height:1.6;margin:0 0 20px;">
                Du har anmodet om at nulstille din adgangskode. Klik på knappen herunder for at vælge en ny adgangskode.
              </p>
              <p style="text-align:center;margin:28px 0;">
                <a href="${actionLink}" style="display:inline-block;background-color:#dc2626;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
                  Nulstil adgangskode
                </a>
              </p>
              <p style="color:#71717a;font-size:12px;line-height:1.6;margin:24px 0 0;">
                Hvis du ikke har bedt om dette, kan du ignorere denne e-mail.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim(),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { email, redirectTo } = await req.json()

    if (typeof email !== 'string' || !isValidEmail(email.trim())) {
      return new Response(JSON.stringify({ error: 'Ugyldig email-adresse' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const safeRedirectUrl = sanitizeRedirectUrl(typeof redirectTo === 'string' ? redirectTo : undefined)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
      return new Response(JSON.stringify({ error: 'Manglende server-konfiguration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: {
        redirectTo: safeRedirectUrl,
      },
    })

    if (error || !data?.properties?.action_link) {
      console.error('Password reset generateLink failed:', error?.message ?? 'missing action_link')
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { subject, html } = buildRecoveryEmail(data.properties.action_link)

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${SITE_NAME} <noreply@racemanager.dasu.dk>`,
        to: normalizedEmail,
        subject,
        html,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Password reset Resend error:', JSON.stringify(resendData))
      return new Response(JSON.stringify({ error: 'Kunne ikke sende email' }), {
        status: resendResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Password reset email sent via Resend:', JSON.stringify({ email: normalizedEmail, id: resendData.id }))

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Password reset function error:', error)
    return new Response(JSON.stringify({ error: 'Intern serverfejl' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})