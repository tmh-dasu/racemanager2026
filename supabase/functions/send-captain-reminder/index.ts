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

  // Verify service_role caller
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
    // Find races with captain_deadline ~24 hours from now (within a 1-hour window)
    const now = new Date()
    const target = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const windowStart = new Date(target.getTime() - 30 * 60 * 1000) // -30 min
    const windowEnd = new Date(target.getTime() + 30 * 60 * 1000)   // +30 min

    const { data: races } = await supabase
      .from('races')
      .select('id, name, captain_deadline')
      .gte('captain_deadline', windowStart.toISOString())
      .lte('captain_deadline', windowEnd.toISOString())

    if (!races || races.length === 0) {
      return new Response(JSON.stringify({ message: 'No upcoming captain deadlines' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get all managers with their emails
    const { data: managers } = await supabase.from('managers').select('id, email, team_name')
    if (!managers || managers.length === 0) {
      return new Response(JSON.stringify({ message: 'No managers found' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get existing captain selections for these races
    const raceIds = races.map(r => r.id)
    const { data: existingSelections } = await supabase
      .from('captain_selections')
      .select('manager_id, race_id')
      .in('race_id', raceIds)

    const selectionSet = new Set(
      (existingSelections || []).map(s => `${s.manager_id}_${s.race_id}`)
    )

    let sentCount = 0

    for (const race of races) {
      const deadlineStr = new Date(race.captain_deadline!).toLocaleString('da-DK', {
        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      })

      for (const mgr of managers) {
        // Skip if already selected captain for this race
        if (selectionSet.has(`${mgr.id}_${race.id}`)) continue

        const siteUrl = 'https://dasuracemanager.lovable.app'

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #e53e3e;">🏎️ Captain-valg åbent!</h2>
            <p>Hej ${mgr.team_name},</p>
            <p>Husk at vælge din <strong>captain</strong> inden <strong>${deadlineStr}</strong> for <strong>${race.name}</strong>.</p>
            <p>Din captains point tæller dobbelt for hele arrangementet!</p>
            <p style="margin: 24px 0;">
              <a href="${siteUrl}/mit-hold" 
                 style="background: linear-gradient(135deg, #e53e3e, #c53030); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Vælg Captain →
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
              subject: `⏰ Vælg captain inden ${deadlineStr} — ${race.name}`,
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
    console.error('Captain reminder error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
