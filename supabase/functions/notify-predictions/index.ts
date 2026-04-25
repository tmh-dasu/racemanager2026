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

  // Also allow authenticated admins
  let isAdmin = false
  if (!isServiceRole && authHeader) {
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData } = await anonClient.auth.getClaims(token)
    if (claimsData?.claims?.sub) {
      const { data: roleCheck } = await serviceClient.rpc('has_role', {
        _user_id: claimsData.claims.sub,
        _role: 'admin',
      })
      isAdmin = !!roleCheck
    }
  }

  if (!isServiceRole && !isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { race_id } = await req.json()
    if (!race_id) {
      return new Response(JSON.stringify({ error: 'race_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: race } = await supabase.from('races').select('name, round_number').eq('id', race_id).single()
    if (!race) {
      return new Response(JSON.stringify({ error: 'Race not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get published questions for this race
    const { data: questions } = await supabase
      .from('prediction_questions')
      .select('question_text, prediction_deadline')
      .eq('race_id', race_id)
      .eq('published', true)

    if (!questions || questions.length === 0) {
      return new Response(JSON.stringify({ message: 'No published questions' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: managers } = await supabase.from('managers').select('id, email, team_name')
    if (!managers || managers.length === 0) {
      return new Response(JSON.stringify({ message: 'No managers' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const deadline = questions[0].prediction_deadline
    const deadlineStr = deadline
      ? new Date(deadline).toLocaleString('da-DK', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Copenhagen' })
      : 'Ikke sat'

    const questionList = questions.map((q: any, i: number) =>
      `<li style="margin:6px 0;padding:8px 12px;background:#f4f4f5;border-radius:4px;border-left:3px solid #dc2626;color:#18181b;">
        <strong>Spørgsmål ${i + 1}:</strong> ${q.question_text}
      </li>`
    ).join('')

    const siteUrl = 'https://dasuracemanager.lovable.app'
    let sentCount = 0

    for (const mgr of managers) {
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
          <div style="background:#dc2626;padding:20px 24px;">
            <h2 style="margin:0;color:#fff;font-size:20px;">🔮 Nye predictions: ${race.name}</h2>
          </div>
          <div style="padding:20px 24px;">
            <p style="color:#18181b;">Hej <strong>${mgr.team_name}</strong>,</p>
            <p style="color:#52525b;">Der er ${questions.length} nye prediction-spørgsmål klar til Runde ${race.round_number}. Hvert korrekt svar giver 5 bonuspoint!</p>
            
            <ul style="list-style:none;padding:0;margin:16px 0;">
              ${questionList}
            </ul>

            <p style="font-size:13px;color:#71717a;">⏰ Deadline: <strong style="color:#dc2626;">${deadlineStr}</strong></p>

            <p style="text-align:center;margin:24px 0 8px;">
              <a href="${siteUrl}/mit-hold" style="background:#dc2626;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
                Besvar predictions →
              </a>
            </p>
          </div>
          <div style="padding:12px 24px;text-align:center;font-size:11px;color:#a1a1aa;border-top:1px solid #e4e4e7;">
            DASU RaceManager
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
            from: 'DASU RaceManager <noreply@racemanager.dasu.dk>',
            to: [mgr.email],
            subject: `🔮 Nye predictions til ${race.name} — svar inden ${deadlineStr}`,
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
    console.error('Notify predictions error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
