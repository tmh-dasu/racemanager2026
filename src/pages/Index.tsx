import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Trophy, Clock, ChevronRight, Flag } from "lucide-react";
import { fetchManagers, fetchRaces, fetchSettings } from "@/lib/api";
import PageLayout from "@/components/PageLayout";

function CountdownTimer({ raceDate }: { raceDate: string }) {
  const target = new Date(raceDate);
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return <span className="text-muted-foreground">Løb afsluttet</span>;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center rounded-md bg-secondary px-3 py-2">
        <span className="font-display text-2xl font-bold text-foreground">{days}</span>
        <span className="text-xs text-muted-foreground">dage</span>
      </div>
      <div className="flex flex-col items-center rounded-md bg-secondary px-3 py-2">
        <span className="font-display text-2xl font-bold text-foreground">{hours}</span>
        <span className="text-xs text-muted-foreground">timer</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { data: managers = [] } = useQuery({ queryKey: ["managers"], queryFn: fetchManagers });
  const { data: races = [] } = useQuery({ queryKey: ["races"], queryFn: fetchRaces });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const nextRace = races.find((r) => r.race_date && new Date(r.race_date) > new Date());
  const top5 = managers.slice(0, 5);
  const registrationOpen = settings?.team_registration_open ?? false;

  return (
    <PageLayout>
      <div className="container py-6 space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-lg border border-border bg-card p-6 shadow-card animate-slide-up">
          <div
            className="absolute inset-0 opacity-40"
            style={{ backgroundImage: "url('/images/hero-bg.avif')", backgroundPosition: "right 30%", backgroundSize: "150%", backgroundRepeat: "no-repeat" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card from-20% via-card/60 via-50% to-transparent" />
          <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <img src="/images/dasu-logo.png" alt="DASU" className="h-12 w-auto" />
            <img src="/images/supergt-logo.png" alt="Super GT Danmark" className="h-12 w-auto" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            DASU <span className="text-gradient-racing">Race Manager</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Super GT Fantasy Racing – Dansk Automobil Sports Union
          </p>

          {registrationOpen && (
            <Link
              to="/vaelg-hold"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-gradient-racing px-5 py-2.5 font-display text-sm font-semibold text-primary-foreground shadow-racing transition-transform hover:scale-105"
            >
              <Flag className="h-4 w-4" />
              Vælg dit hold
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
          {!registrationOpen && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-muted px-5 py-2.5 text-sm text-muted-foreground">
              Holdregistrering lukket
            </div>
          )}
          </div>
        </div>

        {/* Next Race */}
        {nextRace && (
          <div className="rounded-lg border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Næste løb</span>
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Runde {nextRace.round_number}: {nextRace.name}
            </h2>
            {nextRace.location && <p className="text-sm text-muted-foreground">{nextRace.location}</p>}
            {nextRace.race_date && (
              <div className="mt-3">
                <CountdownTimer raceDate={nextRace.race_date} />
              </div>
            )}
          </div>
        )}

        {/* Leaderboard Preview */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-gold" />
              <span className="font-display text-lg font-bold text-foreground">Top 5</span>
            </div>
            <Link to="/rangering" className="text-xs text-accent hover:underline">
              Se alle →
            </Link>
          </div>
          {top5.length === 0 && (
            <p className="text-sm text-muted-foreground">Ingen hold tilmeldt endnu.</p>
          )}
          <div className="space-y-2">
            {top5.map((m, i) => (
              <div key={m.id} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className={`font-display text-lg font-bold ${i === 0 ? "text-gold" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-racing-red" : "text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.team_name}</p>
                    <p className="text-xs text-muted-foreground">{m.name}</p>
                  </div>
                </div>
                <span className="font-display text-lg font-bold text-foreground">{m.total_points}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
