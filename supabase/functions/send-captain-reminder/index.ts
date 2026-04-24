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

  let isAdmin = false
  if (!isServiceRole && authHeader) {
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData } = await userClient.auth.getClaims(token)
    if (claimsData?.claims?.sub) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
      const { data: roleCheck } = await supabaseAdmin.rpc('has_role', {
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
    // Deadline = race_date - 1h. We send reminders up to ~48h before deadline (= ~49h before race).
    // Find races where race_date is between now+1h and now+49h (so deadline is 0-48h away).
    const now = new Date()
    const minRaceDate = new Date(now.getTime() + 60 * 60 * 1000) // deadline = now
    const maxRaceDate = new Date(now.getTime() + 49 * 60 * 60 * 1000) // deadline ~48h away

    const { data: races } = await supabase
      .from('races')
      .select('id, name, race_date')
      .gte('race_date', minRaceDate.toISOString())
      .lte('race_date', maxRaceDate.toISOString())

    if (!races || races.length === 0) {
      return new Response(JSON.stringify({ message: 'No upcoming deadlines' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: managers } = await supabase.from('managers').select('id, email, team_name')
    if (!managers || managers.length === 0) {
      return new Response(JSON.stringify({ message: 'No managers found' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const raceIds = races.map(r => r.id)

    // Existing captain selections
    const { data: existingCaptains } = await supabase
      .from('captain_selections')
      .select('manager_id, race_id')
      .in('race_id', raceIds)
    const captainSet = new Set((existingCaptains || []).map(s => `${s.manager_id}_${s.race_id}`))

    // Prediction questions for these races
    const { data: predQuestions } = await supabase
      .from('prediction_questions')
      .select('id, race_id, question_text')
      .in('race_id', raceIds)

    // Existing prediction answers
    const questionIds = (predQuestions || []).map(q => q.id)
    const { data: existingPreds } = questionIds.length > 0
      ? await supabase.from('prediction_answers').select('manager_id, question_id').in('question_id', questionIds)
      : { data: [] }
    const predSet = new Set((existingPreds || []).map(s => `${s.manager_id}_${s.question_id}`))

    let sentCount = 0
    const siteUrl = 'https://dasuracemanager.lovable.app'

    for (const race of races) {
      const deadline = new Date(new Date(race.race_date!).getTime() - 60 * 60 * 1000)
      const deadlineStr = deadline.toLocaleString('da-DK', {
        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      })

      const raceQuestion = (predQuestions || []).find(q => q.race_id === race.id)

      for (const mgr of managers) {
        const needsCaptain = !captainSet.has(`${mgr.id}_${race.id}`)
        const needsPrediction = raceQuestion && !predSet.has(`${mgr.id}_${raceQuestion.id}`)

        // Only send if something is missing
        if (!needsCaptain && !needsPrediction) continue

        let reminderItems = ''
        if (needsCaptain) {
          reminderItems += '<li>🏆 <strong>Holdkaptajn</strong> — din holdkaptajns point tæller dobbelt!</li>'
        }
        if (needsPrediction && raceQuestion) {
          reminderItems += `<li>🔮 <strong>Prediction</strong> — "${raceQuestion.question_text}" (5 bonuspoint)</li>`
        }

        const html = `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
            <div style="background:#dc2626;padding:20px 24px;">
              <h2 style="margin:0;color:#fff;font-size:20px;">🏎️ Husk inden ${race.name}!</h2>
            </div>
            <div style="padding:20px 24px;">
              <p style="color:#18181b;">Hej ${mgr.team_name},</p>
              <p style="color:#52525b;">Deadline er <strong>${deadlineStr}</strong> (24 timer inden arrangementet starter). Du mangler:</p>
              <ul style="margin:16px 0;padding-left:20px;color:#18181b;">
                ${reminderItems}
              </ul>
              <p style="text-align:center;margin:24px 0 8px;">
                <a href="${siteUrl}/mit-hold" style="background:#dc2626;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
                  Gå til Mit Hold →
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
              subject: `⏰ Deadline ${deadlineStr} — ${race.name}`,
              html,
            }),
          })
          sentCount++
        } catch (e) {
          console.error(`Failed to send to ${mgr.email}:`, e)
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Reminder error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
