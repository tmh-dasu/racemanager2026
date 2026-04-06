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
    // Get admin notification email from settings
    const { data: settingsData } = await supabase.from('settings').select('key, value')
    const settingsMap: Record<string, string> = {}
    ;(settingsData || []).forEach((s: any) => { settingsMap[s.key] = s.value })

    const adminEmail = settingsMap.admin_notification_email
    if (!adminEmail) {
      return new Response(JSON.stringify({ message: 'No admin notification email configured' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Find races happening in the next 72 hours
    const now = new Date()
    const in72h = new Date(now.getTime() + 72 * 60 * 60 * 1000)

    const { data: races } = await supabase
      .from('races')
      .select('*')
      .gte('race_date', now.toISOString())
      .lte('race_date', in72h.toISOString())
      .order('round_number')

    if (!races || races.length === 0) {
      return new Response(JSON.stringify({ message: 'No upcoming races within 72 hours' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: allQuestions } = await supabase.from('prediction_questions').select('*')

    let sentCount = 0

    for (const race of races) {
      const issues: { level: string; message: string }[] = []

      // Check race date
      if (!race.race_date) {
        issues.push({ level: '🔴', message: 'Arrangementsdato mangler' })
      }

      // Captain/transfer deadline is auto-calculated from race_date - no manual check needed

      // Check predictions
      const raceQuestions = (allQuestions || []).filter((q: any) => q.race_id === race.id)
      const publishedQuestions = raceQuestions.filter((q: any) => q.published)

      if (raceQuestions.length === 0) {
        issues.push({ level: '🟡', message: 'Ingen prediction-spørgsmål oprettet' })
      } else if (publishedQuestions.length === 0) {
        issues.push({ level: '🟡', message: `${raceQuestions.length} spørgsmål oprettet men ikke publiceret` })
      } else if (publishedQuestions.length < 3) {
        issues.push({ level: '🟡', message: `Kun ${publishedQuestions.length}/3 predictions publiceret` })
      }

      // Only send if there are issues
      if (issues.length === 0) continue

      const issueRows = issues.map(i =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #f4f4f5;">${i.level}</td><td style="padding:6px 12px;border-bottom:1px solid #f4f4f5;color:#18181b;">${i.message}</td></tr>`
      ).join('')

      const siteUrl = 'https://dasuracemanager.lovable.app'
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
          <div style="background:#dc2626;padding:20px 24px;">
            <h2 style="margin:0;color:#fff;font-size:20px;">⚠️ Admin-advarsel: Runde ${race.round_number}</h2>
          </div>
          <div style="padding:20px 24px;">
            <p style="color:#52525b;">Arrangementet <strong style="color:#18181b;">${race.name}</strong> starter om mindre end 72 timer, men følgende er ikke klar:</p>

            <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
              <thead>
                <tr style="background:#f4f4f5;"><th style="text-align:left;padding:6px 12px;border-bottom:2px solid #e4e4e7;color:#71717a;">Status</th><th style="text-align:left;padding:6px 12px;border-bottom:2px solid #e4e4e7;color:#71717a;">Problem</th></tr>
              </thead>
              <tbody>${issueRows}</tbody>
            </table>

            <p style="text-align:center;margin:24px 0 8px;">
              <a href="${siteUrl}/admin" style="background:#dc2626;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
                Åbn admin-panelet →
              </a>
            </p>
          </div>
          <div style="padding:12px 24px;text-align:center;font-size:11px;color:#a1a1aa;border-top:1px solid #e4e4e7;">
            DASU RaceManager – Automatisk admin-påmindelse
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
            to: [adminEmail],
            subject: `⚠️ Runde ${race.round_number} mangler opsætning – ${issues.length} problem${issues.length > 1 ? 'er' : ''}`,
            html,
          }),
        })
        sentCount++
      } catch (e) {
        console.error('Failed to send admin reminder:', e)
      }
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Admin reminder error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
