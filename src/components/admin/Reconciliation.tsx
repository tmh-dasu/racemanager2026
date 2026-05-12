import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Manager { id: string; name: string; team_name: string; total_points: number }
interface RoundPoints { manager_id: string; race_id: string; race_points: number; captain_bonus: number; prediction_points: number; total: number }
interface Transfer { manager_id: string; point_cost: number; is_free: boolean }
interface Race { id: string; name: string; round_number: number }

export default function Reconciliation() {
  const { toast } = useToast();
  const [filter, setFilter] = useState("");
  const [showOnlyMismatches, setShowOnlyMismatches] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: managers = [], refetch: rM } = useQuery({
    queryKey: ["recon_managers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("managers").select("id, name, team_name, total_points").order("total_points", { ascending: false });
      if (error) throw error;
      return (data || []) as Manager[];
    },
  });

  const { data: rounds = [], refetch: rR } = useQuery({
    queryKey: ["recon_rounds"],
    queryFn: async () => {
      const { data, error } = await supabase.from("manager_round_points").select("manager_id, race_id, race_points, captain_bonus, prediction_points, total");
      if (error) throw error;
      return (data || []) as RoundPoints[];
    },
  });

  const { data: transfers = [], refetch: rT } = useQuery({
    queryKey: ["recon_transfers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transfers").select("manager_id, point_cost, is_free");
      if (error) throw error;
      return (data || []) as Transfer[];
    },
  });

  const { data: races = [] } = useQuery({
    queryKey: ["recon_races"],
    queryFn: async () => {
      const { data, error } = await supabase.from("races").select("id, name, round_number").order("round_number");
      if (error) throw error;
      return (data || []) as Race[];
    },
  });

  const raceMap = useMemo(() => new Map(races.map(r => [r.id, r])), [races]);

  const reconciled = useMemo(() => {
    return managers.map(m => {
      const mRounds = rounds.filter(r => r.manager_id === m.id);
      const mTransfers = transfers.filter(t => t.manager_id === m.id);
      const racePts = mRounds.reduce((s, r) => s + r.race_points, 0);
      const capPts = mRounds.reduce((s, r) => s + r.captain_bonus, 0);
      const predPts = mRounds.reduce((s, r) => s + r.prediction_points, 0);
      const transferCost = mTransfers.reduce((s, t) => s + (t.point_cost || 0), 0);
      const transferCount = mTransfers.length;
      const freeTransfers = mTransfers.filter(t => t.is_free).length;
      const expected = racePts + capPts + predPts - transferCost;
      const diff = m.total_points - expected;
      return { manager: m, rounds: mRounds, racePts, capPts, predPts, transferCost, transferCount, freeTransfers, expected, diff };
    });
  }, [managers, rounds, transfers]);

  const mismatches = reconciled.filter(r => r.diff !== 0);

  const filtered = reconciled
    .filter(r => !showOnlyMismatches || r.diff !== 0)
    .filter(r => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return r.manager.name.toLowerCase().includes(q) || r.manager.team_name.toLowerCase().includes(q);
    });

  async function recomputeAll() {
    setRecomputing(true);
    try {
      // Trigger recompute by calling RPC for each manager via no-op transfer? Instead use a direct SQL function via edge.
      // Simplest: bump every manager by toggling a dummy update to managers.team_name=team_name (no triggers fire).
      // Better: call the existing recompute function for each race.
      for (const race of races) {
        const { error } = await supabase.rpc("recompute_race_all_managers" as never, { p_race_id: race.id } as never);
        if (error) throw error;
      }
      await Promise.all([rM(), rR(), rT()]);
      toast({ title: "Genberegnet", description: `${races.length} runder genberegnet` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ukendt fejl";
      toast({ title: "Fejl", description: msg, variant: "destructive" });
    } finally {
      setRecomputing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            {mismatches.length === 0 ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-display font-bold text-foreground">
                  Alle {reconciled.length} managere stemmer
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="font-display font-bold text-foreground">
                  {mismatches.length} af {reconciled.length} managere har afvigelser
                </span>
              </>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={recomputeAll} disabled={recomputing} className="ml-auto">
            <RefreshCw className={`h-4 w-4 mr-1 ${recomputing ? "animate-spin" : ""}`} />
            Genberegn alle
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søg manager / hold"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          size="sm"
          variant={showOnlyMismatches ? "default" : "outline"}
          onClick={() => setShowOnlyMismatches(v => !v)}
        >
          Kun afvigelser
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
        <div className="grid gap-1 text-xs text-muted-foreground px-3 py-2 border-b border-border bg-secondary/40"
          style={{ gridTemplateColumns: "1fr 3rem 3rem 3rem 4rem 3rem 4rem 4rem 3rem" }}>
          <span>Hold / Manager</span>
          <span className="text-right">Race</span>
          <span className="text-right">Kapt.</span>
          <span className="text-right">Pred.</span>
          <span className="text-right">Trans.</span>
          <span className="text-right">#T</span>
          <span className="text-right">Forv.</span>
          <span className="text-right">Faktisk</span>
          <span className="text-right">Δ</span>
        </div>
        <div className="divide-y divide-border">
          {filtered.map(row => {
            const isMismatch = row.diff !== 0;
            const isOpen = expanded === row.manager.id;
            return (
              <div key={row.manager.id}>
                <button
                  onClick={() => setExpanded(isOpen ? null : row.manager.id)}
                  className={`w-full grid gap-1 items-center px-3 py-2 text-sm text-left hover:bg-secondary/30 ${isMismatch ? "bg-destructive/5" : ""}`}
                  style={{ gridTemplateColumns: "1fr 3rem 3rem 3rem 4rem 3rem 4rem 4rem 3rem" }}
                >
                  <div className="min-w-0">
                    <span className="font-medium text-foreground truncate block text-xs">{row.manager.team_name}</span>
                    <span className="text-[11px] text-muted-foreground truncate block">{row.manager.name}</span>
                  </div>
                  <span className="text-right text-xs text-muted-foreground">{row.racePts}</span>
                  <span className="text-right text-xs text-muted-foreground">{row.capPts}</span>
                  <span className="text-right text-xs text-muted-foreground">{row.predPts}</span>
                  <span className="text-right text-xs text-muted-foreground">-{row.transferCost}</span>
                  <span className="text-right text-xs text-muted-foreground">
                    {row.transferCount}
                    {row.freeTransfers > 0 && <span className="text-[10px] text-muted-foreground/70"> ({row.freeTransfers}F)</span>}
                  </span>
                  <span className="text-right text-xs font-medium text-foreground">{row.expected}</span>
                  <span className="text-right text-xs font-medium text-foreground">{row.manager.total_points}</span>
                  <span className={`text-right font-display font-bold text-xs ${isMismatch ? "text-destructive" : "text-green-500"}`}>
                    {row.diff > 0 ? `+${row.diff}` : row.diff}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-3 py-3 bg-background/50 border-t border-border">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Pr. runde</div>
                    {row.rounds.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Ingen runder beregnet endnu.</p>
                    ) : (
                      <div className="space-y-1">
                        {row.rounds
                          .slice()
                          .sort((a, b) => (raceMap.get(a.race_id)?.round_number || 0) - (raceMap.get(b.race_id)?.round_number || 0))
                          .map(r => {
                            const race = raceMap.get(r.race_id);
                            return (
                              <div
                                key={r.race_id}
                                className="grid gap-1 items-center text-xs px-2 py-1 rounded bg-secondary/40"
                                style={{ gridTemplateColumns: "1fr 3rem 3rem 3rem 4rem" }}
                              >
                                <span className="text-foreground truncate">
                                  R{race?.round_number ?? "?"} – {race?.name ?? "Ukendt løb"}
                                </span>
                                <span className="text-right text-muted-foreground">{r.race_points}</span>
                                <span className="text-right text-muted-foreground">{r.captain_bonus}</span>
                                <span className="text-right text-muted-foreground">{r.prediction_points}</span>
                                <span className="text-right font-medium text-foreground">{r.total}</span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                    <div className="text-[11px] text-muted-foreground mt-2">
                      Forventet = race + kaptajn + predictions − transferomkostninger.
                      {row.diff !== 0 && " Klik 'Genberegn alle' for at synkronisere."}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">Ingen managere matcher.</div>
          )}
        </div>
      </div>
    </div>
  );
}