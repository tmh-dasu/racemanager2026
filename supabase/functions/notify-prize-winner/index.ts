import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const token = authHeader.replace('Bearer ', '')
  const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token)
  if (claimsErr || !claimsData?.claims?.sub) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const adminClient = createClient(supabaseUrl, serviceKey)
  const userId = claimsData.claims.sub

  const { data: roleRow } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle()

  if (!roleRow) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { prizeId } = await req.json()
  if (!prizeId) {
    return new Response(JSON.stringify({ error: 'Missing prizeId' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: prize, error: prizeErr } = await adminClient
    .from('prizes')
    .select('*')
    .eq('id', prizeId)
    .maybeSingle()

  if (prizeErr || !prize || !prize.winner_manager_id) {
    return new Response(JSON.stringify({ error: 'Prize not found or no winner' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: manager } = await adminClient
    .from('managers')
    .select('email, team_name, name')
    .eq('id', prize.winner_manager_id)
    .maybeSingle()

  if (!manager?.email) {
    return new Response(JSON.stringify({ error: 'Winner email not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const subject = `🎉 Tillykke! Du har vundet "${prize.name}" i DASU RaceManager`
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;padding:32px;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:48px;">🎉🏆</span>
      </div>
      <h1 style="color:#e11d48;text-align:center;margin:0 0 8px;">Tillykke, ${manager.team_name}!</h1>
      <p style="color:#333;font-size:16px;text-align:center;margin:0 0 24px;">
        Du har vundet en præmie i DASU RaceManager lodtrækningen!
      </p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
        <p style="color:#991b1b;font-size:14px;margin:0 0 4px;font-weight:600;">Din præmie:</p>
        <p style="color:#e11d48;font-size:22px;font-weight:bold;margin:0;">${prize.name}</p>
        ${prize.description ? `<p style="color:#666;font-size:14px;margin:8px 0 0;">${prize.description}</p>` : ''}
      </div>
      <p style="color:#555;font-size:14px;text-align:center;">
        Vi kontakter dig snart med yderligere information om afhentning/levering af din præmie.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="color:#999;font-size:12px;text-align:center;">
        Med venlig hilsen,<br/>DASU RaceManager
      </p>
    </div>
  `

  console.log('Sending prize winner email', { prizeId, email: manager.email })

  const { data: emailResult, error: emailError } = await adminClient.functions.invoke('send-email', {
    body: {
      to: manager.email,
      subject,
      html,
    },
  })

  if (emailError) {
    console.error('Failed to send prize winner email', {
      prizeId,
      email: manager.email,
      error: emailError.message,
    })

    return new Response(JSON.stringify({ error: 'Email send failed', details: emailError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Prize winner email sent', { prizeId, email: manager.email, result: emailResult })

  return new Response(JSON.stringify({ success: true, email: manager.email }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
