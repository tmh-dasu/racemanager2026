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

  // Only allow service_role
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
    const { race_id } = await req.json()
    if (!race_id) {
      return new Response(JSON.stringify({ error: 'race_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get race info
    const { data: race } = await supabase.from('races').select('name, round_number').eq('id', race_id).single()
    if (!race) {
      return new Response(JSON.stringify({ error: 'Race not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get all managers sorted by points for ranking
    const { data: managers } = await supabase.from('managers').select('id, email, team_name, total_points').order('total_points', { ascending: false })
    if (!managers || managers.length === 0) {
      return new Response(JSON.stringify({ message: 'No managers' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get each manager's drivers
    const { data: allMDs } = await supabase.from('manager_drivers').select('manager_id, driver_id')
    const { data: drivers } = await supabase.from('drivers').select('id, name, car_number, tier')

    // Get race results for this round
    const { data: raceResults } = await supabase.from('race_results').select('driver_id, points, session_type').eq('race_id', race_id)

    // Get captain selections for this race
    const { data: captains } = await supabase.from('captain_selections').select('manager_id, driver_id').eq('race_id', race_id)
    const captainMap = new Map((captains || []).map((c: any) => [c.manager_id, c.driver_id]))

    const siteUrl = 'https://dasuracemanager.lovable.app'
    let sentCount = 0

    for (let i = 0; i < managers.length; i++) {
      const mgr = managers[i]
      const rank = i + 1
      const driverIds = (allMDs || []).filter((md: any) => md.manager_id === mgr.id).map((md: any) => md.driver_id)
      const captainId = captainMap.get(mgr.id)

      // Calculate round points for this manager
      let roundPoints = 0
      const driverBreakdown: string[] = []

      for (const dId of driverIds) {
        const d = (drivers || []).find((dr: any) => dr.id === dId)
        if (!d) continue
        const results = (raceResults || []).filter((r: any) => r.driver_id === dId)
        let driverPts = results.reduce((sum: number, r: any) => sum + (r.points || 0), 0)
        const isCaptain = captainId === dId
        if (isCaptain) driverPts *= 2
        roundPoints += driverPts

        const tierBadge = d.tier === 'gold' ? '🥇' : d.tier === 'silver' ? '🥈' : '🥉'
        driverBreakdown.push(
          `<tr>
            <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;">${tierBadge} #${d.car_number} ${d.name}${isCaptain ? ' ⭐' : ''}</td>
            <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:bold;">${driverPts} pt</td>
          </tr>`
        )
      }

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:8px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#c41e1e,#e53e3e);padding:20px 24px;">
            <h2 style="margin:0;color:#fff;font-size:20px;">🏁 Resultater: ${race.name}</h2>
          </div>
          <div style="padding:20px 24px;">
            <p>Hej <strong>${mgr.team_name}</strong>,</p>
            <p>Resultaterne for Runde ${race.round_number} er nu opdateret!</p>

            <div style="background:#1e293b;border-radius:6px;padding:12px;margin:16px 0;">
              <table style="width:100%;border-collapse:collapse;color:#e2e8f0;font-size:14px;">
                <thead>
                  <tr><th style="text-align:left;padding:4px 8px;border-bottom:2px solid #475569;">Kører</th><th style="text-align:right;padding:4px 8px;border-bottom:2px solid #475569;">Point</th></tr>
                </thead>
                <tbody>
                  ${driverBreakdown.join('')}
                </tbody>
                <tfoot>
                  <tr><td style="padding:8px;font-weight:bold;color:#e53e3e;">Runde-total</td><td style="padding:8px;text-align:right;font-weight:bold;color:#e53e3e;">${roundPoints} pt</td></tr>
                </tfoot>
              </table>
            </div>

            <div style="background:#1e293b;border-radius:6px;padding:16px;margin:16px 0;text-align:center;">
              <p style="margin:0 0 4px;font-size:13px;color:#94a3b8;">Din samlede rangering</p>
              <p style="margin:0;font-size:28px;font-weight:bold;color:#e53e3e;">#${rank}</p>
              <p style="margin:4px 0 0;font-size:18px;font-weight:bold;">${mgr.total_points} point</p>
            </div>

            <p style="text-align:center;margin:24px 0 8px;">
              <a href="${siteUrl}/rangering" style="background:linear-gradient(135deg,#c41e1e,#e53e3e);color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
                Se fuld rangering →
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
            subject: `🏁 Resultater Runde ${race.round_number} — Du er #${rank} med ${mgr.total_points} point`,
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
    console.error('Notify results error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
