import { useQuery } from "@tanstack/react-query";
import { Trophy, Crown } from "lucide-react";
import { fetchRaces, fetchManagers, fetchRaceResults, fetchAllCaptainSelections, fetchPredictionQuestions, type Race } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

interface ManagerRoundScore {
  managerId: string;
  managerName: string;
  teamName: string;
  racePoints: number;
  captainBonus: number;
  predictionPoints: number;
  total: number;
}

export default function RoundTopManagers() {
  const { data: races = [] } = useQuery({ queryKey: ["races"], queryFn: fetchRaces });
  const { data: managers = [] } = useQuery({ queryKey: ["managers_admin"], queryFn: async () => {
    const { data } = await supabase.from("managers").select("id, name, team_name");
    return (data || []) as { id: string; name: string; team_name: string }[];
  }});
  const { data: allResults = [] } = useQuery({ queryKey: ["race_results"], queryFn: () => fetchRaceResults() });
  const { data: allCaptains = [] } = useQuery({ queryKey: ["all_captain_selections"], queryFn: fetchAllCaptainSelections });
  const { data: allMDs = [] } = useQuery({ queryKey: ["all_manager_drivers"], queryFn: async () => {
    const { data } = await supabase.from("manager_drivers").select("manager_id, driver_id");
    return (data || []) as { manager_id: string; driver_id: string }[];
  }});
  const { data: allPredAnswers = [] } = useQuery({ queryKey: ["all_prediction_answers"], queryFn: async () => {
    const { data } = await supabase.from("prediction_answers").select("manager_id, question_id, is_correct");
    return (data || []) as { manager_id: string; question_id: string; is_correct: boolean | null }[];
  }});
  const { data: allQuestions = [] } = useQuery({ queryKey: ["prediction_questions"], queryFn: fetchPredictionQuestions });

  // Only races with results
  const racesWithResults = races.filter(race =>
    allResults.some(r => r.race_id === race.id)
  ).sort((a, b) => b.round_number - a.round_number);

  function computeRoundScores(race: Race): ManagerRoundScore[] {
    // Build question IDs for this race
    const raceQuestionIds = new Set(
      allQuestions.filter(q => q.race_id === race.id).map(q => q.id)
    );

    return managers.map(mgr => {
      const driverIds = allMDs
        .filter(md => md.manager_id === mgr.id)
        .map(md => md.driver_id);

      // Race points from team drivers in this round
      const racePoints = allResults
        .filter(r => r.race_id === race.id && driverIds.includes(r.driver_id))
        .reduce((sum, r) => sum + r.points, 0);

      // Captain bonus for this round
      const captainSel = allCaptains.find(
        c => c.manager_id === mgr.id && c.race_id === race.id
      );
      let captainBonus = 0;
      if (captainSel) {
        captainBonus = allResults
          .filter(r => r.race_id === race.id && r.driver_id === captainSel.driver_id)
          .reduce((sum, r) => sum + r.points, 0);
      }

      // Prediction points for this round
      const predictionPoints = allPredAnswers
        .filter(a => a.manager_id === mgr.id && raceQuestionIds.has(a.question_id) && a.is_correct === true)
        .length * 5;

      return {
        managerId: mgr.id,
        managerName: mgr.name,
        teamName: mgr.team_name,
        racePoints,
        captainBonus,
        predictionPoints,
        total: racePoints + captainBonus + predictionPoints,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  }

  if (racesWithResults.length === 0) {
    return <p className="text-muted-foreground">Ingen runder med resultater endnu.</p>;
  }

  return (
    <div className="space-y-6">
      {racesWithResults.map(race => {
        const top5 = computeRoundScores(race);
        return (
          <div key={race.id} className="rounded-lg border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-gold" />
              <h3 className="font-display text-lg font-bold text-foreground">
                Runde {race.round_number}: {race.name}
              </h3>
            </div>

            {/* Header */}
            <div className="grid gap-1 text-xs text-muted-foreground px-2 py-1"
              style={{ gridTemplateColumns: "2rem 1fr 4rem 4rem 3rem 4rem" }}>
              <span>#</span>
              <span>Hold / Manager</span>
              <span className="text-right">Race</span>
              <span className="text-right">Kapt.</span>
              <span className="text-right">Pred.</span>
              <span className="text-right font-semibold">Total</span>
            </div>

            <div className="space-y-1">
              {top5.map((entry, idx) => (
                <div
                  key={entry.managerId}
                  className={`grid gap-1 items-center rounded px-2 py-1.5 text-sm ${
                    idx === 0 ? "bg-gold/10 border border-gold/20" : "bg-secondary/50"
                  }`}
                  style={{ gridTemplateColumns: "2rem 1fr 4rem 4rem 3rem 4rem" }}
                >
                  <span className={`font-display font-bold ${idx === 0 ? "text-gold" : "text-muted-foreground"}`}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <span className="font-medium text-foreground truncate block text-xs">{entry.teamName}</span>
                    <span className="text-[11px] text-muted-foreground truncate block">{entry.managerName}</span>
                  </div>
                  <span className="text-right text-xs text-muted-foreground">{entry.racePoints}</span>
                  <span className="text-right text-xs text-muted-foreground">
                    {entry.captainBonus > 0 && <Crown className="h-3 w-3 text-gold inline-block mr-0.5" />}
                    {entry.captainBonus}
                  </span>
                  <span className="text-right text-xs text-muted-foreground">{entry.predictionPoints}</span>
                  <span className="text-right font-display font-bold text-foreground">{entry.total}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
