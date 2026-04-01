import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { User, Users, Trophy } from "lucide-react";
import { fetchDrivers, fetchRaceResults, fetchRaces, fetchManagerDrivers, fetchManagers, SESSION_TYPES, type Driver } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import PageLayout from "@/components/PageLayout";
import { Badge } from "@/components/ui/badge";

const TIER_BADGE: Record<string, { label: string; className: string }> = {
  gold: { label: "Guld", className: "bg-gold/20 text-gold border-gold/40" },
  silver: { label: "Sølv", className: "bg-silver/20 text-silver border-silver/40" },
  bronze: { label: "Bronze", className: "bg-bronze/20 text-bronze border-bronze/40" },
};

const SESSION_SHORT: Record<string, string> = {
  qualifying: "T",
  heat1: "H1",
  heat2: "H2",
  heat3: "H3",
};

export default function DriverProfilePage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });
  const { data: allResults = [] } = useQuery({ queryKey: ["race_results"], queryFn: () => fetchRaceResults() });
  const { data: races = [] } = useQuery({ queryKey: ["races"], queryFn: fetchRaces });

  // Find driver by slug (car_number-name)
  const driver = drivers.find((d) => {
    const dSlug = `${d.car_number}-${d.name.toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    return dSlug === slug;
  });

  // Count how many managers currently have this driver
  const { data: ownerCount = 0 } = useQuery({
    queryKey: ["driver_owner_count", driver?.id],
    queryFn: async () => {
      if (!driver) return 0;
      const { count } = await supabase
        .from("manager_drivers")
        .select("*", { count: "exact", head: true })
        .eq("driver_id", driver.id);
      return count || 0;
    },
    enabled: !!driver,
  });

  if (!driver) {
    return (
      <PageLayout>
        <div className="container py-12 text-center space-y-4">
          <User className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="font-display text-2xl font-bold text-foreground">Kører ikke fundet</h1>
        </div>
      </PageLayout>
    );
  }

  const tier = TIER_BADGE[driver.tier] || TIER_BADGE.bronze;
  const driverResults = allResults.filter((r) => r.driver_id === driver.id);
  const totalPoints = driverResults.reduce((s, r) => s + r.points, 0);

  // Build per-race results table
  const raceData = races.map((race) => {
    const raceResults = driverResults.filter((r) => r.race_id === race.id);
    const sessions: Record<string, { points: number; position: number | null; dnf: boolean }> = {};
    raceResults.forEach((r) => {
      sessions[r.session_type] = { points: r.points, position: r.position, dnf: r.dnf };
    });
    const roundTotal = raceResults.reduce((s, r) => s + r.points, 0);
    return { race, sessions, roundTotal, hasResults: raceResults.length > 0 };
  });

  return (
    <PageLayout>
      <div className="container py-6 space-y-6 max-w-2xl">
        {/* Header */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <div className="flex items-start gap-4">
            {driver.photo_url ? (
              <img src={driver.photo_url} alt={driver.name} className="h-20 w-20 rounded-lg object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-secondary font-display text-2xl font-bold text-muted-foreground">
                #{driver.car_number}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-display text-2xl font-bold text-foreground">{driver.name}</h1>
                <Badge variant="outline" className={`${tier.className}`}>{tier.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">#{driver.car_number} • {driver.team}</p>
              {driver.club && <p className="text-xs text-muted-foreground">{driver.club}</p>}
              {driver.withdrawn && (
                <Badge variant="destructive" className="mt-1">Udgået</Badge>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="font-display text-3xl font-bold text-foreground">{totalPoints}</p>
              <p className="text-xs text-muted-foreground">point total</p>
            </div>
          </div>

          {driver.bio && (
            <p className="mt-3 text-sm text-muted-foreground">{driver.bio}</p>
          )}
          {driver.quote && (
            <p className="mt-2 text-sm italic text-muted-foreground border-l-2 border-accent/30 pl-3">"{driver.quote}"</p>
          )}

          <div className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Ejet af <strong className="text-foreground">{ownerCount}</strong> {ownerCount === 1 ? "hold" : "hold"}</span>
          </div>
        </div>

        {/* Season Results Table */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-gold" />
            <h2 className="font-display text-lg font-bold text-foreground">Sæsonresultater</h2>
          </div>

          {raceData.every((r) => !r.hasResults) ? (
            <p className="text-sm text-muted-foreground">Ingen resultater endnu.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-1.5 text-left font-medium">Runde</th>
                    {SESSION_TYPES.map((s) => (
                      <th key={s} className="py-1.5 text-center font-medium w-12">{SESSION_SHORT[s]}</th>
                    ))}
                    <th className="py-1.5 text-right font-medium w-14">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {raceData.map(({ race, sessions, roundTotal, hasResults }) => (
                    <tr key={race.id} className="border-b border-border/50">
                      <td className="py-1.5 text-foreground">
                        <span className="font-display font-bold text-muted-foreground">R{race.round_number}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{race.name}</span>
                      </td>
                      {SESSION_TYPES.map((s) => {
                        const session = sessions[s];
                        return (
                          <td key={s} className="py-1.5 text-center text-xs text-muted-foreground">
                            {session ? (
                              session.dnf ? <span className="text-destructive">DNF</span> : session.points
                            ) : (
                              <span className="text-border">–</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-1.5 text-right font-display font-bold text-foreground">
                        {hasResults ? roundTotal : <span className="text-border">–</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
