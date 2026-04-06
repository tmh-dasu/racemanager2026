import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, AlertTriangle } from "lucide-react";
import { fetchDrivers, fetchSettings, createManager, addManagerDriver, fetchManagerByUserId, type Driver } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PageLayout from "@/components/PageLayout";

const TIER_CONFIG = {
  gold: { label: "Guld", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40", required: 1 },
  silver: { label: "Sølv", color: "bg-gray-300/20 text-gray-300 border-gray-400/40", required: 1 },
  bronze: { label: "Bronze", color: "bg-amber-700/20 text-amber-600 border-amber-700/40", required: 1 },
} as const;

type Tier = keyof typeof TIER_CONFIG;

export default function PickTeamPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const hasPaid = searchParams.get("paid") === "true";
  const sessionId = searchParams.get("session_id");
  const { user, loading: authLoading } = useAuth();
  const verifiedRef = useRef(false);

  const { data: allDrivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });
  const drivers = allDrivers.filter((d) => !d.withdrawn);
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const { data: existingManager } = useQuery({
    queryKey: ["manager", user?.id],
    queryFn: () => fetchManagerByUserId(user!.id),
    enabled: !!user,
  });

  const [teamName, setTeamName] = useState("");
  const [selectedDriverIds, setSelectedDriverIds] = useState<Record<Tier, string | null>>({
    gold: null, silver: null, bronze: null,
  });
  const [submitting, setSubmitting] = useState(false);

  const registrationOpen = settings?.team_registration_open ?? false;

  useEffect(() => {
    if (existingManager) navigate("/mit-hold", { replace: true });
  }, [existingManager, navigate]);

  // Verify Stripe payment and send confirmation email
  useEffect(() => {
    if (!sessionId || !hasPaid || verifiedRef.current) return;
    verifiedRef.current = true;
    supabase.functions.invoke("verify-payment", {
      body: { session_id: sessionId },
    }).catch(console.error);
  }, [sessionId, hasPaid]);

  function toggleDriver(id: string, tier: Tier) {
    setSelectedDriverIds((prev) => ({
      ...prev,
      [tier]: prev[tier] === id ? null : id,
    }));
  }

  const allSelected = selectedDriverIds.gold && selectedDriverIds.silver && selectedDriverIds.bronze;

  async function handleSubmit() {
    if (!user) { navigate("/login"); return; }
    if (!teamName) { toast({ title: "Udfyld holdnavn", variant: "destructive" }); return; }
    if (!allSelected) { toast({ title: "Vælg én kører fra hver kategori", variant: "destructive" }); return; }

    setSubmitting(true);
    try {
      const name = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : "Ukendt");
      const email = user.email || "";
      const manager = await createManager(name, email, teamName, user.id);
      for (const dId of Object.values(selectedDriverIds)) {
        if (dId) await addManagerDriver(manager.id, dId);
      }
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      toast({ title: "Hold oprettet! 🏁" });
      navigate("/mit-hold");
    } catch (err: any) {
      toast({ title: "Fejl: " + err.message, variant: "destructive" });
    }
    setSubmitting(false);
  }

  if (authLoading) {
    return <PageLayout><div className="container py-12 text-center"><p className="text-muted-foreground">Indlæser...</p></div></PageLayout>;
  }
  if (!user) {
    return (
      <PageLayout>
        <div className="container py-12 text-center space-y-4">
          <AlertTriangle className="mx-auto h-10 w-10 text-gold" />
          <h1 className="font-display text-2xl font-bold text-foreground">Log ind først</h1>
          <p className="text-muted-foreground">Du skal være logget ind for at oprette et hold.</p>
          <Button onClick={() => navigate("/login")} className="bg-gradient-racing text-primary-foreground font-display">Log ind</Button>
        </div>
      </PageLayout>
    );
  }
  if (!hasPaid) {
    return (
      <PageLayout>
        <div className="container py-12 text-center space-y-4">
          <AlertTriangle className="mx-auto h-10 w-10 text-gold" />
          <h1 className="font-display text-2xl font-bold text-foreground">Betaling påkrævet</h1>
          <p className="text-muted-foreground">Du skal betale tilmeldingsgebyret før du kan vælge dit hold.</p>
          <Button onClick={() => navigate("/betal")} className="bg-gradient-racing text-primary-foreground font-display">Gå til betaling</Button>
        </div>
      </PageLayout>
    );
  }
  if (!registrationOpen) {
    return (
      <PageLayout>
        <div className="container py-12 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-gold" />
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Holdregistrering lukket</h1>
          <p className="mt-2 text-muted-foreground">Holdvalg er ikke længere åbent for denne sæson.</p>
        </div>
      </PageLayout>
    );
  }

  const tierOrder: Tier[] = ["gold", "silver", "bronze"];

  return (
    <PageLayout>
      <div className="container py-6 space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Vælg dit hold</h1>
          <p className="text-sm text-muted-foreground">Vælg præcis 1 kører fra hver kategori: Guld, Sølv og Bronze</p>
        </div>

        <div className="max-w-md">
          <Input placeholder="Holdnavn" value={teamName} onChange={(e) => setTeamName(e.target.value)} className="bg-secondary border-border" />
        </div>

        {tierOrder.map((tier) => {
          const config = TIER_CONFIG[tier];
          const tierDrivers = drivers.filter((d) => d.tier === tier);
          return (
            <TierSection
              key={tier}
              tier={tier}
              config={config}
              drivers={tierDrivers}
              selectedId={selectedDriverIds[tier]}
              onToggle={(id) => toggleDriver(id, tier)}
            />
          );
        })}

        {drivers.length === 0 && (
          <p className="text-center text-muted-foreground">Ingen kørere tilgængelige endnu.</p>
        )}

        <div className="flex justify-center">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !allSelected}
            className="bg-gradient-racing px-8 py-3 font-display text-base font-semibold text-primary-foreground shadow-racing hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
          >
            {submitting ? "Opretter..." : "Bekræft hold 🏁"}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}

function TierSection({ tier, config, drivers, selectedId, onToggle }: {
  tier: Tier;
  config: { label: string; color: string };
  drivers: Driver[];
  selectedId: string | null;
  onToggle: (id: string) => void;
}) {
  if (drivers.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge className={config.color}>{config.label}</Badge>
        <span className="text-sm text-muted-foreground">
          Vælg 1 kører {selectedId ? "✓" : ""}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {drivers.map((d) => {
          const selected = selectedId === d.id;
          const disabled = selectedId !== null && selectedId !== d.id;
          return (
            <button
              key={d.id}
              onClick={() => onToggle(d.id)}
              disabled={disabled}
              className={`group relative flex flex-col rounded-lg border p-4 text-left transition-all ${
                selected
                  ? "border-racing-red bg-racing-red/10 shadow-racing"
                  : disabled
                  ? "border-border bg-card opacity-40 cursor-not-allowed"
                  : "border-border bg-card hover:border-racing-red/50"
              }`}
            >
              <div className="flex items-start gap-3">
                {d.photo_url ? (
                  <img src={d.photo_url} alt={d.name} className="h-14 w-14 rounded-md object-cover shrink-0" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-secondary font-display text-lg font-bold text-muted-foreground">
                    #{d.car_number}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-foreground truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground truncate">#{d.car_number} • {d.team}</p>
                  {d.club && <p className="text-xs text-muted-foreground truncate">{d.club}</p>}
                </div>
              </div>
              {d.bio && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{d.bio}</p>}
              {d.quote && <p className="mt-1 text-xs italic text-muted-foreground/70 line-clamp-1">"{d.quote}"</p>}
              {selected && (
                <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-racing">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
