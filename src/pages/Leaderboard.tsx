import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Crown, ArrowLeftRight } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchManagers, fetchManagerDrivers, fetchManagerByUserId, fetchDrivers, fetchRaceResults, fetchAllCaptainSelections, fetchRaces, fetchAllTransfers, fetchAllPredictionAnswers, computePointBreakdown, type Manager, type Driver, type CaptainSelection, type Race, type Transfer, type PointBreakdown } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import PageLayout from "@/components/PageLayout";
import { Badge } from "@/components/ui/badge";

const TIER_BADGE: Record<string, { label: string; className: string }> = {
  gold: { label: "Guld", className: "bg-gold/20 text-gold border-gold/40" },
  silver: { label: "Sølv", className: "bg-silver/20 text-silver border-silver/40" },
  bronze: { label: "Bronze", className: "bg-bronze/20 text-bronze border-bronze/40" },
};

function PointBreakdownRow({ breakdown }: { breakdown: PointBreakdown }) {
  return (
    <div className="grid grid-cols-4 gap-1 text-[11px] rounded bg-secondary/30 px-3 py-2 mt-1">
      <div className="text-center">
        <p className="text-muted-foreground">Race</p>
        <p className="font-display font-bold text-foreground">{breakdown.racePoints}</p>
      </div>
      <div className="text-center">
        <p className="text-muted-foreground">Holdkaptajn</p>
        <p className="font-display font-bold text-gold">+{breakdown.captainBonus}</p>
      </div>
      <div className="text-center">
        <p className="text-muted-foreground">Predictions</p>
        <p className="font-display font-bold text-success">+{breakdown.predictionPoints}</p>
      </div>
      <div className="text-center">
        <p className="text-muted-foreground">Transfers</p>
        <p className={`font-display font-bold ${breakdown.transferCosts > 0 ? "text-destructive" : "text-muted-foreground"}`}>
          {breakdown.transferCosts > 0 ? `−${breakdown.transferCosts}` : "0"}
        </p>
      </div>
    </div>
  );
}

function ExpandableTeam({ manager, rank, allDrivers, captainSelections, races, transfers, breakdown, isMyTeam }: {
  manager: Manager; rank: number; allDrivers: Driver[];
  captainSelections: CaptainSelection[]; races: Race[]; transfers: Transfer[];
  breakdown: PointBreakdown; isMyTeam: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { data: managerDrivers } = useQuery({
    queryKey: ["manager_drivers", manager.id],
    queryFn: () => fetchManagerDrivers(manager.id),
    enabled: open,
  });

  const teamDrivers = managerDrivers
    ? allDrivers.filter((d) => managerDrivers.some((md) => md.driver_id === d.id))
    : [];

  const mgrCaptains = captainSelections.filter((c) => c.manager_id === manager.id);
  const mgrTransfers = transfers.filter((t) => t.manager_id === manager.id);

  function getCaptaincyUsed(tier: string) {
    return mgrCaptains.filter((c) => {
      const d = allDrivers.find((dr) => dr.id === c.driver_id);
      return d?.tier === tier;
    }).length;
  }

  function getCaptainRaces(driverId: string): number[] {
    return mgrCaptains
      .filter((c) => c.driver_id === driverId)
      .map((c) => {
        const race = races.find((r) => r.id === c.race_id);
        return race?.round_number || 0;
      })
      .sort((a, b) => a - b);
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 rounded-lg border p-3 shadow-card transition text-left ${
          isMyTeam ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" :
          rank === 0 ? "border-gold/30 bg-gold/5" : rank === 1 ? "border-silver/30 bg-silver/5" : rank === 2 ? "border-bronze/30 bg-bronze/5" : "border-border bg-card"
        } hover:bg-accent/50`}
      >
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${
          rank === 0 ? "bg-gold text-gold-foreground" : rank === 1 ? "bg-silver text-silver-foreground" : rank === 2 ? "bg-bronze text-bronze-foreground" : "bg-secondary text-muted-foreground"
        }`}>
          {rank + 1}
        </span>
        <div className="flex-1 min-w-0">
          <Link to={`/hold/${manager.slug}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
            <p className="font-display font-semibold text-foreground truncate flex items-center gap-1.5">
              {manager.team_name}
              {isMyTeam && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">Mit hold</Badge>}
            </p>
          </Link>
          <p className="text-xs text-muted-foreground truncate">{manager.name}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {mgrTransfers.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground" title={`${mgrTransfers.length} transfers`}>
              <ArrowLeftRight className="h-3 w-3" />{mgrTransfers.length}
            </span>
          )}
          <span className="font-display text-xl font-bold text-foreground">{manager.total_points}</span>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="ml-11 mt-1 mb-1 space-y-1">
          {/* Point breakdown */}
          <PointBreakdownRow breakdown={breakdown} />

          {teamDrivers.length > 0 ? teamDrivers
            .sort((a, b) => {
              const order = { gold: 0, silver: 1, bronze: 2 };
              return (order[a.tier as keyof typeof order] ?? 3) - (order[b.tier as keyof typeof order] ?? 3);
            })
            .map((d) => {
              const captainRounds = getCaptainRaces(d.id);
              const tier = TIER_BADGE[d.tier] || TIER_BADGE.bronze;
              return (
                <div key={d.id} className="flex items-center gap-2 rounded bg-secondary/50 px-3 py-1.5 text-sm">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${tier.className}`}>{tier.label}</Badge>
                  <span className="text-foreground flex-1 truncate">{d.name}</span>
                  {captainRounds.length > 0 && (
                    <span className="flex items-center gap-1 text-gold text-[11px]" title={`Holdkaptajn i runde ${captainRounds.join(", ")}`}>
                      <Crown className="h-3 w-3" />
                      R{captainRounds.join(", R")}
                    </span>
                  )}
                </div>
              );
            }) : (
            <div className="rounded bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground">Henter kørere…</div>
          )}
          {/* Captaincy budget per tier */}
          <div className="flex gap-2 px-1 pt-1">
            {(["gold", "silver", "bronze"] as const).map((tier) => {
              const used = getCaptaincyUsed(tier);
              const remaining = 2 - used;
              const badge = TIER_BADGE[tier];
              return (
                <span key={tier} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Crown className="h-2.5 w-2.5 text-gold" />
                  <span className={badge.className.split(" ").find(c => c.startsWith("text-")) || ""}>{badge.label}:</span>
                  {remaining}/2
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { data: managers = [] } = useQuery({ queryKey: ["managers"], queryFn: fetchManagers });
  const { data: myManager } = useQuery({
    queryKey: ["my_manager", user?.id],
    queryFn: () => fetchManagerByUserId(user!.id),
    enabled: !!user,
  });
  const { data: allResults = [] } = useQuery({ queryKey: ["race_results"], queryFn: () => fetchRaceResults() });
  const { data: allDrivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });
  const { data: captainSelections = [] } = useQuery({ queryKey: ["all_captain_selections"], queryFn: fetchAllCaptainSelections });
  const { data: races = [] } = useQuery({ queryKey: ["races"], queryFn: fetchRaces });
  const { data: transfers = [] } = useQuery({ queryKey: ["all_transfers"], queryFn: fetchAllTransfers });
  const { data: predAnswers = [] } = useQuery({ queryKey: ["all_prediction_answers"], queryFn: fetchAllPredictionAnswers });

  // We need all manager_drivers for breakdown computation
  // Fetch them in bulk via a single query isn't possible with current API, so we compute from what we have
  // Actually we need this data. Let's fetch it.
  const { data: allMDs = [] } = useQuery({
    queryKey: ["all_manager_drivers"],
    queryFn: async () => {
      const { data } = await (await import("@/integrations/supabase/client")).supabase.from("manager_drivers").select("manager_id, driver_id");
      return (data || []) as { manager_id: string; driver_id: string }[];
    },
  });

  const completedRounds = useMemo(() => new Set(allResults.map(r => r.race_id)).size, [allResults]);

  const breakdowns = useMemo(() => {
    const map = new Map<string, PointBreakdown>();
    for (const m of managers) {
      map.set(m.id, computePointBreakdown(m.id, allMDs, allResults, captainSelections, predAnswers, transfers, completedRounds));
    }
    return map;
  }, [managers, allMDs, allResults, captainSelections, predAnswers, transfers, completedRounds]);

  return (
    <PageLayout>
      <div className="container py-6 space-y-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Leaderboard</h1>

        {managers.length === 0 && (
          <p className="text-muted-foreground">Ingen hold tilmeldt endnu.</p>
        )}

        <div className="space-y-2">
          {managers.map((m, i) => (
            <ExpandableTeam
              key={m.id}
              manager={m}
              rank={i}
              allDrivers={allDrivers}
              captainSelections={captainSelections}
              races={races}
              transfers={transfers}
              breakdown={breakdowns.get(m.id) || { racePoints: 0, captainBonus: 0, predictionPoints: 0, transferCosts: 0, total: 0 }}
              isMyTeam={myManager?.id === m.id}
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
