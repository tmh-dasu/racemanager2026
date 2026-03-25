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

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const now = new Date()
    const target = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const windowStart = new Date(target.getTime() - 30 * 60 * 1000)
    const windowEnd = new Date(target.getTime() + 30 * 60 * 1000)

    const { data: races } = await supabase
      .from('races')
      .select('id, name, captain_deadline')
      .gte('captain_deadline', windowStart.toISOString())
      .lte('captain_deadline', windowEnd.toISOString())

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
      const deadlineStr = new Date(race.captain_deadline!).toLocaleString('da-DK', {
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
          reminderItems += '<li>🏆 <strong>Captain-valg</strong> — din captains point tæller dobbelt!</li>'
        }
        if (needsPrediction && raceQuestion) {
          reminderItems += `<li>🔮 <strong>Prediction</strong> — "${raceQuestion.question_text}" (10 bonuspoint)</li>`
        }

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #e53e3e;">🏎️ Husk inden ${race.name}!</h2>
            <p>Hej ${mgr.team_name},</p>
            <p>Deadline er <strong>${deadlineStr}</strong>. Du mangler:</p>
            <ul style="margin: 16px 0; padding-left: 20px;">
              ${reminderItems}
            </ul>
            <p style="margin: 24px 0;">
              <a href="${siteUrl}/mit-hold" 
                 style="background: linear-gradient(135deg, #e53e3e, #c53030); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Gå til Mit Hold →
              </a>
            </p>
            <p style="font-size: 12px; color: #999;">DASU Race Manager</p>
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
