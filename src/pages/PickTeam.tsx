import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, AlertTriangle, Info, Trophy, Crown } from "lucide-react";
import { fetchDrivers, fetchSettings, createManager, addManagerDriver, fetchManagerByUserId, fetchRaces, getFirstEligibleRace, type Driver } from "@/lib/api";
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
  const sessionId = searchParams.get("session_id");
  const { user, loading: authLoading } = useAuth();
  const verifiedRef = useRef(false);

  const { data: allDrivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });
  const drivers = allDrivers.filter((d) => !d.withdrawn);
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const { data: races = [] } = useQuery({ queryKey: ["races"], queryFn: fetchRaces });
  const { data: existingManager } = useQuery({
    queryKey: ["manager", user?.id],
    queryFn: () => fetchManagerByUserId(user!.id),
    enabled: !!user,
  });

  // Server-verified payment status (replaces trust in ?paid=true URL param)
  const { data: paymentRecord, isLoading: paymentLoading, refetch: refetchPayment } = useQuery({
    queryKey: ["user_payment", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_payments")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  const hasPaid = !!paymentRecord;

  const [teamName, setTeamName] = useState("");
  const [selectedDriverIds, setSelectedDriverIds] = useState<Record<Tier, string | null>>({
    gold: null, silver: null, bronze: null,
  });
  const [submitting, setSubmitting] = useState(false);

  const registrationOpen = settings?.team_registration_open ?? false;

  useEffect(() => {
    if (existingManager) navigate("/mit-hold", { replace: true });
  }, [existingManager, navigate]);

  // Verify Stripe payment server-side, then refetch payment status
  useEffect(() => {
    if (!sessionId || verifiedRef.current) return;
    verifiedRef.current = true;
    supabase.functions
      .invoke("verify-payment", { body: { session_id: sessionId } })
      .then(() => refetchPayment())
      .catch(console.error);
  }, [sessionId, refetchPayment]);

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
      // Send team creation confirmation email
      const selectedDriverNames = Object.values(selectedDriverIds)
        .filter(Boolean)
        .map(dId => drivers.find(d => d.id === dId)?.name || "Ukendt")
        .join(", ");
      supabase.functions.invoke("send-team-confirmation", {
        body: { teamName, driverNames: selectedDriverNames },
      }).catch(console.error);

      queryClient.invalidateQueries({ queryKey: ["managers"] });
      toast({
        title: "Hold oprettet! 🏁",
        description: "Husk at vælge holdkaptajn på Mit Hold inden hver runde – kaptajnens point tæller dobbelt!",
      });
      navigate("/mit-hold");
    } catch (err: any) {
      const msg = err.message?.includes("managers_slug_unique")
        ? "Holdnavnet er allerede taget – vælg venligst et andet holdnavn."
        : "Fejl: " + err.message;
      toast({ title: msg, variant: "destructive" });
    }
    setSubmitting(false);
  }

  if (authLoading || (user && paymentLoading)) {
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

  // Determine the first round this new manager will score in (Solution 3 fairness rule)
  const firstEligible = getFirstEligibleRace(races);
  const sortedRaces = [...races].sort((a, b) => a.round_number - b.round_number);
  const firstSeasonRace = sortedRaces[0];
  const startsLate = !!firstEligible && !!firstSeasonRace && firstEligible.id !== firstSeasonRace.id;
  const noEligibleRace = !firstEligible && races.length > 0;

  return (
    <PageLayout>
      <div className="container py-6 space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Vælg dit hold</h1>
          <p className="text-sm text-muted-foreground">Vælg præcis 1 kører fra hver kategori: Guld, Sølv og Bronze</p>
        </div>

        {/* Fairness notice: when does this manager start scoring? */}
        {firstEligible && (
          <div className={`rounded-lg border px-4 py-3 flex gap-3 items-start ${
            startsLate
              ? "border-gold/40 bg-gold/10"
              : "border-success/40 bg-success/10"
          }`}>
            {startsLate ? (
              <Info className="h-5 w-5 text-gold shrink-0 mt-0.5" />
            ) : (
              <Trophy className="h-5 w-5 text-success shrink-0 mt-0.5" />
            )}
            <div className="text-sm">
              <p className="font-display font-semibold text-foreground">
                {startsLate
                  ? `Du starter fra runde ${firstEligible.round_number}`
                  : `Du er med fra runde ${firstEligible.round_number} – hele sæsonen!`}
              </p>
              <p className="text-muted-foreground mt-0.5">
                {startsLate
                  ? `Tidligere runder er allerede afgjort, så dit hold scorer først point fra ${firstEligible.name}. Det sikrer fair konkurrence – ingen kan vælge kørere efter resultaterne er kendt.`
                  : `Deadline for runde ${firstEligible.round_number} er ikke nået endnu, så du får point fra første løb af sæsonen.`}
              </p>
            </div>
          </div>
        )}
        {noEligibleRace && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-display font-semibold text-foreground">Sæsonen er afgjort</p>
              <p className="text-muted-foreground mt-0.5">
                Alle runder har passeret deadlinen, så et nyoprettet hold vil ikke kunne score point i denne sæson.
              </p>
            </div>
          </div>
        )}

        {/* Captain reminder */}
        <div className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 flex gap-3 items-start">
          <Crown className="h-5 w-5 text-gold shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-display font-semibold text-foreground">Husk holdkaptajn til hver runde</p>
            <p className="text-muted-foreground mt-0.5">
              Inden hver runde skal du vælge én af dine 3 kørere som <strong>holdkaptajn</strong> – kaptajnens point tæller dobbelt!
              Valget foretages på <em>Mit Hold</em> og skal være på plads senest 24 timer før løbsstart. Glemmer du det, får du ingen bonus den runde.
            </p>
          </div>
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
