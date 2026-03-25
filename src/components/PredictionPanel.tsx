import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, Check, X, Lock, Clock } from "lucide-react";
import { fetchPredictionQuestions, fetchPredictionAnswers, submitPredictionAnswer, fetchSeasonPrediction, fetchDrivers, getNextRaceWithDeadline, QUESTION_TYPE_LABELS, type Race, type PredictionQuestion } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PredictionPanelProps {
  managerId: string;
  races: Race[];
}

export default function PredictionPanel({ managerId, races }: PredictionPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const { data: questions = [] } = useQuery({
    queryKey: ["prediction_questions"],
    queryFn: fetchPredictionQuestions,
  });
  const { data: answers = [] } = useQuery({
    queryKey: ["prediction_answers", managerId],
    queryFn: () => fetchPredictionAnswers(managerId),
    enabled: !!managerId,
  });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });
  const { data: seasonPrediction } = useQuery({
    queryKey: ["season_prediction", managerId],
    queryFn: () => fetchSeasonPrediction(managerId),
    enabled: !!managerId,
  });

  const now = new Date();

  // Group questions by race
  const questionsWithRace = questions.map((q) => {
    const race = races.find((r) => r.id === q.race_id);
    const myAnswer = answers.find((a) => a.question_id === q.id);
    const deadline = race?.captain_deadline ? new Date(race.captain_deadline) : null;
    const isLocked = deadline ? now > deadline : false;
    return { ...q, race, myAnswer, isLocked, deadline };
  });

  // Current open question (next race with deadline not passed)
  const openQuestion = questionsWithRace.find((q) => !q.isLocked && !q.myAnswer);
  const activeQuestion = openQuestion || questionsWithRace.find((q) => !q.isLocked);

  // Past predictions
  const pastQuestions = questionsWithRace.filter((q) => q.isLocked || q.myAnswer);

  async function handleSubmit(questionId: string, answer: string) {
    setSubmitting(true);
    try {
      await submitPredictionAnswer(questionId, managerId, answer);
      queryClient.invalidateQueries({ queryKey: ["prediction_answers", managerId] });
      setSelectedAnswer(null);
      toast({ title: "Prediction gemt! 🔮" });
    } catch (err: any) {
      toast({ title: "Fejl: " + err.message, variant: "destructive" });
    }
    setSubmitting(false);
  }

  function renderAnswerOptions(q: PredictionQuestion, isLocked: boolean, existingAnswer?: string) {
    if (q.question_type === "tier_winner") {
      const tiers = [
        { value: "gold", label: "Guld", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" },
        { value: "silver", label: "Sølv", color: "bg-gray-300/20 text-gray-300 border-gray-400/40" },
        { value: "bronze", label: "Bronze", color: "bg-amber-700/20 text-amber-600 border-amber-700/40" },
      ];
      return (
        <div className="flex gap-2">
          {tiers.map((t) => (
            <button
              key={t.value}
              onClick={() => !isLocked && !existingAnswer && setSelectedAnswer(t.value)}
              disabled={isLocked || !!existingAnswer}
              className={`rounded-lg border px-4 py-2 font-display font-semibold text-sm transition-all ${
                (selectedAnswer === t.value || existingAnswer === t.value)
                  ? t.color + " shadow-md"
                  : "border-border bg-card hover:border-gold/30"
              } ${(isLocked || existingAnswer) ? "cursor-not-allowed opacity-60" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      );
    }

    // Driver selection for other types
    return (
      <div className="grid gap-1.5 max-h-48 overflow-y-auto">
        {drivers.map((d) => (
          <button
            key={d.id}
            onClick={() => !isLocked && !existingAnswer && setSelectedAnswer(d.id)}
            disabled={isLocked || !!existingAnswer}
            className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-left text-sm transition ${
              (selectedAnswer === d.id || existingAnswer === d.id)
                ? "border-gold bg-gold/10"
                : "border-border bg-card hover:border-gold/30"
            } ${(isLocked || existingAnswer) ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <span className="font-display font-bold text-muted-foreground">#{d.car_number}</span>
            <span className="text-foreground">{d.name}</span>
          </button>
        ))}
      </div>
    );
  }

  function answerDisplayName(answer: string, questionType: string) {
    if (questionType === "tier_winner") {
      return answer === "gold" ? "Guld" : answer === "silver" ? "Sølv" : "Bronze";
    }
    const driver = drivers.find((d) => d.id === answer);
    return driver ? `#${driver.car_number} ${driver.name}` : answer;
  }

  return (
    <div className="space-y-4">
      {/* Season Prediction */}
      {seasonPrediction && (
        <div className="rounded-lg border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="h-4 w-4 text-accent-foreground" />
            <span className="font-display font-semibold text-foreground text-sm">Din sæsonprediction</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Sæsonvinder: <span className="font-semibold text-foreground">
                {drivers.find((d) => d.id === seasonPrediction.driver_id)
                  ? `#${drivers.find((d) => d.id === seasonPrediction.driver_id)!.car_number} ${drivers.find((d) => d.id === seasonPrediction.driver_id)!.name}`
                  : "Ukendt"}
              </span>
            </span>
            {seasonPrediction.is_correct === true && <Badge className="bg-green-500/20 text-green-400 border-green-500/40"><Check className="h-3 w-3 mr-1" />Korrekt! +15</Badge>}
            {seasonPrediction.is_correct === false && <Badge className="bg-destructive/20 text-destructive border-destructive/40"><X className="h-3 w-3 mr-1" />Forkert</Badge>}
            {seasonPrediction.is_correct === null && <Badge className="bg-muted text-muted-foreground border-border">Afventer</Badge>}
          </div>
        </div>
      )}

      {/* Active prediction */}
      {activeQuestion && (
        <div className="rounded-lg border border-border bg-card p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-gold" />
              <h2 className="font-display font-bold text-foreground">Prediction</h2>
            </div>
            {activeQuestion.isLocked ? (
              <Badge className="bg-muted text-muted-foreground border-border"><Lock className="h-3 w-3 mr-1" />Låst</Badge>
            ) : activeQuestion.deadline ? (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40">
                <Clock className="h-3 w-3 mr-1" />
                {activeQuestion.deadline.toLocaleString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </Badge>
            ) : null}
          </div>

          <p className="text-sm text-muted-foreground">
            {activeQuestion.race?.name && <span className="font-semibold text-foreground">{activeQuestion.race.name}: </span>}
            {activeQuestion.question_text}
          </p>
          <p className="text-xs text-muted-foreground">{QUESTION_TYPE_LABELS[activeQuestion.question_type]}</p>

          {renderAnswerOptions(activeQuestion, activeQuestion.isLocked, activeQuestion.myAnswer?.answer)}

          {activeQuestion.myAnswer ? (
            <p className="text-sm text-muted-foreground">
              Dit svar: <span className="font-semibold text-foreground">{answerDisplayName(activeQuestion.myAnswer.answer, activeQuestion.question_type)}</span>
              {activeQuestion.myAnswer.is_correct === true && <span className="text-green-400 ml-2">✓ Korrekt! +10</span>}
              {activeQuestion.myAnswer.is_correct === false && <span className="text-destructive ml-2">✗ Forkert</span>}
            </p>
          ) : selectedAnswer && !activeQuestion.isLocked ? (
            <Button
              onClick={() => handleSubmit(activeQuestion.id, selectedAnswer)}
              disabled={submitting}
              className="bg-gradient-racing text-primary-foreground font-display"
            >
              {submitting ? "Gemmer..." : "Bekræft prediction 🔮"}
            </Button>
          ) : null}
        </div>
      )}

      {/* Past predictions */}
      {pastQuestions.filter((q) => q.id !== activeQuestion?.id).length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 shadow-card space-y-2">
          <h3 className="font-display font-semibold text-foreground text-sm">Tidligere predictions</h3>
          {pastQuestions.filter((q) => q.id !== activeQuestion?.id).map((q) => (
            <div key={q.id} className="flex items-center justify-between rounded bg-secondary/50 px-3 py-2 text-sm">
              <div className="flex-1 min-w-0">
                <span className="text-muted-foreground">{q.race?.name}: </span>
                <span className="text-foreground">{q.question_text}</span>
              </div>
              <div className="shrink-0 ml-2">
                {q.myAnswer ? (
                  <span className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{answerDisplayName(q.myAnswer.answer, q.question_type)}</span>
                    {q.myAnswer.is_correct === true && <Check className="h-3.5 w-3.5 text-green-400" />}
                    {q.myAnswer.is_correct === false && <X className="h-3.5 w-3.5 text-destructive" />}
                    {q.myAnswer.is_correct === null && <span className="text-xs text-muted-foreground">?</span>}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Intet svar</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
