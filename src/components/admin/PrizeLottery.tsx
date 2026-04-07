import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Save, Gift, Shuffle } from "lucide-react";
import { fetchPrizes, upsertPrize, deletePrize, fetchManagers, type Prize } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function PrizeLottery() {
  const { toast } = useToast();
  const { data: prizes = [], refetch } = useQuery({ queryKey: ["prizes"], queryFn: fetchPrizes });
  const { data: managers = [] } = useQuery({ queryKey: ["managers"], queryFn: fetchManagers });
  const [form, setForm] = useState({ name: "", description: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<string | null>(null);

  function startEdit(p: Prize) {
    setEditId(p.id);
    setForm({ name: p.name, description: p.description || "" });
  }

  function resetForm() {
    setEditId(null);
    setForm({ name: "", description: "" });
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
    // Get IDs of managers who already won a prize
    const winnerIds = prizes
      .filter((p) => p.winner_manager_id && p.id !== prize.id)
      .map((p) => p.winner_manager_id);

    const eligible = managers.filter((m) => !winnerIds.includes(m.id));

    if (eligible.length === 0) {
      toast({ title: "Ingen hold at trække fra – alle har vundet!", variant: "destructive" });
      return;
    }

    setDrawing(prize.id);

    // Animate briefly
    await new Promise((r) => setTimeout(r, 1500));

    const winner = eligible[Math.floor(Math.random() * eligible.length)];

    try {
      await upsertPrize({
        id: prize.id,
        name: prize.name,
        winner_manager_id: winner.id,
        drawn_at: new Date().toISOString(),
      });

      // Send notification email to winner
      try {
        await supabase.functions.invoke("notify-prize-winner", {
          body: { prizeId: prize.id },
        });
        toast({ title: `🎉 ${winner.team_name} vandt "${prize.name}"! Email sendt.` });
      } catch {
        toast({ title: `🎉 ${winner.team_name} vandt "${prize.name}"! (Email kunne ikke sendes)` });
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
  const undrawn = prizes.filter((p) => !p.winner_manager_id);
  const drawn = prizes.filter((p) => p.winner_manager_id);

  return (
    <div className="space-y-6">
      {/* Add / edit form */}
      <div className="space-y-2">
        <h3 className="font-display text-sm font-bold text-muted-foreground uppercase">
          {editId ? "Rediger præmie" : "Tilføj præmie"}
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
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

      {/* Undrawn prizes */}
      {undrawn.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display text-sm font-bold text-muted-foreground uppercase">
            Præmier klar til lodtrækning ({undrawn.length})
          </h3>
          {undrawn.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-4 py-3"
            >
              <button onClick={() => startEdit(p)} className="text-left flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground">{p.name}</span>
                </div>
                {p.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 ml-6">{p.description}</p>
                )}
              </button>
              <div className="flex items-center gap-2 ml-2">
                <Button
                  size="sm"
                  onClick={() => handleDraw(p)}
                  disabled={drawing === p.id}
                  className="bg-gradient-racing text-primary-foreground font-display"
                >
                  <Shuffle className={`h-4 w-4 mr-1 ${drawing === p.id ? "animate-spin" : ""}`} />
                  {drawing === p.id ? "Trækker..." : "Træk vinder"}
                </Button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawn prizes */}
      {drawn.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display text-sm font-bold text-muted-foreground uppercase">
            Trukne præmier ({drawn.length})
          </h3>
          {drawn.map((p) => {
            const winner = managerMap[p.winner_manager_id!];
            return (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/10 px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-accent-foreground shrink-0" />
                    <span className="font-medium text-foreground">{p.name}</span>
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 ml-6">{p.description}</p>
                  )}
                  <p className="text-sm text-accent-foreground mt-1 ml-6 font-display font-bold">
                    🎉 Vinder: {winner?.team_name || "Ukendt hold"}
                    {winner?.name && (
                      <span className="font-normal text-muted-foreground ml-1">({winner.name})</span>
                    )}
                  </p>
                  {p.drawn_at && (
                    <p className="text-xs text-muted-foreground ml-6">
                      Trukket{" "}
                      {new Date(p.drawn_at).toLocaleString("da-DK", {
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
                  <Button size="sm" variant="outline" onClick={() => handleResetDraw(p)}>
                    Nulstil
                  </Button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {prizes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Ingen præmier oprettet endnu. Tilføj en præmie ovenfor for at komme i gang.
        </p>
      )}
    </div>
  );
}
