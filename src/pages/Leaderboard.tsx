import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchManagers, fetchManagerDrivers, fetchDrivers, fetchRaceResults, type Manager, type Driver } from "@/lib/api";
import PageLayout from "@/components/PageLayout";

function ExpandableTeam({ manager, rank, allResults, allDrivers }: { manager: Manager; rank: number; allResults: any[]; allDrivers: Driver[] }) {
  const [open, setOpen] = useState(false);
  const { data: managerDrivers } = useQuery({
    queryKey: ["manager_drivers", manager.id],
    queryFn: () => fetchManagerDrivers(manager.id),
    enabled: open,
  });

  const teamDrivers = managerDrivers
    ? allDrivers.filter((d) => managerDrivers.some((md) => md.driver_id === d.id))
    : [];

  function getDriverPoints(driverId: string) {
    return allResults.filter((r) => r.driver_id === driverId).reduce((s, r) => s + r.points, 0);
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 rounded-lg border p-3 shadow-card transition text-left ${
          rank === 0 ? "border-gold/30 bg-gold/5" : rank === 1 ? "border-silver/30 bg-silver/5" : rank === 2 ? "border-bronze/30 bg-bronze/5" : "border-border bg-card"
        } hover:bg-accent/50`}
      >
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${
          rank === 0 ? "bg-gold text-gold-foreground" : rank === 1 ? "bg-silver text-silver-foreground" : rank === 2 ? "bg-bronze text-bronze-foreground" : "bg-secondary text-muted-foreground"
        }`}>
          {rank + 1}
        </span>
        <div className="flex-1 min-w-0">
          <Link to={`/hold/${manager.slug}`} className="hover:underline">
            <p className="font-display font-semibold text-foreground truncate">{manager.team_name}</p>
          </Link>
          <p className="text-xs text-muted-foreground truncate">{manager.name}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!manager.joker_used ? (
            <span title="Joker tilgængelig"><Zap className="h-4 w-4 text-success" /></span>
          ) : (
            <span title="Joker brugt"><Zap className="h-4 w-4 text-muted-foreground" /></span>
          )}
          <span className="font-display text-xl font-bold text-foreground">{manager.total_points}</span>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="ml-11 mt-1 mb-1 space-y-1">
          {teamDrivers.length > 0 ? teamDrivers.map((d) => (
            <div key={d.id} className="flex items-center gap-2 rounded bg-secondary/50 px-3 py-1.5 text-sm">
              <span className="font-display font-bold text-muted-foreground">#{d.car_number}</span>
              <span className="text-foreground flex-1">{d.name}</span>
              <span className="font-display font-bold text-foreground">{getDriverPoints(d.id)} pts</span>
            </div>
          )) : (
            <div className="rounded bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground">Henter kørere…</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const { data: managers = [] } = useQuery({ queryKey: ["managers"], queryFn: fetchManagers });
  const { data: allResults = [] } = useQuery({ queryKey: ["race_results"], queryFn: () => fetchRaceResults() });
  const { data: allDrivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });

  return (
    <PageLayout>
      <div className="container py-6 space-y-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Leaderboard</h1>

        {managers.length === 0 && (
          <p className="text-muted-foreground">Ingen hold tilmeldt endnu.</p>
        )}

        <div className="space-y-2">
          {managers.map((m, i) => (
            <ExpandableTeam key={m.id} manager={m} rank={i} allResults={allResults} allDrivers={allDrivers} />
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
