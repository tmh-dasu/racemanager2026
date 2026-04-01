import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { HelpCircle, Lock, Clock, AlertTriangle } from "lucide-react";
import { fetchPublishedPredictionQuestions, fetchPredictionAnswers, submitPredictionAnswer, fetchRaces, fetchManagerByUserId, fetchDrivers, QUESTION_TYPE_LABELS, type PredictionQuestion, type Race } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import PageLayout from "@/components/PageLayout";

function CountdownBadge({ deadline }: { deadline: Date }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return <Badge className="bg-muted text-muted-foreground border-border"><Lock className="h-3 w-3 mr-1" />Lukket</Badge>;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}t`);
  if (days === 0) parts.push(`${mins}m`);
  if (days === 0 && hours === 0) parts.push(`${secs}s`);

  return (
    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40">
      <Clock className="h-3 w-3 mr-1" />
      {parts.join(" ")}
    </Badge>
  );
}

export default function PredictionsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [answers, setLocalAnswers] = useState<Record<string, string>>({});

  const { data: manager } = useQuery({
    queryKey: ["manager", user?.id],
    queryFn: () => fetchManagerByUserId(user!.id),
    enabled: !!user,
  });
  const { data: questions = [] } = useQuery({
    queryKey: ["prediction_questions_published"],
    queryFn: fetchPublishedPredictionQuestions,
  });
  const { data: myAnswers = [] } = useQuery({
    queryKey: ["prediction_answers", manager?.id],
    queryFn: () => fetchPredictionAnswers(manager!.id),
    enabled: !!manager,
  });
  const { data: races = [] } = useQuery({ queryKey: ["races"], queryFn: fetchRaces });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });

  const now = new Date();

  // Group questions by race
  const raceQuestionMap = new Map<string, { race: Race; questions: (PredictionQuestion & { myAnswer?: any; isLocked: boolean; deadline: Date | null })[] }>();
  
  for (const q of questions) {
    const race = races.find((r) => r.id === q.race_id);
    if (!race) continue;
    const deadline = q.prediction_deadline ? new Date(q.prediction_deadline) : (race.captain_deadline ? new Date(race.captain_deadline) : null);
    const isLocked = deadline ? now > deadline : false;
    const myAnswer = myAnswers.find((a) => a.question_id === q.id);
    
    if (!raceQuestionMap.has(race.id)) {
      raceQuestionMap.set(race.id, { race, questions: [] });
    }
    raceQuestionMap.get(race.id)!.questions.push({ ...q, myAnswer, isLocked, deadline });
  }

  // Sort races: open ones first, then by round number
  const raceGroups = Array.from(raceQuestionMap.values()).sort((a, b) => {
    const aOpen = a.questions.some((q) => !q.isLocked);
    const bOpen = b.questions.some((q) => !q.isLocked);
    if (aOpen && !bOpen) return -1;
    if (!aOpen && bOpen) return 1;
    return b.race.round_number - a.race.round_number;
  });

  async function handleSubmit(questionId: string, answer: string) {
    if (!manager) return;
    setSubmitting(true);
    try {
      await submitPredictionAnswer(questionId, manager.id, answer);
      queryClient.invalidateQueries({ queryKey: ["prediction_answers", manager.id] });
      setLocalAnswers((prev) => { const next = { ...prev }; delete next[questionId]; return next; });
      toast({ title: "Prediction gemt! 🔮" });
    } catch (err: any) {
      toast({ title: "Fejl: " + err.message, variant: "destructive" });
    }
    setSubmitting(false);
  }

  function getDriverName(id: string) {
    const d = drivers.find((d) => d.id === id);
    return d ? `#${d.car_number} ${d.name}` : id;
  }

  function renderOptions(q: PredictionQuestion & { isLocked: boolean; myAnswer?: any }) {
    const existingAnswer = q.myAnswer?.answer;
    const localAnswer = answers[q.id];
    const selected = localAnswer || existingAnswer;

    if (q.question_type === "yes_no") {
      const options = [
        { value: "ja", label: "Ja" },
        { value: "nej", label: "Nej" },
      ];
      return (
        <div className="flex gap-2">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => !q.isLocked && setLocalAnswers((prev) => ({ ...prev, [q.id]: o.value }))}
              disabled={q.isLocked}
              className={`rounded-lg border px-6 py-2.5 font-display font-semibold text-sm transition-all ${
                selected === o.value
                  ? "border-gold bg-gold/10 text-foreground shadow-md"
                  : "border-border bg-card hover:border-gold/30 text-muted-foreground"
              } ${q.isLocked ? "cursor-not-allowed opacity-60" : ""}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      );
    }

    // Duel or point_duel
    const optionA = q.option_a || "";
    const optionB = q.option_b || "";
    const options = [
      { value: optionA, label: optionA.startsWith("driver:") ? getDriverName(optionA.replace("driver:", "")) : optionA },
      { value: optionB, label: optionB.startsWith("driver:") ? getDriverName(optionB.replace("driver:", "")) : optionB },
    ];

    return (
      <div className="flex gap-2 flex-wrap">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => !q.isLocked && setLocalAnswers((prev) => ({ ...prev, [q.id]: o.value }))}
            disabled={q.isLocked}
            className={`rounded-lg border px-4 py-2.5 font-display font-semibold text-sm transition-all flex-1 min-w-[120px] ${
              selected === o.value
                ? "border-gold bg-gold/10 text-foreground shadow-md"
                : "border-border bg-card hover:border-gold/30 text-muted-foreground"
            } ${q.isLocked ? "cursor-not-allowed opacity-60" : ""}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  function answerDisplay(answer: string) {
    if (answer.startsWith("driver:")) return getDriverName(answer.replace("driver:", ""));
    if (answer === "ja") return "Ja";
    if (answer === "nej") return "Nej";
    return answer;
  }

  if (loading) {
    return <PageLayout><div className="container py-12 text-center"><p className="text-muted-foreground">Indlæser...</p></div></PageLayout>;
  }

  if (!user) {
    return (
      <PageLayout>
        <div className="container py-12 text-center space-y-4">
          <AlertTriangle className="mx-auto h-10 w-10 text-gold" />
          <h1 className="font-display text-2xl font-bold text-foreground">Log ind for at se predictions</h1>
          <Button onClick={() => navigate("/login")} className="bg-gradient-racing text-primary-foreground font-display">Log ind</Button>
        </div>
      </PageLayout>
    );
  }

  if (!manager) {
    return (
      <PageLayout>
        <div className="container py-12 text-center space-y-4">
          <AlertTriangle className="mx-auto h-10 w-10 text-gold" />
          <h1 className="font-display text-2xl font-bold text-foreground">Opret et hold først</h1>
          <Button onClick={() => navigate("/vaelg-hold")} className="bg-gradient-racing text-primary-foreground font-display">Opret hold</Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container py-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Predictions 🔮</h1>
          <p className="text-sm text-muted-foreground">Besvar 3 spørgsmål per arrangement – 5 point per korrekt svar</p>
        </div>

        {raceGroups.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <HelpCircle className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Ingen prediction-spørgsmål er publiceret endnu.</p>
          </div>
        )}

        {raceGroups.map(({ race, questions: qs }) => {
          const isOpen = qs.some((q) => !q.isLocked);
          const answeredCount = qs.filter((q) => q.myAnswer || answers[q.id]).length;
          const firstDeadline = qs[0]?.deadline;

          return (
            <div key={race.id} className={`rounded-lg border p-4 shadow-card space-y-4 ${isOpen ? "border-gold/30 bg-card" : "border-border bg-card"}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <HelpCircle className={`h-5 w-5 ${isOpen ? "text-gold" : "text-muted-foreground"}`} />
                  <h2 className="font-display font-bold text-foreground">R{race.round_number}: {race.name}</h2>
                  <Badge className="bg-secondary text-muted-foreground border-border text-xs">{answeredCount}/{qs.length}</Badge>
                </div>
                {firstDeadline && (
                  isOpen ? <CountdownBadge deadline={firstDeadline} /> : <Badge className="bg-muted text-muted-foreground border-border"><Lock className="h-3 w-3 mr-1" />Lukket</Badge>
                )}
              </div>

              {firstDeadline && isOpen && (
                <p className="text-xs text-muted-foreground">
                  Lukker: {firstDeadline.toLocaleString("da-DK", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}

              {qs.map((q, i) => (
                <div key={q.id} className="space-y-2 rounded-md bg-secondary/30 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-display font-bold text-muted-foreground">#{i + 1}</span>
                    <span className="text-xs text-muted-foreground">{QUESTION_TYPE_LABELS[q.question_type]}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{q.question_text}</p>

                  {renderOptions(q)}

                  {/* Show existing answer status */}
                  {q.myAnswer && (
                    <p className="text-sm text-muted-foreground">
                      Dit svar: <span className="font-semibold text-foreground">{answerDisplay(q.myAnswer.answer)}</span>
                      {q.myAnswer.is_correct === true && <span className="text-green-400 ml-2">✓ Korrekt! +5</span>}
                      {q.myAnswer.is_correct === false && <span className="text-destructive ml-2">✗ Forkert</span>}
                      {q.myAnswer.is_correct === null && !q.isLocked && <span className="text-muted-foreground ml-2">(kan ændres)</span>}
                      {q.myAnswer.is_correct === null && q.isLocked && <span className="text-muted-foreground ml-2">Afventer resultat</span>}
                    </p>
                  )}

                  {/* Show correct answer after resolution */}
                  {q.correct_answer && q.isLocked && (
                    <p className="text-xs text-muted-foreground">
                      Korrekt svar: <span className="font-semibold text-foreground">{answerDisplay(q.correct_answer)}</span>
                    </p>
                  )}

                  {/* Submit/update button */}
                  {answers[q.id] && !q.isLocked && (
                    <Button
                      onClick={() => handleSubmit(q.id, answers[q.id])}
                      disabled={submitting}
                      size="sm"
                      className="bg-gradient-racing text-primary-foreground font-display"
                    >
                      {submitting ? "Gemmer..." : q.myAnswer ? "Opdater svar 🔮" : "Gem svar 🔮"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </PageLayout>
  );
}
