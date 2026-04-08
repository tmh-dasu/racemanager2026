import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Save, Gift, Shuffle, Trophy, Award } from "lucide-react";
import { fetchPrizes, upsertPrize, deletePrize, fetchManagers, type Prize } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
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
  const [form, setForm] = useState({ name: "", description: "", prize_category: "round" as "season" | "round" | "other" });
  const [editId, setEditId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<string | null>(null);

  function startEdit(p: Prize) {
    setEditId(p.id);
    setForm({ name: p.name, description: p.description || "", prize_category: p.prize_category || "round" });
  }

  function resetForm() {
    setEditId(null);
    setForm({ name: "", description: "", prize_category: "round" });
  }

  async function handleSave() {
    if (!form.name) {
      toast({ title: "Angiv et præmienavn", variant: "destructive" });
      return;
    }
    try {
      await upsertPrize({
        id: editId || undefined,
        name: form.name,
        description: form.description || null,
        prize_category: form.prize_category,
      });
      resetForm();
      refetch();
      toast({ title: editId ? "Præmie opdateret" : "Præmie tilføjet" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Slet denne præmie?")) return;
    await deletePrize(id);
    refetch();
    toast({ title: "Præmie slettet" });
  }

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

  const seasonPrizes = prizes.filter((p) => p.prize_category === "season");
  const roundPrizes = prizes.filter((p) => p.prize_category === "round");
  const otherPrizes = prizes.filter((p) => p.prize_category === "other");

  return (
    <div className="space-y-6">
      {/* Add / edit form */}
      <div className="space-y-2">
        <h3 className="font-display text-sm font-bold text-muted-foreground uppercase">
          {editId ? "Rediger præmie" : "Tilføj præmie"}
        </h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            placeholder="Præmienavn *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="bg-secondary border-border"
          />
          <Input
            placeholder="Beskrivelse (valgfri)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="bg-secondary border-border"
          />
          <div className="flex gap-1">
            <Button
              type="button"
              variant={form.prize_category === "season" ? "default" : "outline"}
              size="sm"
              className={`flex-1 font-display ${form.prize_category === "season" ? "bg-gold/20 text-gold border-gold/30 hover:bg-gold/30" : ""}`}
              onClick={() => setForm({ ...form, prize_category: "season" })}
            >
              <Trophy className="h-3.5 w-3.5 mr-1" />
              Sæson
            </Button>
            <Button
              type="button"
              variant={form.prize_category === "round" ? "default" : "outline"}
              size="sm"
              className={`flex-1 font-display ${form.prize_category === "round" ? "bg-accent/20 text-accent border-accent/30 hover:bg-accent/30" : ""}`}
              onClick={() => setForm({ ...form, prize_category: "round" })}
            >
              <Award className="h-3.5 w-3.5 mr-1" />
              Afdeling
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} className="bg-gradient-racing text-primary-foreground font-display">
            {editId ? (
              <>
                <Save className="h-4 w-4 mr-1" />
                Gem
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Tilføj
              </>
            )}
          </Button>
          {editId && (
            <Button variant="outline" onClick={resetForm}>
              Annuller
            </Button>
          )}
        </div>
      </div>

      {/* Category sections */}
      {(["season", "round"] as const).map((cat) => {
        const config = CATEGORY_CONFIG[cat];
        const CatIcon = config.icon;
        const catPrizes = cat === "season" ? seasonPrizes : roundPrizes;
        if (catPrizes.length === 0) return null;

        const undrawn = catPrizes.filter((p) => !p.winner_manager_id);
        const drawn = catPrizes.filter((p) => p.winner_manager_id);

        return (
          <div key={cat} className="space-y-3">
            <div className="flex items-center gap-2">
              <CatIcon className={`h-5 w-5 ${config.iconClass}`} />
              <h3 className="font-display text-base font-bold text-foreground">{config.label}</h3>
              <span className="text-xs text-muted-foreground ml-1">({catPrizes.length})</span>
            </div>

            {undrawn.length > 0 && (
              <div className="space-y-2">
                {undrawn.map((p) => (
                  <PrizeCard
                    key={p.id}
                    prize={p}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                    onDraw={handleDraw}
                    drawing={drawing}
                  />
                ))}
              </div>
            )}

            {drawn.length > 0 && (
              <div className="space-y-2">
                {drawn.map((p) => (
                  <DrawnPrizeCard
                    key={p.id}
                    prize={p}
                    winner={managerMap[p.winner_manager_id!]}
                    onDelete={handleDelete}
                    onReset={handleResetDraw}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {prizes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Ingen præmier oprettet endnu. Tilføj en præmie ovenfor for at komme i gang.
        </p>
      )}
    </div>
  );
}

function PrizeCard({
  prize,
  onEdit,
  onDelete,
  onDraw,
  drawing,
}: {
  prize: Prize;
  onEdit: (p: Prize) => void;
  onDelete: (id: string) => void;
  onDraw: (p: Prize) => void;
  drawing: string | null;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-4 py-3">
      <button onClick={() => onEdit(prize)} className="text-left flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium text-foreground">{prize.name}</span>
        </div>
        {prize.description && (
          <p className="text-xs text-muted-foreground mt-0.5 ml-6">{prize.description}</p>
        )}
      </button>
      <div className="flex items-center gap-2 ml-2">
        <Button
          size="sm"
          onClick={() => onDraw(prize)}
          disabled={drawing === prize.id}
          className="bg-gradient-racing text-primary-foreground font-display"
        >
          <Shuffle className={`h-4 w-4 mr-1 ${drawing === prize.id ? "animate-spin" : ""}`} />
          {drawing === prize.id ? "Trækker..." : "Træk vinder"}
        </Button>
        <button onClick={() => onDelete(prize.id)} className="text-destructive hover:text-destructive/80">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function DrawnPrizeCard({
  prize,
  winner,
  onDelete,
  onReset,
}: {
  prize: Prize;
  winner: { team_name: string; name: string } | undefined;
  onDelete: (id: string) => void;
  onReset: (p: Prize) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/10 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-accent-foreground shrink-0" />
          <span className="font-medium text-foreground">{prize.name}</span>
        </div>
        {prize.description && (
          <p className="text-xs text-muted-foreground mt-0.5 ml-6">{prize.description}</p>
        )}
        <p className="text-sm text-accent-foreground mt-1 ml-6 font-display font-bold">
          🎉 Vinder: {winner?.team_name || "Ukendt hold"}
          {winner?.name && <span className="font-normal text-muted-foreground ml-1">({winner.name})</span>}
        </p>
        {prize.drawn_at && (
          <p className="text-xs text-muted-foreground ml-6">
            Trukket{" "}
            {new Date(prize.drawn_at).toLocaleString("da-DK", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 ml-2">
        <Button size="sm" variant="outline" onClick={() => onReset(prize)}>
          Nulstil
        </Button>
        <button onClick={() => onDelete(prize.id)} className="text-destructive hover:text-destructive/80">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
