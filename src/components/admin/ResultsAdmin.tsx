import { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Upload, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { fetchDrivers, fetchRaces, fetchRaceResults, upsertRaceResult, recalculateManagerPoints, SESSION_TYPES, SESSION_LABELS, type Driver, type Race } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type CellData = { position: string; dnf: boolean };
type GridData = Record<string, Record<string, CellData>>; // driverId -> sessionType -> data

export default function ResultsAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: races = [] } = useQuery({ queryKey: ["races"], queryFn: fetchRaces });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });
  const { data: allResults = [] } = useQuery({ queryKey: ["race_results"], queryFn: () => fetchRaceResults() });
  const [selectedRace, setSelectedRace] = useState("");
  const [grid, setGrid] = useState<GridData>({});
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [uploadSession, setUploadSession] = useState<string>(SESSION_TYPES[0]);

  // Track which rounds have results
  const roundsWithResults = new Set(allResults.map(r => r.race_id));

  const initGrid = useCallback(async (raceId: string) => {
    setSelectedRace(raceId);
    const init: GridData = {};
    drivers.forEach((d) => {
      init[d.id] = {};
      SESSION_TYPES.forEach((s) => {
        init[d.id][s] = { position: "", dnf: false };
      });
    });

    const existing = await fetchRaceResults(raceId);
    existing.forEach((r) => {
      if (init[r.driver_id]?.[r.session_type]) {
        init[r.driver_id][r.session_type] = {
          position: r.position !== null ? String(r.position) : "",
          dnf: r.dnf,
        };
      }
    });
    setGrid(init);
  }, [drivers]);

  function updateCell(driverId: string, session: string, field: keyof CellData, value: any) {
    setGrid((prev) => ({
      ...prev,
      [driverId]: {
        ...prev[driverId],
        [session]: {
          ...prev[driverId][session],
          [field]: value,
          ...(field === "dnf" && value ? { position: "" } : {}),
        },
      },
    }));
  }

  async function handleSaveAll() {
    if (!selectedRace) return;
    setSaving(true);
    try {
      let count = 0;
      for (const [driverId, sessions] of Object.entries(grid)) {
        for (const [session, data] of Object.entries(sessions)) {
          if (!data.position && !data.dnf) continue;
          await upsertRaceResult({
            race_id: selectedRace,
            driver_id: driverId,
            session_type: session,
            position: data.dnf ? null : Number(data.position) || null,
            fastest_lap: false,
            pole_position: false,
            dnf: data.dnf,
            points: 0,
          });
          count++;
        }
      }
      await recalculateManagerPoints();
      queryClient.invalidateQueries({ queryKey: ["race_results"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      toast({ title: `${count} resultater gemt for alle sessioner ✅` });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleNotifyResults() {
    if (!selectedRace) return;
    setNotifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-results", {
        body: { race_id: selectedRace },
      });
      if (error) throw error;
      toast({ title: `Resultat-notifikation sendt til ${data?.sent || 0} spillere ✅` });
    } catch (err: any) {
      toast({ title: "Fejl ved afsendelse: " + err.message, variant: "destructive" });
    }
    setNotifying(false);
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedRace) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split("\n");
      if (lines.length < 2) {
        toast({ title: "CSV-fil er tom", variant: "destructive" });
        return;
      }

      const newGrid = { ...grid };
      let matched = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/[,;\t]/).map((c) => c.trim());
        if (cols.length < 2) continue;

        const pos = cols[0]?.toUpperCase();
        const carNum = parseInt(cols[1]);
        const driver = drivers.find((d) => d.car_number === carNum);
        if (!driver) continue;

        if (!newGrid[driver.id]) {
          newGrid[driver.id] = {};
          SESSION_TYPES.forEach((s) => {
            newGrid[driver.id][s] = { position: "", dnf: false };
          });
        }

        if (!pos) continue;

        if (pos === "DNF") {
          newGrid[driver.id][uploadSession] = { position: "", dnf: true };
        } else {
          const p = parseInt(pos);
          if (!isNaN(p)) {
            newGrid[driver.id][uploadSession] = { position: String(p), dnf: false };
          }
        }
        matched++;
      }

      setGrid(newGrid);
      toast({ title: `${matched} kørere indlæst til ${SESSION_LABELS[uploadSession]}` });
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  const sessionCount = (session: string) => {
    if (!selectedRace) return 0;
    return Object.values(grid).filter((s) => s[session]?.position || s[session]?.dnf).length;
  };

  return (
    <div className="space-y-4">
      {/* Round selector with status indicators */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-sm text-muted-foreground mr-1">Runde:</span>
        {races.map((r) => {
          const hasResults = roundsWithResults.has(r.id);
          return (
            <Button
              key={r.id}
              variant={selectedRace === r.id ? "default" : "outline"}
              onClick={() => initGrid(r.id)}
              className="font-display relative"
              size="sm"
            >
              R{r.round_number}
              {hasResults && (
                <CheckCircle2 className="h-3 w-3 text-success absolute -top-1 -right-1" />
              )}
            </Button>
          );
        })}
      </div>

      {selectedRace && (
        <>
          {/* Upload + Save actions */}
          <div className="flex gap-2 items-center flex-wrap">
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCSVUpload} />
            <select
              value={uploadSession}
              onChange={(e) => setUploadSession(e.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-sm font-display"
            >
              {SESSION_TYPES.map((s) => (
                <option key={s} value={s}>{SESSION_LABELS[s]}</option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="font-display">
              <Upload className="h-4 w-4 mr-2" />Upload CSV
            </Button>
            <Button onClick={handleSaveAll} disabled={saving} className="bg-gradient-racing text-primary-foreground font-display" size="sm">
              <Save className="h-4 w-4 mr-2" />{saving ? "Gemmer..." : "Gem alle sessioner"}
            </Button>
            {roundsWithResults.has(selectedRace) && (
              <Button onClick={handleNotifyResults} disabled={notifying} variant="outline" size="sm" className="font-display">
                <Mail className="h-4 w-4 mr-2" />{notifying ? "Sender..." : "Send resultat-email"}
              </Button>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              CSV-format: placering, bil_nr (brug "DNF" for udgåede)
            </span>
          </div>

          {/* Spreadsheet-style table */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/80">
                  <th className="text-left px-3 py-2 font-display text-foreground sticky left-0 bg-secondary/80 min-w-[140px]">Kører</th>
                  {SESSION_TYPES.map((s) => (
                    <th key={s} className="text-center px-2 py-2 font-display text-foreground min-w-[80px]">
                      <div>{SESSION_LABELS[s]}</div>
                      <div className="text-xs font-normal text-muted-foreground">{sessionCount(s)}/{drivers.length}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drivers.map((d, idx) => (
                  <tr key={d.id} className={`border-t border-border ${idx % 2 === 0 ? "bg-card" : "bg-secondary/20"}`}>
                    <td className={`px-3 py-1.5 font-medium text-foreground sticky left-0 ${idx % 2 === 0 ? "bg-card" : "bg-secondary/20"}`}>
                      <span className="text-muted-foreground">#{d.car_number}</span>{" "}
                      <span className="truncate">{d.name}</span>
                    </td>
                    {SESSION_TYPES.map((s) => {
                      const cell = grid[d.id]?.[s];
                      return (
                        <td key={s} className="px-1 py-1 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              type="number"
                              min={1}
                              max={30}
                              placeholder="–"
                              className="w-14 h-7 text-center text-sm bg-card border-border px-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                              value={cell?.position || ""}
                              disabled={cell?.dnf}
                              onChange={(e) => updateCell(d.id, s, "position", e.target.value)}
                            />
                            <label className="flex items-center gap-0.5 cursor-pointer" title="DNF">
                              <input
                                type="checkbox"
                                className="accent-destructive h-3.5 w-3.5"
                                checked={cell?.dnf || false}
                                onChange={(e) => updateCell(d.id, s, "dnf", e.target.checked)}
                              />
                              <span className="text-[10px] text-destructive font-bold">DNF</span>
                            </label>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
