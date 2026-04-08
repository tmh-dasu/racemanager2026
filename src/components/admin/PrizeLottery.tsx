import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gift, Shuffle, Trophy, Award } from "lucide-react";
import { fetchPrizes, upsertPrize, fetchManagers, type Prize } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_CONFIG = {
  season: { label: "Sæsonpræmier", icon: Trophy, iconClass: "text-gold" },
  round: { label: "Afdelingspræmier", icon: Award, iconClass: "text-accent" },
  other: { label: "Øvrige præmier", icon: Gift, iconClass: "text-primary" },
} as const;

export default function PrizeLottery() {
  const { toast } = useToast();
  const { data: prizes = [], refetch } = useQuery({ queryKey: ["prizes"], queryFn: fetchPrizes });
  const { data: managers = [] } = useQuery({ queryKey: ["managers"], queryFn: fetchManagers });
  const [drawing, setDrawing] = useState<string | null>(null);

  async function handleDraw(prize: Prize) {
    const winnerIds = prizes
      .filter((p) => p.winner_manager_id && p.id !== prize.id)
      .map((p) => p.winner_manager_id);

    const eligible = managers.filter((m) => !winnerIds.includes(m.id));

    if (eligible.length === 0) {
      toast({ title: "Ingen hold at trække fra – alle har vundet!", variant: "destructive" });
      return;
    }

    setDrawing(prize.id);
    await new Promise((r) => setTimeout(r, 1500));
    const winner = eligible[Math.floor(Math.random() * eligible.length)];

    try {
      await upsertPrize({
        id: prize.id,
        name: prize.name,
        winner_manager_id: winner.id,
        drawn_at: new Date().toISOString(),
      });

      const { error: notifyError } = await supabase.functions.invoke("notify-prize-winner", {
        body: { prizeId: prize.id },
      });

      if (notifyError) {
        console.error("Prize winner email error:", notifyError);
        toast({
          title: `🎉 ${winner.team_name} vandt "${prize.name}"!`,
          description: "Vinderen blev gemt, men emailen kunne ikke sendes.",
          variant: "destructive",
        });
      } else {
        toast({ title: `🎉 ${winner.team_name} vandt "${prize.name}"! Email sendt.` });
      }

      refetch();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
    setDrawing(null);
  }

  async function handleResetDraw(prize: Prize) {
    if (!confirm(`Nulstil lodtrækning for "${prize.name}"?`)) return;
    try {
      await upsertPrize({
        id: prize.id,
        name: prize.name,
        winner_manager_id: null,
        drawn_at: null,
      });
      refetch();
      toast({ title: "Lodtrækning nulstillet" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  }

  const managerMap = Object.fromEntries(managers.map((m) => [m.id, m]));
  const undrawnPrizes = prizes.filter((p) => !p.winner_manager_id);
  const drawnPrizes = prizes.filter((p) => p.winner_manager_id);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Præmier oprettes under <strong>Indstillinger → Præmier</strong>. Her kan du trække vindere.
      </p>

      {undrawnPrizes.length === 0 && drawnPrizes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Ingen præmier oprettet endnu. Gå til Indstillinger for at tilføje præmier.
        </p>
      )}

      {/* Undrawn prizes */}
      {undrawnPrizes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display text-sm font-bold text-muted-foreground uppercase">Ikke trukket</h3>
          {(["season", "round", "other"] as const).map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const CatIcon = config.icon;
            const catPrizes = undrawnPrizes.filter((p) => p.prize_category === cat);
            if (catPrizes.length === 0) return null;
            return (
              <div key={cat} className="space-y-2">
                <div className="flex items-center gap-2">
                  <CatIcon className={`h-4 w-4 ${config.iconClass}`} />
                  <span className="text-sm font-semibold text-foreground">{config.label}</span>
                </div>
                {catPrizes.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground">{p.name}</span>
                      {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleDraw(p)}
                      disabled={drawing === p.id}
                      className="bg-gradient-racing text-primary-foreground font-display ml-2"
                    >
                      <Shuffle className={`h-4 w-4 mr-1 ${drawing === p.id ? "animate-spin" : ""}`} />
                      {drawing === p.id ? "Trækker..." : "Træk vinder"}
                    </Button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Drawn prizes */}
      {drawnPrizes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display text-sm font-bold text-muted-foreground uppercase">Trukket</h3>
          {drawnPrizes.map((p) => {
            const winner = managerMap[p.winner_manager_id!];
            return (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/10 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground">{p.name}</span>
                  {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                  <p className="text-sm text-accent-foreground mt-1 font-display font-bold">
                    🎉 Vinder: {winner?.team_name || "Ukendt hold"}
                    {winner?.name && <span className="font-normal text-muted-foreground ml-1">({winner.name})</span>}
                  </p>
                  {p.drawn_at && (
                    <p className="text-xs text-muted-foreground">
                      Trukket {new Date(p.drawn_at).toLocaleString("da-DK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => handleResetDraw(p)} className="ml-2">
                  Nulstil
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
