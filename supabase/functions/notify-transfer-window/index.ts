import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendApiKey = Deno.env.get('RESEND_API_KEY')

  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  const apiKeyHeader = req.headers.get('apikey')
  const isServiceRole =
    apiKeyHeader === supabaseServiceKey ||
    (authHeader && authHeader.replace('Bearer ', '') === supabaseServiceKey)
  if (!isServiceRole) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { action } = await req.json() // 'opened' or 'closing'
    if (!action || !['opened', 'closing'].includes(action)) {
      return new Response(JSON.stringify({ error: 'action must be "opened" or "closing"' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: managers } = await supabase.from('managers').select('id, email, team_name')
    if (!managers || managers.length === 0) {
      return new Response(JSON.stringify({ message: 'No managers' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get transfer cost setting
    const { data: settingsRows } = await supabase.from('settings').select('key, value').eq('key', 'transfer_cost')
    const transferCost = settingsRows?.[0]?.value || '10'

    const siteUrl = 'https://dasuracemanager.lovable.app'
    let sentCount = 0

    const isOpened = action === 'opened'
    const subject = isOpened
      ? '🔄 Transfervinduet er nu åbent!'
      : '⏰ Transfervinduet lukker snart!'

    for (const mgr of managers) {
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:8px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#c41e1e,#e53e3e);padding:20px 24px;">
            <h2 style="margin:0;color:#fff;font-size:20px;">${isOpened ? '🔄 Transfervinduet er åbent' : '⏰ Transfervinduet lukker snart'}</h2>
          </div>
          <div style="padding:20px 24px;">
            <p>Hej <strong>${mgr.team_name}</strong>,</p>
            ${isOpened
              ? `<p>Transfervinduet er nu åbent! Du kan skifte kørere ud inden for samme tier.</p>
                 <p style="font-size:13px;color:#94a3b8;">Husk: Hvert transfer koster <strong style="color:#e53e3e;">${transferCost} point</strong> fra din samlede pointtotal.</p>`
              : `<p>Transfervinduet lukker inden for kort tid. Hvis du overvejer et kørerskifte, er det nu du skal handle!</p>
                 <p style="font-size:13px;color:#94a3b8;">Hvert transfer koster <strong style="color:#e53e3e;">${transferCost} point</strong>.</p>`
            }
            <p style="text-align:center;margin:24px 0 8px;">
              <a href="${siteUrl}/mit-hold" style="background:linear-gradient(135deg,#c41e1e,#e53e3e);color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
                Gå til Mit Hold →
              </a>
            </p>
          </div>
          <div style="padding:12px 24px;text-align:center;font-size:11px;color:#64748b;">
            DASU Race Manager
          </div>
        </div>
      `

      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'DASU Race Manager <noreply@racemanager.dasu.dk>',
            to: [mgr.email],
            subject,
            html,
          }),
        })
        sentCount++
      } catch (e) {
        console.error(`Failed to send to ${mgr.email}:`, e)
      }
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Notify transfer window error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
