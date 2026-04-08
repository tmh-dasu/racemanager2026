import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Trophy, Clock, ChevronRight, Flag, ArrowLeftRight, HelpCircle, Gift, MapPin, ExternalLink } from "lucide-react";
import { fetchManagers, fetchRaces, fetchSettings, fetchPublishedPredictionQuestions, fetchSponsors, fetchPrizes, type Prize } from "@/lib/api";
import PageLayout from "@/components/PageLayout";

function CountdownTimer({ deadline, label }: { deadline: string; label: string }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const target = new Date(deadline);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return <span className="text-xs text-muted-foreground">{label}: Lukket</span>;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <div className="flex gap-1">
        {days > 0 && (
          <span className="rounded bg-secondary px-1.5 py-0.5 font-display text-xs font-bold text-foreground">{days}d</span>
        )}
        <span className="rounded bg-secondary px-1.5 py-0.5 font-display text-xs font-bold text-foreground">{hours}t</span>
        <span className="rounded bg-secondary px-1.5 py-0.5 font-display text-xs font-bold text-foreground">{mins}m</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { data: managers = [] } = useQuery({ queryKey: ["managers"], queryFn: fetchManagers });
  const { data: races = [] } = useQuery({ queryKey: ["races"], queryFn: fetchRaces });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const { data: predictionQuestions = [] } = useQuery({ queryKey: ["prediction_questions_published"], queryFn: fetchPublishedPredictionQuestions });
  const { data: sponsors = [] } = useQuery({ queryKey: ["sponsors"], queryFn: fetchSponsors });

  const now = new Date();
  const nextRace = races.find((r) => r.race_date && new Date(r.race_date) > now);
  const top5 = managers.slice(0, 5);
  const registrationOpen = settings?.team_registration_open ?? false;

  // Check if predictions are open for next race
  const nextRacePredictions = nextRace
    ? predictionQuestions.filter((q) => q.race_id === nextRace.id)
    : [];
  const hasOpenPredictions = nextRacePredictions.some((q) => {
    const deadline = q.prediction_deadline ? new Date(q.prediction_deadline) : null;
    return deadline ? now < deadline : true;
  });

  return (
    <PageLayout>
      <div className="container py-6 space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-lg border border-border bg-card p-6 shadow-card animate-slide-up">
          <div
            className="absolute inset-0 bg-cover opacity-40"
            style={{ backgroundImage: "url('/images/hero-bg.avif')", backgroundPosition: "right center" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card from-20% via-card/60 via-50% to-transparent" />
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <img src="/images/dasu-logo.png" alt="DASU" className="h-12 w-auto" />
              <img src="/images/supergt-logo.png" alt="Super GT Danmark" className="h-12 w-auto" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              DASU <span className="text-gradient-racing">RaceManager</span>
            </h1>
            <p className="mt-2 text-muted-foreground">Super GT Fantasy Racing – Dansk Automobil Sports Union</p>

            {registrationOpen && (
              <Link
                to="/betal"
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

        {/* Next Race Status */}
        {nextRace && (
          <div className="rounded-lg border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Næste arrangement</span>
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Runde {nextRace.round_number}: {nextRace.name}
            </h2>
            {nextRace.location && <p className="text-sm text-muted-foreground">{nextRace.location}</p>}
            {nextRace.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextRace.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
              >
                <MapPin className="h-3 w-3 text-racing-red" />
                {nextRace.address}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}

            <div className="mt-3 space-y-2">
              {nextRace.race_date && (
                <CountdownTimer deadline={nextRace.race_date} label="Arrangementet starter om" />
              )}
              {nextRace.race_date && (
                <CountdownTimer deadline={new Date(new Date(nextRace.race_date).getTime() - 24 * 60 * 60 * 1000).toISOString()} label="Holdkaptajn/transfer deadline" />
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {/* External links */}
              {nextRace.links && nextRace.links.length > 0 && nextRace.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  {link.label}
                </a>
              ))}

              {/* Transfer window */}
              <div className="flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs">
                <ArrowLeftRight className="h-3 w-3" />
                <span className={settings?.transfer_window_open ? "text-success" : "text-muted-foreground"}>
                  Transfer {settings?.transfer_window_open ? "åbent" : "lukket"}
                </span>
              </div>

              {/* Predictions */}
              <Link to="/predictions" className="flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs hover:bg-secondary/80 transition-colors">
                <HelpCircle className="h-3 w-3" />
                <span className={hasOpenPredictions ? "text-gold" : "text-muted-foreground"}>
                  Predictions {hasOpenPredictions ? "åbne" : nextRacePredictions.length > 0 ? "lukket" : "ingen"}
                </span>
              </Link>
            </div>
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
          {top5.length === 0 && <p className="text-sm text-muted-foreground">Ingen hold tilmeldt endnu.</p>}
          <div className="space-y-2">
            {top5.map((m, i) => (
              <Link key={m.id} to={`/hold/${m.slug}`} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2 hover:bg-secondary/80 transition-colors">
                <div className="flex items-center gap-3">
                  <span
                    className={`font-display text-lg font-bold ${i === 0 ? "text-gold" : i === 1 ? "text-silver" : i === 2 ? "text-bronze" : "text-muted-foreground"}`}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.team_name}</p>
                    <p className="text-xs text-muted-foreground">{m.name}</p>
                  </div>
                </div>
                <span className="font-display text-lg font-bold text-foreground">{m.total_points}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Sponsor Card */}
        {sponsors.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-gold" />
              <span className="font-display text-lg font-bold text-foreground">Præmiesponsorer</span>
              <Gift className="h-4 w-4 text-gold" />
            </div>
            <div className="space-y-0">
              {sponsors.map((sponsor, idx) => (
                <div key={sponsor.id}>
                  {idx > 0 && <div className="h-px bg-racing-red my-4" />}
                  <a
                    href={sponsor.website_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:opacity-80 transition-opacity"
                  >
                    {sponsor.logo_url && (
                      <div className="flex justify-center mb-3">
                        <img
                          src={sponsor.logo_url}
                          alt={sponsor.name}
                          className="h-16 w-auto object-contain"
                        />
                      </div>
                    )}
                    <h3 className="text-center font-display text-lg font-bold text-foreground">{sponsor.name}</h3>
                    {sponsor.tagline && (
                      <p className="text-center text-sm text-muted-foreground mt-1">{sponsor.tagline}</p>
                    )}
                  </a>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4 border-t border-border pt-3">
              Vinderens præmie leveres af {sponsors.map(s => s.name).join(" & ")}
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
