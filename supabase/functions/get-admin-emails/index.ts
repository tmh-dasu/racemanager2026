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

  const { managerIds } = await req.json().catch(() => ({ managerIds: [] }))
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