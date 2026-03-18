import { useQuery } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { fetchRaces, fetchRaceResults, fetchDrivers, SESSION_TYPES, SESSION_LABELS } from "@/lib/api";
import PageLayout from "@/components/PageLayout";

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

          return (
            <div key={race.id} className="rounded-lg border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <Flag className="h-4 w-4 text-racing-red" />
                <h2 className="font-display text-lg font-bold text-foreground">
                  Runde {race.round_number}: {race.name}
                </h2>
              </div>
              {race.location && <p className="text-xs text-muted-foreground mb-3">{race.location}</p>}

              {SESSION_TYPES.map((session) => {
                const sessionResults = raceResults
                  .filter((r) => r.session_type === session)
                  .sort((a, b) => (a.position || 99) - (b.position || 99));

                if (sessionResults.length === 0) return null;

                return (
                  <div key={session} className="mb-4 last:mb-0">
                    <h3 className="font-display text-sm font-semibold text-muted-foreground mb-2">
                      {SESSION_LABELS[session]}
                    </h3>
                    <div className="space-y-1">
                      <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-2 py-1">
                        <span className="col-span-1">Pos</span>
                        <span className="col-span-1">#</span>
                        <span className="col-span-7">Kører</span>
                        <span className="col-span-3 text-right">Point</span>
                      </div>
                      {sessionResults.map((r) => (
                        <div key={r.id} className="grid grid-cols-12 gap-2 items-center rounded bg-secondary/50 px-2 py-1.5 text-sm">
                          <span className="col-span-1 font-display font-bold text-foreground">
                            {r.dnf ? "DNF" : r.position || "-"}
                          </span>
                          <span className="col-span-1 text-muted-foreground">#{driverNumber(r.driver_id)}</span>
                          <span className="col-span-7 font-medium text-foreground truncate">{driverName(r.driver_id)}</span>
                          <span className="col-span-3 text-right font-display font-bold text-foreground">{r.points}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </PageLayout>
  );
}
