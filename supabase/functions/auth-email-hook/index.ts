const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'DASU RaceManager'
const SITE_URL = 'https://racemanager.dasu.dk'

function extractEmail(payload: Record<string, any>): string | undefined {
  return payload.email
    || payload.user?.email
    || payload.email_data?.email
    || payload.record?.email
    || undefined
}

function extractType(payload: Record<string, any>): string {
  return payload.type
    || payload.email_data?.email_action_type
    || payload.email_action_type
    || ''
}

function extractConfirmUrl(payload: Record<string, any>): string {
  return payload.confirmation_url
    || payload.email_data?.confirmation_url
    || payload.action_link
    || payload.email_data?.action_link
    || ''
}

function buildEmailContent(type: string, confirmUrl: string): { subject: string; html: string } {
  const buttonStyle = `
    display: inline-block;
    background-color: #dc2626;
    color: #ffffff;
    padding: 12px 32px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    font-size: 16px;
  `.trim()

  const wrapHtml = (title: string, body: string) => `
<!DOCTYPE html>
<html lang="da">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td>
          <h1 style="color:#18181b;font-size:22px;margin:0 0 8px;">${SITE_NAME}</h1>
          <h2 style="color:#18181b;font-size:18px;margin:0 0 24px;">${title}</h2>
          ${body}
          <p style="color:#a1a1aa;font-size:12px;margin:32px 0 0;border-top:1px solid #e4e4e7;padding-top:16px;">
            ${SITE_NAME} &mdash; <a href="${SITE_URL}" style="color:#dc2626;">${SITE_URL}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  switch (type) {
    case 'recovery':
    case 'reset':
      return {
        subject: `Nulstil din adgangskode — ${SITE_NAME}`,
        html: wrapHtml('Nulstil din adgangskode', `
          <p style="color:#3f3f46;font-size:14px;line-height:1.6;">
            Du har anmodet om at nulstille din adgangskode. Klik på knappen herunder for at vælge en ny adgangskode.
          </p>
          <p style="text-align:center;margin:28px 0;">
            <a href="${confirmUrl}" style="${buttonStyle}">Nulstil adgangskode</a>
          </p>
          <p style="color:#71717a;font-size:12px;">Hvis du ikke har bedt om dette, kan du ignorere denne e-mail.</p>
        `),
      }

    case 'signup':
    case 'confirmation':
      return {
        subject: `Bekræft din e-mail — ${SITE_NAME}`,
        html: wrapHtml('Bekræft din e-mail', `
          <p style="color:#3f3f46;font-size:14px;line-height:1.6;">
            Tak for din tilmelding! Klik på knappen for at bekræfte din e-mailadresse.
          </p>
          <p style="text-align:center;margin:28px 0;">
            <a href="${confirmUrl}" style="${buttonStyle}">Bekræft e-mail</a>
          </p>
        `),
      }

    case 'invite':
      return {
        subject: `Du er inviteret til ${SITE_NAME}`,
        html: wrapHtml('Du er inviteret', `
          <p style="color:#3f3f46;font-size:14px;line-height:1.6;">
            Du er blevet inviteret til ${SITE_NAME}. Klik på knappen for at acceptere invitationen.
          </p>
          <p style="text-align:center;margin:28px 0;">
            <a href="${confirmUrl}" style="${buttonStyle}">Accepter invitation</a>
          </p>
        `),
      }

    case 'magiclink':
      return {
        subject: `Dit login-link — ${SITE_NAME}`,
        html: wrapHtml('Login-link', `
          <p style="color:#3f3f46;font-size:14px;line-height:1.6;">
            Klik på knappen herunder for at logge ind.
          </p>
          <p style="text-align:center;margin:28px 0;">
            <a href="${confirmUrl}" style="${buttonStyle}">Log ind</a>
          </p>
          <p style="color:#71717a;font-size:12px;">Linket udløber om 1 time.</p>
        `),
      }

    case 'email_change':
    case 'email_change_new':
      return {
        subject: `Bekræft ny e-mailadresse — ${SITE_NAME}`,
        html: wrapHtml('Bekræft e-mailændring', `
          <p style="color:#3f3f46;font-size:14px;line-height:1.6;">
            Klik på knappen for at bekræfte din nye e-mailadresse.
          </p>
          <p style="text-align:center;margin:28px 0;">
            <a href="${confirmUrl}" style="${buttonStyle}">Bekræft ændring</a>
          </p>
        `),
      }

    case 'reauthentication':
      return {
        subject: `Bekræft din identitet — ${SITE_NAME}`,
        html: wrapHtml('Bekræft din identitet', `
          <p style="color:#3f3f46;font-size:14px;line-height:1.6;">
            Du har anmodet om at bekræfte din identitet. Klik på knappen for at fortsætte.
          </p>
          <p style="text-align:center;margin:28px 0;">
            <a href="${confirmUrl}" style="${buttonStyle}">Bekræft identitet</a>
          </p>
        `),
      }

    default:
      return {
        subject: `Besked fra ${SITE_NAME}`,
        html: wrapHtml('Besked', `
          <p style="color:#3f3f46;font-size:14px;line-height:1.6;">
            ${confirmUrl ? `<a href="${confirmUrl}" style="${buttonStyle}">Klik her</a>` : 'Du har modtaget en besked.'}
          </p>
        `),
      }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Restrict to service-role callers (Supabase auth hook) to prevent abuse
  const authHeader = req.headers.get('Authorization') || ''
  const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const presented = authHeader.replace(/^Bearer\s+/i, '').trim()
  const allowed = (hookSecret && presented === hookSecret) || (serviceRoleKey && presented === serviceRoleKey)
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const payload = await req.json()
    const email = extractEmail(payload)
    const type = extractType(payload)
    const confirmUrl = extractConfirmUrl(payload)

    console.log('Auth email hook received:', JSON.stringify({ type, email: email || 'MISSING', hasConfirmUrl: !!confirmUrl }))

    if (!email) {
      console.error('No email found in payload')
      return new Response(JSON.stringify({ error: 'No recipient email found in payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { subject, html } = buildEmailContent(type, confirmUrl)

    console.log(`Sending auth email via Resend: type=${type}, to=${email}, subject=${subject}`)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${SITE_NAME} <noreply@racemanager.dasu.dk>`,
        to: [email],
        subject,
        html,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Resend API error for auth email:', JSON.stringify(data))
      return new Response(JSON.stringify({ error: 'Failed to send', details: data }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Auth email sent successfully:', data.id)
    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Auth email hook error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})