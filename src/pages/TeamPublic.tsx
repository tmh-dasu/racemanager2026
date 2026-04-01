import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Users, Crown, ArrowLeftRight, History } from "lucide-react";
import { fetchManagerBySlug, fetchManagerDrivers, fetchDrivers, fetchRaceResults, fetchRaces, fetchManagers, fetchAllCaptainSelections, fetchTransfers, type Manager } from "@/lib/api";
import PageLayout from "@/components/PageLayout";
import { Badge } from "@/components/ui/badge";

const TIER_BADGE: Record<string, { label: string; className: string }> = {
  gold: { label: "Guld", className: "bg-gold/20 text-gold border-gold/40" },
  silver: { label: "Sølv", className: "bg-silver/20 text-silver border-silver/40" },
  bronze: { label: "Bronze", className: "bg-bronze/20 text-bronze border-bronze/40" },
};

export default function TeamPublicPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: manager, isLoading } = useQuery({
    queryKey: ["manager_public", slug],
    queryFn: () => fetchManagerBySlug(slug!),
    enabled: !!slug,
  });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });
  const { data: managerDrivers = [] } = useQuery({
    queryKey: ["manager_drivers", manager?.id],
    queryFn: () => fetchManagerDrivers(manager!.id),
    enabled: !!manager,
  });
  const { data: races = [] } = useQuery({ queryKey: ["races"], queryFn: fetchRaces });
  const { data: allResults = [] } = useQuery({ queryKey: ["race_results"], queryFn: () => fetchRaceResults() });
  const { data: allManagers = [] } = useQuery({ queryKey: ["managers"], queryFn: fetchManagers });
  const { data: captainSelections = [] } = useQuery({ queryKey: ["all_captain_selections"], queryFn: fetchAllCaptainSelections });
  const { data: myTransfers = [] } = useQuery({
    queryKey: ["transfers", manager?.id],
    queryFn: () => fetchTransfers(manager!.id),
    enabled: !!manager,
  });

  const myRank = manager ? allManagers.findIndex((m) => m.id === manager.id) + 1 : null;
  const myDriverIds = managerDrivers.map((md) => md.driver_id);
  const myDrivers = drivers
    .filter((d) => myDriverIds.includes(d.id))
    .sort((a, b) => {
      const order = { gold: 0, silver: 1, bronze: 2 };
      return (order[a.tier as keyof typeof order] ?? 3) - (order[b.tier as keyof typeof order] ?? 3);
    });

  const mgrCaptains = captainSelections.filter((c) => c.manager_id === manager?.id);

  function getDriverPoints(driverId: string) {
    return allResults.filter((r) => r.driver_id === driverId).reduce((s, r) => s + r.points, 0);
  }

  function getDriverRoundPoints(driverId: string, raceId: string) {
    return allResults.filter((x) => x.driver_id === driverId && x.race_id === raceId).reduce((s, r) => s + r.points, 0);
  }

  function getCaptainRaces(driverId: string): number[] {
    return mgrCaptains
      .filter((c) => c.driver_id === driverId)
      .map((c) => races.find((r) => r.id === c.race_id)?.round_number || 0)
      .sort((a, b) => a - b);
  }

  if (isLoading) {
    return (
      <PageLayout>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Indlæser...</p>
        </div>
      </PageLayout>
    );
  }

  if (!manager) {
    return (
      <PageLayout>
        <div className="container py-12 text-center space-y-4">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="font-display text-2xl font-bold text-foreground">Hold ikke fundet</h1>
          <p className="text-muted-foreground">Der findes intet hold med dette navn.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container py-6 space-y-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{manager.team_name}</h1>
            <p className="text-sm text-muted-foreground">Manager: {manager.name}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl font-bold text-foreground">{manager.total_points}</p>
            <p className="text-xs text-muted-foreground">point i alt</p>
            {myRank && myRank > 0 && (
              <p className="text-xs text-muted-foreground">#{myRank} af {allManagers.length}</p>
            )}
          </div>
        </div>

        {/* Drivers */}
        <div className="space-y-3">
          {myDrivers.map((d) => {
            const tier = TIER_BADGE[d.tier] || TIER_BADGE.bronze;
            const captainRounds = getCaptainRaces(d.id);
            return (
              <div key={d.id} className="rounded-lg border border-border bg-card p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-secondary font-display text-lg font-bold text-muted-foreground">
                    #{d.car_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display font-semibold text-foreground truncate">{d.name}</p>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${tier.className}`}>{tier.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{d.team}{d.club ? ` • ${d.club}` : ""}</p>
                    {captainRounds.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-gold text-[11px]">
                        <Crown className="h-3 w-3" />
                        <span>Captain i R{captainRounds.join(", R")}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-xl font-bold text-foreground">{getDriverPoints(d.id)}</p>
                    <p className="text-xs text-muted-foreground">point</p>
                  </div>
                </div>
                {races.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {races.map((race) => (
                      <div key={race.id} className="shrink-0 rounded bg-secondary px-2 py-1 text-center">
                        <p className="text-xs text-muted-foreground">R{race.round_number}</p>
                        <p className="font-display text-sm font-bold text-foreground">{getDriverRoundPoints(d.id, race.id)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Transfer History */}
        {myTransfers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display font-semibold text-foreground">Transfer-historik</h2>
            </div>
            <div className="space-y-1">
              {myTransfers.map((t) => {
                const oldD = drivers.find((d) => d.id === t.old_driver_id);
                const newD = drivers.find((d) => d.id === t.new_driver_id);
                return (
                  <div key={t.id} className="flex items-center justify-between rounded bg-secondary/50 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-destructive truncate">{oldD?.name}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-success truncate">{newD?.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`font-display font-bold ${t.is_free ? "text-success" : "text-destructive"}`}>
                        {t.is_free ? "Gratis" : `−${t.point_cost} pts`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString("da-DK")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
