import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Returns an array of warning strings if race timing looks suspicious.
// Rules (project policy):
//  - All deadlines must lock exactly 1h before race_date (Europe/Copenhagen).
//  - race_date hour in CEST/CET should be a "reasonable" race start time
//    (8:00–20:00). Anything outside is flagged as likely timezone error.
export async function checkRaceTiming(supabase: any, raceId: string): Promise<{
  warnings: string[]
  race: any
  questions: any[]
}> {
  const warnings: string[] = []

  const { data: race } = await supabase
    .from('races')
    .select('id, name, round_number, race_date, captain_deadline')
    .eq('id', raceId)
    .single()

  if (!race) return { warnings: ['Løbet blev ikke fundet'], race: null, questions: [] }

  const { data: questions } = await supabase
    .from('prediction_questions')
    .select('id, question_text, prediction_deadline, published')
    .eq('race_id', raceId)
    .eq('published', true)

  if (!race.race_date) {
    warnings.push(`⚠️ "${race.name}" har ingen race_date sat.`)
    return { warnings, race, questions: questions || [] }
  }

  const raceDate = new Date(race.race_date)
  // Hour in Europe/Copenhagen
  const cphHourStr = new Intl.DateTimeFormat('da-DK', {
    hour: '2-digit', hour12: false, timeZone: 'Europe/Copenhagen',
  }).format(raceDate)
  const cphHour = parseInt(cphHourStr, 10)
  const cphTimeStr = raceDate.toLocaleString('da-DK', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Copenhagen',
  })

  // Sanity check: race start hour
  if (cphHour < 8 || cphHour > 20) {
    warnings.push(
      `⚠️ Løbet "${race.name}" starter ifølge databasen kl. ${cphHourStr}:00 dansk tid (${cphTimeStr}). ` +
      `Det ligner en tidszone-fejl — race_date gemmes som UTC, husk at indtaste i dansk tid.`
    )
  }

  // Captain deadline = race_date - 1h
  if (race.captain_deadline) {
    const expected = new Date(raceDate.getTime() - 60 * 60 * 1000).getTime()
    const actual = new Date(race.captain_deadline).getTime()
    const diffMin = Math.round((actual - expected) / 60000)
    if (Math.abs(diffMin) > 1) {
      warnings.push(
        `⚠️ Holdkaptajn-deadline matcher ikke regelen "1 time før løbsstart" ` +
        `(afviger med ${diffMin} min).`
      )
    }
  } else {
    warnings.push('⚠️ Ingen captain_deadline sat på løbet.')
  }

  // Prediction deadlines = race_date - 1h
  for (const q of questions || []) {
    if (!q.prediction_deadline) {
      warnings.push(`⚠️ Prediction-spørgsmål mangler deadline: "${q.question_text}"`)
      continue
    }
    const expected = new Date(raceDate.getTime() - 60 * 60 * 1000).getTime()
    const actual = new Date(q.prediction_deadline).getTime()
    const diffMin = Math.round((actual - expected) / 60000)
    if (Math.abs(diffMin) > 1) {
      warnings.push(
        `⚠️ Prediction-deadline for "${q.question_text}" afviger ${diffMin} min ` +
        `fra "1 time før løbsstart".`
      )
    }
  }

  return { warnings, race, questions: questions || [] }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Admin check
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: claimsData } = await anonClient.auth.getClaims(authHeader.replace('Bearer ', ''))
  if (!claimsData?.claims?.sub) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const adminClient = createClient(supabaseUrl, supabaseServiceKey)
  const { data: roleCheck } = await adminClient.rpc('has_role', {
    _user_id: claimsData.claims.sub, _role: 'admin',
  })
  if (!roleCheck) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { race_id } = await req.json()
    if (!race_id) {
      return new Response(JSON.stringify({ error: 'race_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const result = await checkRaceTiming(adminClient, race_id)
    return new Response(JSON.stringify({
      ok: result.warnings.length === 0,
      warnings: result.warnings,
      race: result.race,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('check-race-timing error:', e)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})