import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Trophy, Clock, ChevronRight, Flag, ArrowLeftRight, HelpCircle, Gift, MapPin, ExternalLink, Award } from "lucide-react";
import { fetchManagers, fetchRaces, fetchSettings, fetchPublishedPredictionQuestions, fetchSponsors, fetchPrizes, fetchRaceResults, fetchAllCaptainSelections, fetchPredictionQuestions, computeTransferDeadline, type Prize } from "@/lib/api";
import PageLayout from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import dslLogo from "@/assets/dsl-logo.png";

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
  const { data: prizes = [] } = useQuery({ queryKey: ["prizes"], queryFn: fetchPrizes });
  const { data: allResults = [] } = useQuery({ queryKey: ["race_results"], queryFn: () => fetchRaceResults() });
  const { data: allCaptains = [] } = useQuery({ queryKey: ["all_captain_selections"], queryFn: fetchAllCaptainSelections });
  const { data: allMDs = [] } = useQuery({
    queryKey: ["all_manager_drivers_public"],
    queryFn: async () => {
      const { data } = await supabase.from("manager_drivers").select("manager_id, driver_id");
      return (data || []) as { manager_id: string; driver_id: string }[];
    },
  });
  const { data: allPredAnswers = [] } = useQuery({
    queryKey: ["all_prediction_answers_public"],
    queryFn: async () => {
      const { data } = await supabase.from("prediction_answers").select("manager_id, question_id, is_correct");
      return (data || []) as { manager_id: string; question_id: string; is_correct: boolean | null }[];
    },
  });
  const { data: allQuestions = [] } = useQuery({ queryKey: ["prediction_questions_all"], queryFn: fetchPredictionQuestions });

  const now = new Date();
  const nextRace = races.find((r) => r.race_date && new Date(r.race_date) > now);
  const top5 = managers.slice(0, 5);

  const transferDeadline = computeTransferDeadline(races, now);
  const deadlinePassed = transferDeadline ? now >= transferDeadline : true;
  const scoredRaceIds = new Set(allResults.map((r) => r.race_id));
  const awaitingResults = races.some((r) => {
    if (!r.race_date) return false;
    const end = new Date(r.race_end_date || r.race_date);
    return end <= now && !scoredRaceIds.has(r.id);
  });
  const transfersOpen = (settings?.transfer_window_open ?? false) && !deadlinePassed && !awaitingResults;
  const transferLabel = transfersOpen
    ? "Transfer åbent"
    : awaitingResults
      ? "Transfer låst (afventer resultater)"
      : deadlinePassed && settings?.transfer_window_open
        ? "Transfer lukket (deadline passeret)"
        : "Transfer lukket";
  const registrationOpen = settings?.team_registration_open ?? false;

  // Check if predictions are open for next race
  const nextRacePredictions = nextRace
    ? predictionQuestions.filter((q) => q.race_id === nextRace.id)
    : [];
  const predictionDeadline = nextRacePredictions.length > 0
    ? nextRacePredictions.reduce<string | null>((earliest, q) => {
        const dl = q.prediction_deadline || (nextRace?.race_date ? new Date(new Date(nextRace.race_date).getTime() - 60 * 60 * 1000).toISOString() : null);
        if (!dl) return earliest;
        if (!earliest) return dl;
        return new Date(dl) < new Date(earliest) ? dl : earliest;
      }, null)
    : null;
  const hasOpenPredictions = predictionDeadline ? now < new Date(predictionDeadline) : false;

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
              <img src={dslLogo} alt="DEKRA Danish Supercar League" className="ml-auto h-16 w-auto" />
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
                <CountdownTimer deadline={new Date(new Date(nextRace.race_date).getTime() - 60 * 60 * 1000).toISOString()} label="Holdkaptajn/transfer deadline" />
              )}
              {predictionDeadline && nextRacePredictions.length > 0 && (
                <CountdownTimer deadline={predictionDeadline} label="Predictions lukker om" />
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
                <span className={transfersOpen ? "text-success" : "text-muted-foreground"}>
                  {transferLabel}
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

        {/* Prizes & Sponsors combined */}
        {(prizes.length > 0 || sponsors.length > 0) && (() => {
          const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Trophy }> = {
            season: { label: "Sæsonpræmier", icon: Trophy },
            round: { label: "Afdelingspræmier", icon: Award },
            other: { label: "Øvrige præmier", icon: Gift },
          };
          const managerMap = Object.fromEntries(managers.map((m) => [m.id, m]));
          const grouped = prizes.reduce<Record<string, Prize[]>>((acc, p) => {
            const cat = p.prize_category || "round";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(p);
            return acc;
          }, {});

          // Group sponsors by category
          const sponsorsByCategory = sponsors.reduce<Record<string, typeof sponsors>>((acc, s: any) => {
            const cat = s.prize_category || "round";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(s);
            return acc;
          }, {});

          return (
            <div className="rounded-lg border border-border bg-card p-5 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-gold" />
                <span className="font-display text-lg font-bold text-foreground">Præmier & Sponsorer</span>
                <Gift className="h-4 w-4 text-gold" />
              </div>

              {/* Winners list - shown when prizes have been drawn */}
              {(() => {
                const wonPrizes = prizes.filter((p) => p.winner_manager_id && p.drawn_at);

                // Compute round top scorer for each completed round (afdelingspræmie)
                const racesWithResults = races
                  .filter((race) => allResults.some((r) => r.race_id === race.id))
                  .sort((a, b) => b.round_number - a.round_number);

                type RoundWinner = {
                  key: string;
                  prizeName: string;
                  category: "round";
                  drawnAt: string;
                  managerId: string | null;
                  total: number;
                };

                const roundWinners: RoundWinner[] = racesWithResults.map((race) => {
                  const raceQuestionIds = new Set(
                    allQuestions.filter((q) => q.race_id === race.id).map((q) => q.id)
                  );
                  let best: { managerId: string; total: number } | null = null;
                  managers.forEach((mgr) => {
                    const driverIds = allMDs
                      .filter((md) => md.manager_id === mgr.id)
                      .map((md) => md.driver_id);
                    const racePoints = allResults
                      .filter((r) => r.race_id === race.id && driverIds.includes(r.driver_id))
                      .reduce((s, r) => s + r.points, 0);
                    const captainSel = allCaptains.find(
                      (c) => c.manager_id === mgr.id && c.race_id === race.id
                    );
                    let captainBonus = 0;
                    if (captainSel) {
                      captainBonus = allResults
                        .filter((r) => r.race_id === race.id && r.driver_id === captainSel.driver_id)
                        .reduce((s, r) => s + r.points, 0);
                    }
                    const predictionPoints =
                      allPredAnswers.filter(
                        (a) =>
                          a.manager_id === mgr.id &&
                          raceQuestionIds.has(a.question_id) &&
                          a.is_correct === true
                      ).length * 5;
                    const total = racePoints + captainBonus + predictionPoints;
                    if (!best || total > best.total) best = { managerId: mgr.id, total };
                  });
                  return {
                    key: `round-top-${race.id}`,
                    prizeName: `Vinder af ${race.round_number}. afdeling`,
                    category: "round" as const,
                    drawnAt: race.race_date || new Date().toISOString(),
                    managerId: best ? (best as { managerId: string; total: number }).managerId : null,
                    total: best ? (best as { managerId: string; total: number }).total : 0,
                  };
                }).filter((w) => w.managerId !== null && w.total > 0);

                if (wonPrizes.length === 0 && roundWinners.length === 0) return null;

                const lotteryWinners = wonPrizes.map((p) => ({
                  key: p.id,
                  prizeName: p.name,
                  category: (p.prize_category || "round") as "season" | "round" | "other",
                  drawnAt: p.drawn_at!,
                  managerId: p.winner_manager_id,
                  total: null as number | null,
                }));

                const sortedWinners = [...lotteryWinners, ...roundWinners].sort(
                  (a, b) => new Date(b.drawnAt).getTime() - new Date(a.drawnAt).getTime()
                );
                return (
                  <div className="mb-5 rounded-md border border-gold/30 bg-gold/5 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Trophy className="h-4 w-4 text-gold" />
                      <span className="text-sm font-semibold text-foreground">Vindere</span>
                    </div>
                    <div className="space-y-1.5">
                      {sortedWinners.map((p) => {
                        const winner = p.managerId ? managerMap[p.managerId] : null;
                        const catLabel = CATEGORY_CONFIG[p.category]?.label || "Præmie";
                        return (
                          <div key={p.key} className="flex items-start justify-between gap-2 text-xs">
                            <div className="min-w-0 flex-1">
                              <span className="font-medium text-foreground">{p.prizeName}</span>
                              <span className="text-muted-foreground"> · {catLabel}</span>
                              {p.total !== null && (
                                <span className="text-muted-foreground"> · {p.total} point</span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              {winner ? (
                                <Link
                                  to={`/hold/${winner.slug}`}
                                  className="font-display font-bold text-gold hover:underline"
                                >
                                  {winner.team_name}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">Ukendt</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {(["season", "round", "other"] as const).map((cat) => {
                const catSponsors = sponsorsByCategory[cat] || [];
                const catPrizes = grouped[cat] || [];
                if (catSponsors.length === 0 && catPrizes.length === 0) return null;
                const config = CATEGORY_CONFIG[cat];
                const Icon = config.icon;
                return (
                  <div key={cat} className="mb-4 last:mb-0 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-racing-red [&:not(:first-child)]:pt-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">{config.label}</span>
                    </div>

                    {/* Sponsors in this category */}
                    {catSponsors.map((sponsor: any, idx: number) => (
                      <div key={sponsor.id}>
                        {idx > 0 && <div className="h-px bg-racing-red my-3" />}
                        <a
                          href={sponsor.website_url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block hover:opacity-80 transition-opacity"
                        >
                          {sponsor.logo_url && (
                            <div className="flex justify-center mb-2">
                              <img src={sponsor.logo_url} alt={sponsor.name} className="h-16 w-auto object-contain" />
                            </div>
                          )}
                          <h3 className="text-center font-display text-base font-bold text-foreground">
                            {sponsor.prize_placement ? `${sponsor.prize_placement}. præmie – ` : ""}{sponsor.name}
                          </h3>
                          {sponsor.tagline && (
                            <p className="text-center text-sm text-muted-foreground mt-1">{sponsor.tagline}</p>
                          )}
                          {sponsor.prize_description && (
                            <p className="text-center text-xs text-muted-foreground mt-1 whitespace-pre-line">{sponsor.prize_description}</p>
                          )}
                        </a>
                      </div>
                    ))}

                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </PageLayout>
  );
}