import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save, Gift, Shuffle, Trophy, Award, Copy, UserCog } from "lucide-react";
import { fetchPrizes, upsertPrize, deletePrize, fetchManagers, type Prize } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_CONFIG = {
  season: { label: "Sæsonpræmier", icon: Trophy, iconClass: "text-gold" },
  round: { label: "Afdelingspræmier", icon: Award, iconClass: "text-accent" },
  other: { label: "Øvrige præmier", icon: Gift, iconClass: "text-primary" },
} as const;

export default function PrizeLottery() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: prizes = [], refetch } = useQuery({ queryKey: ["prizes"], queryFn: fetchPrizes });
  const { data: managers = [] } = useQuery({ queryKey: ["managers"], queryFn: fetchManagers });
  const { data: managerEmails = [] } = useQuery({
    queryKey: ["manager-emails-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("managers")
        .select("id, email, team_name");
      if (error) throw error;
      return data || [];
    },
  });
  const [drawing, setDrawing] = useState<string | null>(null);
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
    if (!form.name) { toast({ title: "Angiv et præmienavn", variant: "destructive" }); return; }
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
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Slet denne præmie?")) return;
    await deletePrize(id);
    refetch();
    queryClient.invalidateQueries({ queryKey: ["prizes"] });
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
      await upsertPrize({ id: prize.id, name: prize.name, winner_manager_id: winner.id, drawn_at: new Date().toISOString() });
      toast({ title: `🎉 ${winner.team_name} vandt "${prize.name}"!` });
      refetch();
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
    setDrawing(null);
  }

  async function handleDrawAnother(prize: Prize) {
    // Create a copy of the prize and draw a winner for it
    const winnerIds = prizes
      .filter((p) => p.winner_manager_id)
      .map((p) => p.winner_manager_id);
    const eligible = managers.filter((m) => !winnerIds.includes(m.id));
    if (eligible.length === 0) {
      toast({ title: "Ingen hold at trække fra – alle har vundet!", variant: "destructive" });
      return;
    }
    setDrawing(prize.id + "-another");
    await new Promise((r) => setTimeout(r, 1500));
    const winner = eligible[Math.floor(Math.random() * eligible.length)];
    try {
      await upsertPrize({
        name: prize.name,
        description: prize.description,
        prize_category: prize.prize_category,
        winner_manager_id: winner.id,
        drawn_at: new Date().toISOString(),
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["prizes"] });
      toast({ title: `🎉 ${winner.team_name} vandt "${prize.name}"!` });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
    setDrawing(null);
  }

  async function handleResetDraw(prize: Prize) {
    if (!confirm(`Nulstil lodtrækning for "${prize.name}"?`)) return;
    try {
      await upsertPrize({ id: prize.id, name: prize.name, winner_manager_id: null, drawn_at: null });
      refetch();
      toast({ title: "Lodtrækning nulstillet" });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
  }

  async function handleDrawThreeForRound(prize: Prize) {
    if (!confirm(`Træk 3 vindere til "${prize.name}"? Samme hold kan ikke vinde to gange.`)) return;
    setDrawing(prize.id + "-three");
    try {
      // Track winners locally so vi ikke trækker samme hold to gange i samme batch
      const alreadyWonIds = new Set(
        prizes.filter((p) => p.winner_manager_id).map((p) => p.winner_manager_id as string)
      );

      // Step 1: træk vinder til den eksisterende, utrukne præmie
      let eligible = managers.filter((m) => !alreadyWonIds.has(m.id));
      if (eligible.length === 0) {
        toast({ title: "Ingen hold at trække fra", variant: "destructive" });
        setDrawing(null);
        return;
      }
      const w1 = eligible[Math.floor(Math.random() * eligible.length)];
      await upsertPrize({ id: prize.id, name: prize.name, winner_manager_id: w1.id, drawn_at: new Date().toISOString() });
      alreadyWonIds.add(w1.id);

      // Step 2 & 3: opret kopi-præmier og træk vindere
      const drawnNames: string[] = [w1.team_name];
      for (let i = 0; i < 2; i++) {
        eligible = managers.filter((m) => !alreadyWonIds.has(m.id));
        if (eligible.length === 0) {
          toast({ title: `Kun ${i + 1} vindere kunne trækkes – ikke nok hold`, variant: "destructive" });
          break;
        }
        const winner = eligible[Math.floor(Math.random() * eligible.length)];
        await upsertPrize({
          name: prize.name,
          description: prize.description,
          prize_category: prize.prize_category,
          winner_manager_id: winner.id,
          drawn_at: new Date().toISOString(),
        });
        alreadyWonIds.add(winner.id);
        drawnNames.push(winner.team_name);
      }

      await refetch();
      queryClient.invalidateQueries({ queryKey: ["prizes"] });
      toast({ title: `🎉 ${drawnNames.length} vindere trukket`, description: drawnNames.join(", ") });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
    setDrawing(null);
  }

  async function handleOverrideWinner(prize: Prize, newManagerId: string) {
    try {
      await upsertPrize({
        id: prize.id,
        name: prize.name,
        winner_manager_id: newManagerId,
        drawn_at: new Date().toISOString(),
      });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["prizes"] });
      const newWinner = managers.find((m) => m.id === newManagerId);
      toast({ title: `Vinder ændret til ${newWinner?.team_name || "valgt hold"}` });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  }

  const managerMap = Object.fromEntries(managers.map((m) => [m.id, m]));
  const emailMap = Object.fromEntries(managerEmails.map((m: any) => [m.id, m.email]));
  const undrawnPrizes = prizes.filter((p) => !p.winner_manager_id);
  const drawnPrizes = prizes.filter((p) => p.winner_manager_id);
  // Group drawn prizes by name for "draw another" button
  const drawnByName = drawnPrizes.reduce<Record<string, Prize[]>>((acc, p) => {
    if (!acc[p.name]) acc[p.name] = [];
    acc[p.name].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Add / edit form */}
      <div className="space-y-2">
        <h3 className="font-display text-sm font-bold text-muted-foreground uppercase">
          {editId ? "Rediger præmie" : "Tilføj lodtrækningspræmie"}
        </h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input placeholder="Præmienavn *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border" />
          <Input placeholder="Beskrivelse (valgfri)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-secondary border-border" />
          <div className="flex gap-1">
            {(["season", "round", "other"] as const).map((cat) => {
              const config = CATEGORY_CONFIG[cat];
              const CatIcon = config.icon;
              return (
                <Button key={cat} type="button" variant={form.prize_category === cat ? "default" : "outline"} size="sm"
                  className={`flex-1 font-display ${form.prize_category === cat ? config.iconClass : ""}`}
                  onClick={() => setForm({ ...form, prize_category: cat })}>
                  <CatIcon className="h-3.5 w-3.5 mr-1" />
                  {cat === "season" ? "Sæson" : cat === "round" ? "Afdeling" : "Øvrige"}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} className="bg-gradient-racing text-primary-foreground font-display">
            {editId ? <><Save className="h-4 w-4 mr-1" />Gem</> : <><Plus className="h-4 w-4 mr-1" />Tilføj</>}
          </Button>
          {editId && <Button variant="outline" onClick={resetForm}>Annuller</Button>}
        </div>
      </div>

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
                    <button onClick={() => startEdit(p)} className="text-left flex-1 min-w-0">
                      <span className="font-medium text-foreground">{p.name}</span>
                      {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                    </button>
                    <div className="flex items-center gap-2 ml-2">
                      {cat === "round" && (
                        <Button size="sm" onClick={() => handleDrawThreeForRound(p)} disabled={!!drawing}
                          className="bg-gold text-background font-display">
                          <Shuffle className={`h-4 w-4 mr-1 ${drawing === p.id + "-three" ? "animate-spin" : ""}`} />
                          {drawing === p.id + "-three" ? "Trækker 3..." : "Træk 3 vindere"}
                        </Button>
                      )}
                      <Button size="sm" onClick={() => handleDraw(p)} disabled={drawing === p.id} className="bg-gradient-racing text-primary-foreground font-display">
                        <Shuffle className={`h-4 w-4 mr-1 ${drawing === p.id ? "animate-spin" : ""}`} />
                        {drawing === p.id ? "Trækker..." : "Træk vinder"}
                      </Button>
                      <button onClick={() => handleDelete(p.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Drawn prizes - winner list */}
      {drawnPrizes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-muted-foreground uppercase">Vindere</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const emails = Array.from(
                  new Set(
                    drawnPrizes
                      .map((p) => emailMap[p.winner_manager_id!])
                      .filter((e): e is string => !!e)
                  )
                );
                if (emails.length === 0) {
                  toast({ title: "Ingen emails at kopiere", variant: "destructive" });
                  return;
                }
                navigator.clipboard.writeText(emails.join(", "));
                toast({ title: `📋 ${emails.length} emails kopieret` });
              }}
              className="text-xs h-7"
            >
              <Copy className="h-3.5 w-3.5 mr-1" />
              Kopiér alle emails
            </Button>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/50">
                  <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase">Præmie</th>
                  <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase">Kategori</th>
                  <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase">Vinder (hold)</th>
                  <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase">Navn</th>
                  <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase">Email</th>
                  <th className="text-right px-4 py-2 text-xs font-bold text-muted-foreground uppercase">Dato</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {drawnPrizes.map((p) => {
                  const winner = managerMap[p.winner_manager_id!];
                  const catConfig = CATEGORY_CONFIG[p.prize_category] || CATEGORY_CONFIG.round;
                  const isDrawingAnother = drawing === p.id + "-another";
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="px-4 py-2 font-medium text-foreground">{p.name}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs font-semibold ${catConfig.iconClass}`}>{catConfig.label}</span>
                      </td>
                      <td className="px-4 py-2 font-display font-bold text-foreground">{winner?.team_name || "Ukendt"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{winner?.name || "–"}</td>
                      <td className="px-4 py-2 text-xs">
                        {winner?.email ? (
                          <a
                            href={`mailto:${winner.email}`}
                            className="text-primary hover:underline break-all"
                          >
                            {winner.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                        {p.drawn_at ? new Date(p.drawn_at).toLocaleString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "–"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Select
                            value={p.winner_manager_id || ""}
                            onValueChange={(v) => handleOverrideWinner(p, v)}
                          >
                            <SelectTrigger className="h-7 w-[140px] text-xs bg-secondary border-border">
                              <UserCog className="h-3 w-3 mr-1" />
                              <SelectValue placeholder="Skift vinder" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {managers
                                .slice()
                                .sort((a, b) => a.team_name.localeCompare(b.team_name))
                                .map((m) => (
                                  <SelectItem key={m.id} value={m.id} className="text-xs">
                                    {m.team_name} ({m.name})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => handleDrawAnother(p)} disabled={!!drawing}
                            className="bg-gradient-racing text-primary-foreground font-display text-xs h-7">
                            <Shuffle className={`h-3 w-3 mr-1 ${isDrawingAnother ? "animate-spin" : ""}`} />
                            {isDrawingAnother ? "Trækker..." : "Træk endnu en"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleResetDraw(p)} className="text-xs h-7">Nulstil</Button>
                          <button onClick={() => handleDelete(p.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {prizes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Ingen præmier oprettet endnu. Tilføj en præmie ovenfor.
        </p>
      )}
    </div>
  );
}
