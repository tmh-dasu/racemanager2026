import { useQuery } from "@tanstack/react-query";
import { Trophy, Zap } from "lucide-react";
import { fetchManagers } from "@/lib/api";
import PageLayout from "@/components/PageLayout";

export default function LeaderboardPage() {
  const { data: managers = [] } = useQuery({ queryKey: ["managers"], queryFn: fetchManagers });

  return (
    <PageLayout>
      <div className="container py-6 space-y-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Rangering</h1>

        {managers.length === 0 && (
          <p className="text-muted-foreground">Ingen hold tilmeldt endnu.</p>
        )}

        <div className="space-y-2">
          {managers.map((m, i) => (
            <div
              key={m.id}
              className={`flex items-center gap-3 rounded-lg border p-3 shadow-card transition ${
                i === 0 ? "border-gold/30 bg-gold/5" : i === 1 ? "border-border bg-card" : i === 2 ? "border-racing-red/20 bg-racing-red/5" : "border-border bg-card"
              }`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${
                i === 0 ? "bg-gold text-gold-foreground" : i === 1 ? "bg-muted text-muted-foreground" : i === 2 ? "bg-racing-red text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-foreground truncate">{m.team_name}</p>
                <p className="text-xs text-muted-foreground truncate">{m.name}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {!m.joker_used ? (
                  <span title="Joker tilgængelig"><Zap className="h-4 w-4 text-success" /></span>
                ) : (
                  <span title="Joker brugt"><Zap className="h-4 w-4 text-muted-foreground" /></span>
                )}
                <span className="font-display text-xl font-bold text-foreground">{m.total_points}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
