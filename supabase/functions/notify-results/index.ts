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

    // Fetch all needed data
    const { data: managers } = await supabase.from('managers').select('id, email, team_name, total_points').order('total_points', { ascending: false })
    if (!managers || managers.length === 0) {
      return new Response(JSON.stringify({ message: 'No managers' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: allMDs } = await supabase.from('manager_drivers').select('manager_id, driver_id')
    const { data: drivers } = await supabase.from('drivers').select('id, name, car_number, tier')
    const { data: raceResults } = await supabase.from('race_results').select('driver_id, points, session_type').eq('race_id', race_id)
    const { data: captains } = await supabase.from('captain_selections').select('manager_id, driver_id').eq('race_id', race_id)
    const captainMap = new Map((captains || []).map((c: any) => [c.manager_id, c.driver_id]))

    // Prediction answers for this race's questions
    const { data: raceQuestions } = await supabase.from('prediction_questions').select('id').eq('race_id', race_id)
    const questionIds = (raceQuestions || []).map((q: any) => q.id)
    const { data: predAnswers } = questionIds.length > 0
      ? await supabase.from('prediction_answers').select('manager_id, is_correct').in('question_id', questionIds)
      : { data: [] }

    // Transfers per manager
    const { data: allTransfers } = await supabase.from('transfers').select('manager_id, point_cost')

    const siteUrl = 'https://dasuracemanager.lovable.app'
    let sentCount = 0

    for (let i = 0; i < managers.length; i++) {
      const mgr = managers[i]
      const rank = i + 1
      const driverIds = (allMDs || []).filter((md: any) => md.manager_id === mgr.id).map((md: any) => md.driver_id)
      const captainId = captainMap.get(mgr.id)

      // Race points breakdown per driver
      let roundRacePoints = 0
      let roundCaptainBonus = 0
      const driverBreakdown: string[] = []

      for (const dId of driverIds) {
        const d = (drivers || []).find((dr: any) => dr.id === dId)
        if (!d) continue
        const results = (raceResults || []).filter((r: any) => r.driver_id === dId)
        const basePts = results.reduce((sum: number, r: any) => sum + (r.points || 0), 0)
        const isCaptain = captainId === dId
        const captainBonus = isCaptain ? basePts : 0

        roundRacePoints += basePts
        roundCaptainBonus += captainBonus

        const tierBadge = d.tier === 'gold' ? '🥇' : d.tier === 'silver' ? '🥈' : '🥉'
        driverBreakdown.push(
          `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f4f4f5;color:#18181b;">${tierBadge} #${d.car_number} ${d.name}${isCaptain ? ' ⭐' : ''}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f4f4f5;text-align:right;color:#18181b;">${basePts} pt</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f4f4f5;text-align:right;color:${isCaptain ? '#dc2626' : '#a1a1aa'};">${isCaptain ? `+${captainBonus}` : '—'}</td>
          </tr>`
        )
      }

      // Prediction points for this race
      const predPoints = (predAnswers || [])
        .filter((a: any) => a.manager_id === mgr.id && a.is_correct === true)
        .length * 5

      // Total transfers cost (season total)
      const transferCost = (allTransfers || [])
        .filter((t: any) => t.manager_id === mgr.id)
        .reduce((sum: number, t: any) => sum + (t.point_cost || 0), 0)

      const roundTotal = roundRacePoints + roundCaptainBonus + predPoints

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
          <div style="background:#dc2626;padding:20px 24px;">
            <h2 style="margin:0;color:#fff;font-size:20px;">🏁 Resultater: ${race.name}</h2>
          </div>
          <div style="padding:20px 24px;">
            <p style="color:#18181b;">Hej <strong>${mgr.team_name}</strong>,</p>
            <p style="color:#52525b;">Resultaterne for Runde ${race.round_number} er nu opdateret!</p>

            <!-- Driver breakdown table -->
            <div style="border:1px solid #e4e4e7;border-radius:6px;overflow:hidden;margin:16px 0;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <thead>
                  <tr style="background:#f4f4f5;">
                    <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #e4e4e7;color:#71717a;">Kører</th>
                    <th style="text-align:right;padding:8px 12px;border-bottom:2px solid #e4e4e7;color:#71717a;">Race</th>
                    <th style="text-align:right;padding:8px 12px;border-bottom:2px solid #e4e4e7;color:#71717a;">Kaptajn</th>
                  </tr>
                </thead>
                <tbody>
                  ${driverBreakdown.join('')}
                </tbody>
              </table>
            </div>

            <!-- Point breakdown summary -->
            <div style="border:1px solid #e4e4e7;border-radius:6px;overflow:hidden;margin:16px 0;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tbody>
                  <tr style="border-bottom:1px solid #f4f4f5;">
                    <td style="padding:10px 12px;color:#52525b;">🏎️ Race-point</td>
                    <td style="padding:10px 12px;text-align:right;font-weight:bold;color:#18181b;">${roundRacePoints} pt</td>
                  </tr>
                  <tr style="border-bottom:1px solid #f4f4f5;">
                    <td style="padding:10px 12px;color:#52525b;">⭐ Holdkaptajn-bonus</td>
                    <td style="padding:10px 12px;text-align:right;font-weight:bold;color:${roundCaptainBonus > 0 ? '#dc2626' : '#a1a1aa'};">+${roundCaptainBonus} pt</td>
                  </tr>
                  <tr style="border-bottom:1px solid #f4f4f5;">
                    <td style="padding:10px 12px;color:#52525b;">🔮 Predictions</td>
                    <td style="padding:10px 12px;text-align:right;font-weight:bold;color:${predPoints > 0 ? '#16a34a' : '#a1a1aa'};">+${predPoints} pt</td>
                  </tr>
                  <tr style="background:#f4f4f5;">
                    <td style="padding:10px 12px;font-weight:bold;color:#dc2626;">Runde-total</td>
                    <td style="padding:10px 12px;text-align:right;font-weight:bold;color:#dc2626;">${roundTotal} pt</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Season standing -->
            <div style="background:#f4f4f5;border-radius:6px;padding:16px;margin:16px 0;">
              <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <tr>
                  <td style="color:#71717a;padding:4px 0;">Samlet rangering</td>
                  <td style="text-align:right;font-weight:bold;color:#dc2626;font-size:20px;">#${rank}</td>
                </tr>
                <tr>
                  <td style="color:#71717a;padding:4px 0;">Samlet point</td>
                  <td style="text-align:right;font-weight:bold;color:#18181b;font-size:18px;">${mgr.total_points} pt</td>
                </tr>
                ${transferCost > 0 ? `<tr>
                  <td style="color:#71717a;padding:4px 0;">Heraf transferfradrag</td>
                  <td style="text-align:right;font-weight:bold;color:#ef4444;">−${transferCost} pt</td>
                </tr>` : ''}
              </table>
            </div>

            <p style="text-align:center;margin:24px 0 8px;">
              <a href="${siteUrl}/rangering" style="background:#dc2626;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
                Se fuld rangering →
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
