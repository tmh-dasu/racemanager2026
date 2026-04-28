import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

type EmailRow = {
  id: string
  email: string | null
  team_name: string | null
  name: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const token = authHeader.replace('Bearer ', '')
  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token)

  if (claimsError || !claimsData?.claims?.sub) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const adminClient = createClient(supabaseUrl, serviceKey)
  const { data: roleRow } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', claimsData.claims.sub)
    .eq('role', 'admin')
    .maybeSingle()

  if (!roleRow) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const body = await req.json().catch(() => ({}))
  const { managerIds, roundNumber, limit = 5 } = body

  if (typeof roundNumber === 'number') {
    const { data: race, error: raceError } = await adminClient
      .from('races')
      .select('id')
      .eq('round_number', roundNumber)
      .maybeSingle()

    if (raceError || !race) {
      return new Response(JSON.stringify({ emails: [], managers: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const [managersRes, driversRes, resultsRes, captainsRes, questionsRes] = await Promise.all([
      adminClient.from('managers').select('id, email, team_name, name'),
      adminClient.from('manager_drivers').select('manager_id, driver_id'),
      adminClient.from('race_results').select('driver_id, points').eq('race_id', race.id),
      adminClient.from('captain_selections').select('manager_id, driver_id').eq('race_id', race.id),
      adminClient.from('prediction_questions').select('id').eq('race_id', race.id),
    ])

    const questionIds = (questionsRes.data || []).map((q: { id: string }) => q.id)
    const answersRes = questionIds.length > 0
      ? await adminClient.from('prediction_answers').select('manager_id, is_correct').in('question_id', questionIds)
      : { data: [] }

    const pointsByDriver = new Map<string, number>()
    ;(resultsRes.data || []).forEach((row: { driver_id: string; points: number }) => {
      pointsByDriver.set(row.driver_id, (pointsByDriver.get(row.driver_id) || 0) + (row.points || 0))
    })

    const driversByManager = new Map<string, string[]>()
    ;(driversRes.data || []).forEach((row: { manager_id: string; driver_id: string }) => {
      driversByManager.set(row.manager_id, [...(driversByManager.get(row.manager_id) || []), row.driver_id])
    })

    const captainByManager = new Map<string, string>()
    ;(captainsRes.data || []).forEach((row: { manager_id: string; driver_id: string }) => {
      captainByManager.set(row.manager_id, row.driver_id)
    })

    const predictionPointsByManager = new Map<string, number>()
    ;(answersRes.data || []).forEach((row: { manager_id: string; is_correct: boolean | null }) => {
      if (row.is_correct === true) {
        predictionPointsByManager.set(row.manager_id, (predictionPointsByManager.get(row.manager_id) || 0) + 5)
      }
    })

    const topManagers = ((managersRes.data || []) as EmailRow[])
      .map((manager) => {
        const driverIds = driversByManager.get(manager.id) || []
        const racePoints = driverIds.reduce((sum, driverId) => sum + (pointsByDriver.get(driverId) || 0), 0)
        const captainId = captainByManager.get(manager.id)
        const captainBonus = captainId ? pointsByDriver.get(captainId) || 0 : 0
        const predictionPoints = predictionPointsByManager.get(manager.id) || 0
        return { ...manager, total: racePoints + captainBonus + predictionPoints }
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, Math.max(1, Number(limit) || 5))

    const emails = Array.from(new Set(topManagers.map((row) => row.email).filter((email): email is string => !!email)))

    return new Response(JSON.stringify({ emails, managers: topManagers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const ids = Array.isArray(managerIds)
    ? Array.from(new Set(managerIds.filter((id): id is string => typeof id === 'string' && id.length > 0)))
    : []

  if (ids.length === 0) {
    return new Response(JSON.stringify({ emails: [], managers: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data, error } = await adminClient
    .from('managers')
    .select('id, email, team_name, name')
    .in('id', ids)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const rows = (data || []) as EmailRow[]
  const emails = Array.from(new Set(rows.map((row) => row.email).filter((email): email is string => !!email)))

  return new Response(JSON.stringify({ emails, managers: rows }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})