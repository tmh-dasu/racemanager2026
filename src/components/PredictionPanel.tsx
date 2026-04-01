import { useQuery } from "@tanstack/react-query";
import { HelpCircle, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchPublishedPredictionQuestions, fetchPredictionAnswers, fetchRaces } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface PredictionPanelProps {
  managerId: string;
}

export default function PredictionPanel({ managerId }: PredictionPanelProps) {
  const { data: questions = [] } = useQuery({
    queryKey: ["prediction_questions_published"],
    queryFn: fetchPublishedPredictionQuestions,
  });
  const { data: answers = [] } = useQuery({
    queryKey: ["prediction_answers", managerId],
    queryFn: () => fetchPredictionAnswers(managerId),
    enabled: !!managerId,
  });
  const { data: races = [] } = useQuery({ queryKey: ["races"], queryFn: fetchRaces });

  const now = new Date();

  // Find the next open race with questions
  const raceQs = new Map<string, { open: boolean; total: number; answered: number; raceName: string }>();
  for (const q of questions) {
    const race = races.find((r) => r.id === q.race_id);
    if (!race) continue;
    const deadline = q.prediction_deadline ? new Date(q.prediction_deadline) : (race.race_date ? new Date(new Date(race.race_date).getTime() - 24 * 60 * 60 * 1000) : null);
    const isOpen = deadline ? now < deadline : true;
    const hasAnswer = answers.some((a) => a.question_id === q.id);
    
    if (!raceQs.has(race.id)) {
      raceQs.set(race.id, { open: isOpen, total: 0, answered: 0, raceName: `R${race.round_number}: ${race.name}` });
    }
    const entry = raceQs.get(race.id)!;
    entry.total++;
    if (hasAnswer) entry.answered++;
    if (isOpen) entry.open = true;
  }

  const openRace = Array.from(raceQs.values()).find((r) => r.open);

  if (questions.length === 0) return null;

  return (
    <Link to="/predictions" className="block">
      <div className="rounded-lg border border-border bg-card p-4 shadow-card hover:border-gold/30 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-gold" />
            <h2 className="font-display font-bold text-foreground">Predictions</h2>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        {openRace ? (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{openRace.raceName}</span>
            <Badge className={openRace.answered === openRace.total
              ? "bg-green-500/20 text-green-400 border-green-500/40"
              : "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
            }>
              {openRace.answered}/{openRace.total} besvaret
            </Badge>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Ingen åbne predictions lige nu</p>
        )}
      </div>
    </Link>
  );
}
