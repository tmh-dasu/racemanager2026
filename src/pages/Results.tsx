import { useQuery } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { fetchRaces, fetchRaceResults, fetchDrivers, SESSION_TYPES, SESSION_LABELS, type RaceResult } from "@/lib/api";
import PageLayout from "@/components/PageLayout";

const SESSION_SHORT: Record<string, string> = {
  qualifying: "T",
  heat1: "H1",
  heat2: "H2",
  heat3: "H3",
};

export default function ResultsPage() {
  const { data: races = [] } = useQuery({ queryKey: ["races"], queryFn: fetchRaces });
  const { data: allResults = [] } = useQuery({ queryKey: ["race_results"], queryFn: () => fetchRaceResults() });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });

  function driverName(id: string) {
    return drivers.find((d) => d.id === id)?.name || "Ukendt";
  }

  function driverNumber(id: string) {
    return drivers.find((d) => d.id === id)?.car_number || 0;
  }

  return (
    <PageLayout>
      <div className="container py-6 space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Løbsresultater</h1>

        {races.length === 0 && (
          <p className="text-muted-foreground">Ingen løb registreret endnu.</p>
        )}

        {races.map((race) => {
          const raceResults = allResults.filter((r) => r.race_id === race.id);
          if (raceResults.length === 0) return (
            <div key={race.id} className="rounded-lg border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <Flag className="h-4 w-4 text-racing-red" />
                <h2 className="font-display text-lg font-bold text-foreground">
                  Runde {race.round_number}: {race.name}
                </h2>
              </div>
              {race.location && <p className="text-xs text-muted-foreground mb-3">{race.location}</p>}
              <p className="text-sm text-muted-foreground">Ingen resultater endnu</p>
            </div>
          );

          // Build per-driver summary with points per session
          const driverMap = new Map<string, Record<string, RaceResult>>();
          raceResults.forEach((r) => {
            if (!driverMap.has(r.driver_id)) driverMap.set(r.driver_id, {});
            driverMap.get(r.driver_id)![r.session_type] = r;
          });

          // Sort drivers by total points descending
          const driverSummaries = Array.from(driverMap.entries()).map(([driverId, sessions]) => {
            const total = Object.values(sessions).reduce((sum, r) => sum + r.points, 0);
            return { driverId, sessions, total };
          }).sort((a, b) => b.total - a.total);

          return (
            <div key={race.id} className="rounded-lg border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <Flag className="h-4 w-4 text-racing-red" />
                <h2 className="font-display text-lg font-bold text-foreground">
                  Runde {race.round_number}: {race.name}
                </h2>
              </div>
              {race.location && <p className="text-xs text-muted-foreground mb-3">{race.location}</p>}

              {/* Header */}
              <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground px-2 py-1">
                <span className="col-span-1">#</span>
                <span className="col-span-3">Kører</span>
                {SESSION_TYPES.map((s) => (
                  <span key={s} className="col-span-1 text-center">{SESSION_SHORT[s]}</span>
                ))}
                <span className="col-span-4 text-right">Total</span>
              </div>

              {/* Rows */}
              <div className="space-y-1">
                {driverSummaries.map(({ driverId, sessions, total }) => (
                  <div key={driverId} className="grid grid-cols-12 gap-1 items-center rounded bg-secondary/50 px-2 py-1.5 text-sm">
                    <span className="col-span-1 text-muted-foreground font-display">#{driverNumber(driverId)}</span>
                    <span className="col-span-3 font-medium text-foreground truncate">{driverName(driverId)}</span>
                    {SESSION_TYPES.map((s) => {
                      const r = sessions[s];
                      return (
                        <span key={s} className="col-span-1 text-center text-xs text-muted-foreground" title={r ? (r.dnf ? "DNF" : `P${r.position}`) : "–"}>
                          {r ? (r.dnf ? <span className="text-destructive">0</span> : r.points) : <span className="text-border">–</span>}
                        </span>
                      );
                    })}
                    <span className="col-span-4 text-right font-display font-bold text-foreground">{total}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </PageLayout>
  );
}
