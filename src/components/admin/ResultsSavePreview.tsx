import { useMemo } from "react";
import { ArrowDown, ArrowUp, Trophy, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SESSION_LABELS, type Driver, type Manager, type ManagerRoundPoints } from "@/lib/api";

export interface PendingResult {
  driver_id: string;
  session_type: string;
  points: number;
}
export interface ExistingResult {
  driver_id: string;
  session_type: string;
  points: number;
}

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  saving: boolean;
  raceId: string;
  raceLabel: string;
  pending: PendingResult[];
  existing: ExistingResult[];
  drivers: Driver[];
  managers: Manager[];
  roundPoints: ManagerRoundPoints[];
}

export default function ResultsSavePreview({
  open, onCancel, onConfirm, saving, raceId, raceLabel, pending, existing, drivers, managers, roundPoints,
}: Props) {
  const preview = useMemo(() => {
    const key = (d: string, s: string) => `${d}|${s}`;
    const oldMap = new Map(existing.map((r) => [key(r.driver_id, r.session_type), r.points]));
    // New state = existing rows overwritten by pending rows (save is an upsert)
    const newMap = new Map(oldMap);
    pending.forEach((r) => newMap.set(key(r.driver_id, r.session_type), r.points));

    const resultChanges = Array.from(new Set([...oldMap.keys(), ...newMap.keys()]))
      .map((k) => {
        const [driverId, session] = k.split("|");
        return { driverId, session, oldPts: oldMap.get(k) ?? 0, newPts: newMap.get(k) ?? 0 };
      })
      .filter((c) => c.oldPts !== c.newPts)
      .sort((a, b) => a.session.localeCompare(b.session) || b.newPts - a.newPts);

    const driverTotal = (map: Map<string, number>, id: string) =>
      ["qualifying", "heat1", "heat2", "heat3"].reduce((s, sess) => s + (map.get(key(id, sess)) ?? 0), 0);

    const rp = roundPoints.filter((r) => r.race_id === raceId);
    const deltaByManager = new Map<string, { oldRound: number; newRound: number }>();
    rp.forEach((r) => {
      const team = r.team_snapshot || [];
      const ids = r.captain_driver_id ? [...team, r.captain_driver_id] : team;
      const oldSum = ids.reduce((s, id) => s + driverTotal(oldMap, id), 0);
      const newSum = ids.reduce((s, id) => s + driverTotal(newMap, id), 0);
      deltaByManager.set(r.manager_id, { oldRound: r.total, newRound: r.total + (newSum - oldSum) });
    });

    const rows = managers.map((m) => {
      const d = deltaByManager.get(m.id);
      const delta = d ? d.newRound - d.oldRound : 0;
      return { m, oldTotal: m.total_points, newTotal: m.total_points + delta, delta, oldRound: d?.oldRound, newRound: d?.newRound };
    });
    const oldRank = new Map([...rows].sort((a, b) => b.oldTotal - a.oldTotal).map((r, i) => [r.m.id, i + 1]));
    const ranked = [...rows].sort((a, b) => b.newTotal - a.newTotal).map((r, i) => ({ ...r, oldRank: oldRank.get(r.m.id)!, newRank: i + 1 }));
    const changed = ranked.filter((r) => r.delta !== 0 || r.oldRank !== r.newRank);

    const withRound = rows.filter((r) => r.oldRound !== undefined);
    const best = (f: (r: typeof rows[number]) => number) => {
      if (!withRound.length) return [];
      const max = Math.max(...withRound.map(f));
      return withRound.filter((r) => f(r) === max).map((r) => ({ name: r.m.team_name, pts: max }));
    };
    const oldWinners = best((r) => r.oldRound!);
    const newWinners = best((r) => r.newRound!);
    const winnerChanged = oldWinners.map((w) => w.name).sort().join() !== newWinners.map((w) => w.name).sort().join();

    return { resultChanges, changed, oldWinners, newWinners, winnerChanged, affected: changed.filter((r) => r.delta !== 0).length };
  }, [pending, existing, roundPoints, raceId, managers]);

  const dName = (id: string) => drivers.find((d) => d.id === id)?.name || "Ukendt";
  const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">Forhåndsvisning — {raceLabel}</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-4 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Resultatændringer" value={preview.resultChanges.length} />
            <Stat label="Hold med nye point" value={preview.affected} />
            <Stat label="Rundevinder ændres" value={preview.winnerChanged ? "Ja" : "Nej"} warn={preview.winnerChanged} />
          </div>

          {/* Round winner */}
          <section className={`rounded-lg border p-3 ${preview.winnerChanged ? "border-destructive/50 bg-destructive/5" : "border-border"}`}>
            <div className="flex items-center gap-2 mb-2 font-display font-semibold text-foreground">
              <Trophy className="h-4 w-4 text-gold" /> Rundevinder
              {preview.winnerChanged && <span className="text-xs text-destructive font-bold flex items-center gap-1"><AlertCircle className="h-3 w-3" />Ændres — tjek evt. udtrukne præmier</span>}
            </div>
            {preview.oldWinners.length === 0 ? (
              <p className="text-muted-foreground text-xs">Ingen beregnede rundepoint endnu for denne runde.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><p className="text-muted-foreground">Nu</p>{preview.oldWinners.map((w) => <p key={w.name} className="text-foreground">{w.name} ({w.pts})</p>)}</div>
                <div><p className="text-muted-foreground">Efter</p>{preview.newWinners.map((w) => <p key={w.name} className="font-semibold text-foreground">{w.name} ({w.pts})</p>)}</div>
              </div>
            )}
          </section>

          {/* Result changes */}
          <section>
            <h3 className="font-display font-semibold text-foreground mb-1">Kørerresultater</h3>
            {preview.resultChanges.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ingen ændringer i point.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-muted-foreground"><tr className="border-b border-border">
                  <th className="text-left py-1">Session</th><th className="text-left">Kører</th>
                  <th className="text-right">Gammel</th><th className="text-right">Ny</th><th className="text-right">Δ</th>
                </tr></thead>
                <tbody>
                  {preview.resultChanges.map((c) => (
                    <tr key={c.driverId + c.session} className="border-b border-border/50">
                      <td className="py-1 text-muted-foreground">{SESSION_LABELS[c.session] || c.session}</td>
                      <td className="text-foreground">{dName(c.driverId)}</td>
                      <td className="text-right text-muted-foreground">{c.oldPts}</td>
                      <td className="text-right text-foreground">{c.newPts}</td>
                      <td className={`text-right font-bold ${c.newPts > c.oldPts ? "text-success" : "text-destructive"}`}>{fmt(c.newPts - c.oldPts)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Standings */}
          <section>
            <h3 className="font-display font-semibold text-foreground mb-1">Stilling (kun hold der ændres)</h3>
            {preview.changed.length === 0 ? (
              <p className="text-xs text-muted-foreground">Stillingen er uændret.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-muted-foreground"><tr className="border-b border-border">
                  <th className="text-left py-1">Placering</th><th className="text-left">Hold</th>
                  <th className="text-right">Gamle point</th><th className="text-right">Nye point</th><th className="text-right">Δ</th>
                </tr></thead>
                <tbody>
                  {preview.changed.map((r) => {
                    const move = r.oldRank - r.newRank;
                    return (
                      <tr key={r.m.id} className="border-b border-border/50">
                        <td className="py-1 whitespace-nowrap">
                          <span className="text-foreground font-bold">{r.newRank}</span>
                          <span className="text-muted-foreground"> (fra {r.oldRank})</span>
                          {move > 0 && <ArrowUp className="inline h-3 w-3 text-success ml-1" />}
                          {move < 0 && <ArrowDown className="inline h-3 w-3 text-destructive ml-1" />}
                        </td>
                        <td className="text-foreground truncate max-w-[200px]">{r.m.team_name}</td>
                        <td className="text-right text-muted-foreground">{r.oldTotal}</td>
                        <td className="text-right text-foreground">{r.newTotal}</td>
                        <td className={`text-right font-bold ${r.delta > 0 ? "text-success" : r.delta < 0 ? "text-destructive" : "text-muted-foreground"}`}>{fmt(r.delta)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>Annullér</Button>
          <Button onClick={onConfirm} disabled={saving} className="bg-gradient-racing text-primary-foreground font-display">
            {saving ? "Gemmer..." : "Bekræft og gem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div className={`rounded border p-2 ${warn ? "border-destructive/50 bg-destructive/5" : "border-border bg-secondary/30"}`}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`font-display text-lg font-bold ${warn ? "text-destructive" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
