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

  const JOB_ID = 'captain_reminder'
  const LEASE_MINUTES = 5
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
  let lockAcquired = false

  const releaseLock = async (lastError: string | null) => {
    if (!lockAcquired) return
    await supabase.from('reminder_job_state')
      .update({ lock_expires_at: null, last_run_at: new Date().toISOString(), last_error: lastError, updated_at: new Date().toISOString() })
      .eq('id', JOB_ID)
  }

  try {
    const body = await req.json().catch(() => ({}))
    const windowHours = Number((body as { windowHours?: number })?.windowHours) || 168 // 7 days
    // Bounded work per run: never send more than this many emails in one invocation.
    const maxEmails = Math.min(Math.max(Number((body as { maxEmails?: number })?.maxEmails) || 30, 1), 100)
    // Throttle: pause between each Resend call to keep DB + API load flat.
    const throttleMs = Math.min(Math.max(Number((body as { throttleMs?: number })?.throttleMs) ?? 400, 0), 5000)
    const LOG_BATCH_SIZE = 10

    // --- Single-flight lock (lease with expiry) ---
    const { data: state } = await supabase
      .from('reminder_job_state')
      .select('paused, lock_expires_at')
      .eq('id', JOB_ID)
      .maybeSingle()

    if (state?.paused) {
      return new Response(JSON.stringify({ message: 'Job er sat på pause', paused: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const nowIso = new Date().toISOString()
    const leaseUntil = new Date(Date.now() + LEASE_MINUTES * 60 * 1000).toISOString()
    const { data: locked } = await supabase
      .from('reminder_job_state')
      .update({ lock_expires_at: leaseUntil, updated_at: nowIso })
      .eq('id', JOB_ID)
      .or(`lock_expires_at.is.null,lock_expires_at.lt.${nowIso}`)
      .select('id')
    if (!locked || locked.length === 0) {
      return new Response(JSON.stringify({ message: 'Jobbet kører allerede — sprunget over' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    lockAcquired = true

    // Deadline = race_date - 1h. Reminders go out from `windowHours` before the deadline.
    const now = new Date()
    const minRaceDate = new Date(now.getTime() + 60 * 60 * 1000) // deadline = now
    const maxRaceDate = new Date(now.getTime() + (windowHours + 1) * 60 * 60 * 1000)

    const { data: races } = await supabase
      .from('races')
      .select('id, name, race_date')
      .gte('race_date', minRaceDate.toISOString())
      .lte('race_date', maxRaceDate.toISOString())

    if (!races || races.length === 0) {
      await releaseLock(null)
      return new Response(JSON.stringify({ message: 'No upcoming deadlines' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: managers } = await supabase.from('managers').select('id, email, team_name')
    if (!managers || managers.length === 0) {
      await releaseLock(null)
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
    let skippedCount = 0
    let failedCount = 0
    let attempted = 0
    let capped = false
    const errors: string[] = []
    const siteUrl = 'https://dasuracemanager.lovable.app'

    // Buffer log rows and write them in batches instead of one round-trip per email.
    type LogRow = { manager_id: string; race_id: string; stage: string; status: string; error_message: string | null }
    let logBuffer: LogRow[] = []
    const flushLogs = async () => {
      if (logBuffer.length === 0) return
      const rows = logBuffer
      logBuffer = []
      const { error } = await supabase.from('reminder_send_log')
        .upsert(rows, { onConflict: 'manager_id,race_id,stage' })
      if (error) console.error('Log flush error:', error.message)
    }

    for (const race of races) {
      if (capped) break
      const deadline = new Date(new Date(race.race_date!).getTime() - 60 * 60 * 1000)
      const hoursLeft = (deadline.getTime() - now.getTime()) / (60 * 60 * 1000)
      // One reminder per stage: 7 days out, 48h out, 24h out.
      const stage = hoursLeft <= 24 ? '24h' : hoursLeft <= 48 ? '48h' : '7d'

      const { data: alreadySent } = await supabase
        .from('reminder_send_log')
        .select('manager_id')
        .eq('race_id', race.id)
        .eq('stage', stage)
        .eq('status', 'sent')
      const sentSet = new Set((alreadySent || []).map(r => r.manager_id))

      const deadlineStr = deadline.toLocaleString('da-DK', {
        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
        timeZone: 'Europe/Copenhagen',
      })

      const raceQuestion = (predQuestions || []).find(q => q.race_id === race.id)

      for (const mgr of managers) {
        if (attempted >= maxEmails) { capped = true; break }
        const needsCaptain = !captainSet.has(`${mgr.id}_${race.id}`)
        const needsPrediction = raceQuestion && !predSet.has(`${mgr.id}_${raceQuestion.id}`)

        // Only send if something is missing
        if (!needsCaptain && !needsPrediction) continue
        if (sentSet.has(mgr.id)) { skippedCount++; continue }

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
              <p style="color:#52525b;">Deadline er <strong>${deadlineStr}</strong> (1 time inden arrangementet starter). Du mangler:</p>
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
          attempted++
          if (throttleMs > 0) await sleep(throttleMs)
          const res = await fetch('https://api.resend.com/emails', {
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
          const resBody = await res.text()
          if (!res.ok) {
            failedCount++
            if (errors.length < 5) errors.push(`[${res.status}] ${resBody}`)
            console.error(`Resend error for ${mgr.email} [${res.status}]: ${resBody}`)
            logBuffer.push({ manager_id: mgr.id, race_id: race.id, stage, status: 'failed', error_message: `[${res.status}] ${resBody}`.slice(0, 500) })
            if (logBuffer.length >= LOG_BATCH_SIZE) await flushLogs()
            // Rate limited or upstream failure: stop this run, next run continues.
            if (res.status === 429 || res.status >= 500) { capped = true; break }
            continue
          }
          sentCount++
          logBuffer.push({ manager_id: mgr.id, race_id: race.id, stage, status: 'sent', error_message: null })
          if (logBuffer.length >= LOG_BATCH_SIZE) await flushLogs()
        } catch (e) {
          failedCount++
          const msg = e instanceof Error ? e.message : String(e)
          if (errors.length < 5) errors.push(msg)
          console.error(`Failed to send to ${mgr.email}:`, msg)
          logBuffer.push({ manager_id: mgr.id, race_id: race.id, stage, status: 'failed', error_message: msg.slice(0, 500) })
          if (logBuffer.length >= LOG_BATCH_SIZE) await flushLogs()
        }
      }
    }

    await flushLogs()
    await releaseLock(errors[0] ?? null)

    return new Response(JSON.stringify({
      success: true,
      sent: sentCount,
      skipped: skippedCount,
      failed: failedCount,
      remainingWork: capped,
      errors,
      message: `${sentCount} sendt, ${skippedCount} sprunget over (allerede påmindet), ${failedCount} fejlet.${capped ? ' Resten sendes ved næste kørsel.' : ''}`,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Reminder error:', error)
    await releaseLock(error instanceof Error ? error.message.slice(0, 500) : 'Unknown error')
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
