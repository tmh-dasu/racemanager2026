import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Ikke autoriseret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code } = await req.json();

    if (!code || typeof code !== "string" || code.trim().length === 0 || code.trim().length > 50) {
      return new Response(JSON.stringify({ error: "Ugyldig kode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Ikke autoriseret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to check and claim voucher
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const trimmedCode = code.trim().toUpperCase();

    const { data: voucher, error: fetchError } = await adminClient
      .from("voucher_codes")
      .select("*")
      .eq("code", trimmedCode)
      .maybeSingle();

    if (fetchError || !voucher) {
      return new Response(JSON.stringify({ error: "Ugyldig voucher-kode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (voucher.used_by) {
      return new Response(JSON.stringify({ error: "Denne kode er allerede brugt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Claim the voucher
    const { error: updateError } = await adminClient
      .from("voucher_codes")
      .update({ used_by: user.id, used_at: new Date().toISOString() })
      .eq("id", voucher.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Kunne ikke indløse koden" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Serverfejl" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
