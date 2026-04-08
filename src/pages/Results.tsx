import { useQuery } from "@tanstack/react-query";
import { Flag, Trophy, Crown } from "lucide-react";
import { fetchRaces, fetchRaceResults, fetchDrivers, fetchAllCaptainSelections, fetchManagers, fetchManagerDrivers, SESSION_TYPES, applyDropWorst, type RaceResult, type CaptainSelection } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const { data: captainSelections = [] } = useQuery({ queryKey: ["all_captain_selections"], queryFn: fetchAllCaptainSelections });

  function driverName(id: string) {
    return drivers.find((d) => d.id === id)?.name || "Ukendt";
  }

  function driverNumber(id: string) {
    return drivers.find((d) => d.id === id)?.car_number || 0;
  }

  function driverTeam(id: string) {
    return drivers.find((d) => d.id === id)?.team || "";
  }

  // Count how many managers have this driver as captain for a given race
  function captainCount(driverId: string, raceId: string): number {
    return captainSelections.filter((c) => c.driver_id === driverId && c.race_id === raceId).length;
  }

  // Build driver championship standings
  const driverStandings = (() => {
    const pointsByDriver = new Map<string, { perRound: Map<string, number>; allSession: number[] }>();

    allResults.forEach((r) => {
      if (!pointsByDriver.has(r.driver_id)) {
        pointsByDriver.set(r.driver_id, { perRound: new Map(), allSession: [] });
      }
      const entry = pointsByDriver.get(r.driver_id)!;
      entry.perRound.set(r.race_id, (entry.perRound.get(r.race_id) || 0) + r.points);
      entry.allSession.push(r.points);
    });

    const racesWithResults = new Set(allResults.map(r => r.race_id));
    const completedRounds = racesWithResults.size;

    return Array.from(pointsByDriver.entries())
      .map(([driverId, { perRound, allSession }]) => {
        const grossTotal = allSession.reduce((s, p) => s + p, 0);
        const { total: netTotal, dropCount } = applyDropWorst(allSession, completedRounds);
        return { driverId, grossTotal, netTotal, dropCount, perRound };
      })
      .sort((a, b) => b.netTotal - a.netTotal);
  })();

  return (
    <PageLayout>
      <div className="container py-6 space-y-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Løbsresultater</h1>

        <Tabs defaultValue="results">
          <TabsList className="bg-secondary border-border mb-4">
            <TabsTrigger value="results" className="font-display">Resultater</TabsTrigger>
            <TabsTrigger value="championship" className="font-display">Mesterskab</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-6">
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

              const driverMap = new Map<string, Record<string, RaceResult>>();
              raceResults.forEach((r) => {
                if (!driverMap.has(r.driver_id)) driverMap.set(r.driver_id, {});
                driverMap.get(r.driver_id)![r.session_type] = r;
              });

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

                  <div className="grid gap-1 text-xs text-muted-foreground px-2 py-1" style={{ gridTemplateColumns: "1.5rem 1fr repeat(4, 1.5rem) 2.5rem 1.5rem" }}>
                    <span>#</span>
                    <span>Kører</span>
                    {SESSION_TYPES.map((s) => (
                      <span key={s} className="text-center">{SESSION_SHORT[s]}</span>
                    ))}
                    <span className="text-right">Tot</span>
                    <span></span>
                  </div>

                  <div className="space-y-1">
                    {driverSummaries.map(({ driverId, sessions, total }, idx) => {
                      const cc = captainCount(driverId, race.id);
                      return (
                        <div key={driverId} className="grid gap-1 items-center rounded bg-secondary/50 px-2 py-1.5 text-sm" style={{ gridTemplateColumns: "1.5rem 1fr repeat(4, 1.5rem) 2.5rem 1.5rem" }}>
                          <span className="text-[10px] text-muted-foreground font-display">{idx + 1}</span>
                          <span className="font-medium text-foreground truncate text-xs">{driverName(driverId)}</span>
                          {SESSION_TYPES.map((s) => {
                            const r = sessions[s];
                            return (
                              <span key={s} className="text-center text-[11px] text-muted-foreground" title={r ? (r.dnf ? "DNF" : `P${r.position}`) : "–"}>
                                {r ? (r.dnf ? <span className="text-destructive">0</span> : r.points) : <span className="text-border">–</span>}
                              </span>
                            );
                          })}
                          <span className="text-right font-display font-bold text-foreground text-xs">{total}</span>
                          <span className="text-center" title={cc > 0 ? `Captain for ${cc} hold` : ""}>
                            {cc > 0 && <Crown className="h-3 w-3 text-gold inline-block" />}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="championship" className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-gold" />
                <h2 className="font-display text-lg font-bold text-foreground">Kørermesterskab</h2>
              </div>

              {driverStandings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ingen resultater endnu.</p>
              ) : (
                <>
                  {/* Header */}
                  <div className="grid gap-1 text-xs text-muted-foreground px-2 py-1" style={{ gridTemplateColumns: `2rem 1fr ${races.map(() => "3rem").join(" ")} 3.5rem` }}>
                    <span>Pos</span>
                    <span>Kører</span>
                    {races.map((r) => (
                      <span key={r.id} className="text-center">R{r.round_number}</span>
                    ))}
                    <span className="text-right font-semibold">Total</span>
                  </div>

                  {/* Rows */}
                  <div className="space-y-1">
                    {driverStandings.map(({ driverId, perRound, grossTotal, netTotal }, i) => (
                      <div
                        key={driverId}
                        className={`grid gap-1 items-center rounded px-2 py-1.5 text-sm ${
                          i === 0 ? "bg-gold/10 border border-gold/20" : i === 1 ? "bg-secondary/70" : i === 2 ? "bg-racing-red/5" : "bg-secondary/50"
                        }`}
                        style={{ gridTemplateColumns: `2rem 1fr ${races.map(() => "3rem").join(" ")} 3.5rem 3.5rem` }}
                      >
                        <span className={`font-display font-bold ${i === 0 ? "text-gold" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-racing-red" : "text-muted-foreground"}`}>
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="font-medium text-foreground truncate block">{driverName(driverId)}</span>
                          <span className="text-xs text-muted-foreground truncate block">{driverTeam(driverId)}</span>
                        </div>
                        {races.map((race) => {
                          const roundPts = perRound.get(race.id);
                          const cc = captainCount(driverId, race.id);
                          return (
                            <span key={race.id} className="text-center text-xs text-muted-foreground">
                              {roundPts !== undefined ? (
                                <span className="inline-flex items-center gap-0.5">
                                  {cc > 0 && <Crown className="h-2.5 w-2.5 text-gold inline-block" />}
                                  {roundPts}
                                </span>
                              ) : <span className="text-border">–</span>}
                            </span>
                          );
                        })}
                        <span className="text-right text-xs text-muted-foreground">{grossTotal}</span>
                        <span className="text-right font-display font-bold text-foreground">{netTotal}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground mt-3">
                    * Netto = brutto minus de {driverStandings[0]?.dropCount || 0} dårligste enkeltresultater
                  </p>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
