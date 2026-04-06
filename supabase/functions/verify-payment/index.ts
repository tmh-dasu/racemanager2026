import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Ikke logget ind");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      throw new Error("Ikke logget ind");
    }

    const email = claimsData.claims.email as string;
    const fullName = (claimsData.claims.user_metadata as any)?.full_name || email?.split("@")[0] || "Bruger";

    const { session_id } = await req.json();
    if (!session_id) throw new Error("Manglende session_id");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ verified: false, error: "Betaling ikke gennemført" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Send confirmation email via send-email (service role)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const amountPaid = session.amount_total ? (session.amount_total / 100).toFixed(0) : "49";

    await supabaseAdmin.functions.invoke("send-email", {
      body: {
        to: email,
        subject: "Betalingsbekræftelse – DASU Race Manager 2026",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#1e293b;border-radius:12px;padding:32px;border:1px solid #334155;">
      <h1 style="color:#ffffff;font-size:24px;margin:0 0 8px;">Betalingsbekræftelse ✅</h1>
      <p style="color:#94a3b8;margin:0 0 24px;">Din betaling er modtaget!</p>
      
      <div style="background:#0f172a;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#94a3b8;padding:8px 0;">Navn</td>
            <td style="color:#ffffff;text-align:right;padding:8px 0;">${fullName}</td>
          </tr>
          <tr>
            <td style="color:#94a3b8;padding:8px 0;">Beløb</td>
            <td style="color:#ffffff;text-align:right;padding:8px 0;font-weight:bold;">${amountPaid} kr.</td>
          </tr>
          <tr>
            <td style="color:#94a3b8;padding:8px 0;">Produkt</td>
            <td style="color:#ffffff;text-align:right;padding:8px 0;">Holdtilmelding 2026</td>
          </tr>
          <tr>
            <td style="color:#94a3b8;padding:8px 0;">Status</td>
            <td style="text-align:right;padding:8px 0;"><span style="background:#16a34a;color:#fff;padding:4px 12px;border-radius:999px;font-size:12px;">Betalt</span></td>
          </tr>
        </table>
      </div>

      <p style="color:#94a3b8;font-size:14px;margin:0 0 16px;">
        Du kan nu oprette dit fantasy-hold. Gå til holdvalg-siden for at vælge dine kørere.
      </p>
      
      <a href="https://dasuracemanager.lovable.app/vaelg-hold?paid=true" 
         style="display:inline-block;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
        Vælg dit hold →
      </a>

      <hr style="border:none;border-top:1px solid #334155;margin:24px 0;">
      <p style="color:#64748b;font-size:12px;margin:0;">DASU Race Manager 2026 – racemanager.dasu.dk</p>
    </div>
  </div>
</body>
</html>`,
      },
    });

    return new Response(JSON.stringify({ verified: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
