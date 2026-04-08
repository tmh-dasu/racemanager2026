import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save, Trophy, Award, Gift } from "lucide-react";
import { fetchPrizes, upsertPrize, deletePrize, type Prize } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_CONFIG = {
  season: { label: "Sæsonpræmier", icon: Trophy, iconClass: "text-gold" },
  round: { label: "Afdelingspræmier", icon: Award, iconClass: "text-accent" },
  other: { label: "Øvrige præmier", icon: Gift, iconClass: "text-primary" },
} as const;

export default function PrizeSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: prizes = [], refetch } = useQuery({ queryKey: ["prizes"], queryFn: fetchPrizes });
  const [form, setForm] = useState({ name: "", description: "", prize_category: "round" as "season" | "round" | "other" });
  const [editId, setEditId] = useState<string | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ["prizes"] });
      toast({ title: editId ? "Præmie opdateret" : "Præmie tilføjet" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Slet denne præmie?")) return;
    await deletePrize(id);
    refetch();
    queryClient.invalidateQueries({ queryKey: ["prizes"] });
    toast({ title: "Præmie slettet" });
  }

  return (
    <div className="rounded bg-secondary/50 px-4 py-3 space-y-3">
      <span className="text-sm font-medium text-foreground">Præmier</span>
      <p className="text-xs text-muted-foreground">Opret præmier fordelt på kategorier. Lodtrækning foretages under Lodtrækning-fanen.</p>

      {/* Form */}
      <div className="space-y-2 border border-border rounded p-3 bg-card">
        <Input placeholder="Præmienavn *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border" />
        <Input placeholder="Beskrivelse (valgfri)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-secondary border-border" />
        <div className="flex gap-1">
          {(["season", "round", "other"] as const).map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const CatIcon = config.icon;
            return (
              <Button
                key={cat}
                type="button"
                variant={form.prize_category === cat ? "default" : "outline"}
                size="sm"
                className={`flex-1 font-display ${form.prize_category === cat ? `${config.iconClass}` : ""}`}
                onClick={() => setForm({ ...form, prize_category: cat })}
              >
                <CatIcon className="h-3.5 w-3.5 mr-1" />
                {config.label.replace("præmier", "").trim()}
              </Button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} className="bg-gradient-racing text-primary-foreground font-display">
            {editId ? <><Save className="h-4 w-4 mr-1" />Gem</> : <><Plus className="h-4 w-4 mr-1" />Tilføj præmie</>}
          </Button>
          {editId && <Button size="sm" variant="outline" onClick={resetForm}>Annuller</Button>}
        </div>
      </div>

      {/* List by category */}
      {(["season", "round", "other"] as const).map((cat) => {
        const config = CATEGORY_CONFIG[cat];
        const CatIcon = config.icon;
        const catPrizes = prizes.filter((p) => p.prize_category === cat);
        if (catPrizes.length === 0) return null;
        return (
          <div key={cat} className="space-y-1">
            <div className="flex items-center gap-1.5 mt-2">
              <CatIcon className={`h-4 w-4 ${config.iconClass}`} />
              <span className="text-xs font-bold text-muted-foreground uppercase">{config.label} ({catPrizes.length})</span>
            </div>
            {catPrizes.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded bg-card px-3 py-2 text-sm border border-border">
                <button onClick={() => startEdit(p)} className="text-left flex-1 min-w-0">
                  <span className="font-medium text-foreground">{p.name}</span>
                  {p.description && <span className="text-muted-foreground text-xs ml-2">– {p.description}</span>}
                  {p.winner_manager_id && <span className="text-success text-xs ml-2">✓ Trukket</span>}
                </button>
                <button onClick={() => handleDelete(p.id)} className="text-destructive hover:text-destructive/80 ml-2"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        );
      })}
      {prizes.length === 0 && <p className="text-xs text-muted-foreground">Ingen præmier oprettet endnu.</p>}
    </div>
  );
}
