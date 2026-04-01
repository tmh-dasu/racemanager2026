import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { fetchRaces, fetchPredictionQuestions, fetchSettings, type Race, type PredictionQuestion } from "@/lib/api";

type StatusLevel = "green" | "yellow" | "red";

interface StatusItem {
  level: StatusLevel;
  message: string;
  tab?: string;
}

function getStatusItems(nextRace: Race | null, questions: PredictionQuestion[], settings: { transfer_window_open: boolean } | undefined): StatusItem[] {
  const items: StatusItem[] = [];
  const now = new Date();

  if (!nextRace) {
    items.push({ level: "red", message: "Næste arrangement er ikke oprettet", tab: "races" });
    return items;
  }

  // Race date
  if (!nextRace.race_date) {
    items.push({ level: "red", message: `Runde ${nextRace.round_number}: Arrangementsdato mangler`, tab: "races" });
  } else {
    items.push({ level: "green", message: `Arrangementsdato sat: ${new Date(nextRace.race_date).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })}` });
  }

  // Captain deadline
  if (!nextRace.captain_deadline) {
    const hoursUntilRace = nextRace.race_date ? (new Date(nextRace.race_date).getTime() - now.getTime()) / (1000 * 60 * 60) : Infinity;
    if (hoursUntilRace < 48) {
      items.push({ level: "red", message: `Captain-deadline IKKE sat – arrangement starter om mindre end 48 timer!`, tab: "races" });
    } else {
      items.push({ level: "yellow", message: `Captain-deadline mangler for Runde ${nextRace.round_number}`, tab: "races" });
    }
  } else {
    items.push({ level: "green", message: `Captain-deadline sat: ${new Date(nextRace.captain_deadline).toLocaleString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` });
  }

  // Predictions
  const raceQuestions = questions.filter(q => q.race_id === nextRace.id);
  const publishedQuestions = raceQuestions.filter(q => q.published);

  if (raceQuestions.length === 0) {
    items.push({ level: "yellow", message: `Ingen prediction-spørgsmål oprettet for Runde ${nextRace.round_number}`, tab: "predictions" });
  } else if (publishedQuestions.length === 0) {
    items.push({ level: "yellow", message: `${raceQuestions.length} spørgsmål oprettet men ikke publiceret`, tab: "predictions" });
  } else if (publishedQuestions.length < 3) {
    items.push({ level: "yellow", message: `Kun ${publishedQuestions.length}/3 predictions publiceret`, tab: "predictions" });
  } else {
    items.push({ level: "green", message: `${publishedQuestions.length} predictions publiceret` });
  }

  return items;
}

function getOverallLevel(items: StatusItem[]): StatusLevel {
  if (items.some(i => i.level === "red")) return "red";
  if (items.some(i => i.level === "yellow")) return "yellow";
  return "green";
}

const LEVEL_CONFIG = {
  green: { icon: CheckCircle2, bg: "bg-success/10 border-success/30", iconClass: "text-success", label: "Alt klar" },
  yellow: { icon: AlertTriangle, bg: "bg-gold/10 border-gold/30", iconClass: "text-gold", label: "Mangler noget" },
  red: { icon: XCircle, bg: "bg-destructive/10 border-destructive/30", iconClass: "text-destructive", label: "Kritisk" },
};

export default function AdminStatusCard({ onNavigateTab }: { onNavigateTab?: (tab: string) => void }) {
  const { data: races = [] } = useQuery({ queryKey: ["races"], queryFn: fetchRaces });
  const { data: questions = [] } = useQuery({ queryKey: ["prediction_questions"], queryFn: fetchPredictionQuestions });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const now = new Date();
  const nextRace = races
    .filter(r => !r.race_date || new Date(r.race_date) > now)
    .sort((a, b) => (a.round_number - b.round_number))[0] || null;

  const items = getStatusItems(nextRace, questions, settings);
  const overall = getOverallLevel(items);
  const config = LEVEL_CONFIG[overall];
  const OverallIcon = config.icon;

  return (
    <div className={`rounded-lg border p-4 shadow-card mb-4 ${config.bg}`}>
      <div className="flex items-center gap-2 mb-3">
        <OverallIcon className={`h-5 w-5 ${config.iconClass}`} />
        <h2 className="font-display font-bold text-foreground">
          Næste arrangement: {nextRace ? `Runde ${nextRace.round_number} – ${nextRace.name}` : "Ikke oprettet"}
        </h2>
        <span className={`ml-auto text-xs font-display font-semibold px-2 py-0.5 rounded ${
          overall === "green" ? "bg-success/20 text-success" : overall === "yellow" ? "bg-gold/20 text-gold" : "bg-destructive/20 text-destructive"
        }`}>
          {config.label}
        </span>
      </div>

      <div className="space-y-1.5">
        {items.map((item, i) => {
          const ItemIcon = LEVEL_CONFIG[item.level].icon;
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <ItemIcon className={`h-3.5 w-3.5 shrink-0 ${LEVEL_CONFIG[item.level].iconClass}`} />
              <span className="text-foreground flex-1">{item.message}</span>
              {item.tab && onNavigateTab && (
                <button
                  onClick={() => onNavigateTab(item.tab!)}
                  className="text-xs text-racing-red hover:underline font-display shrink-0"
                >
                  Ret →
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
