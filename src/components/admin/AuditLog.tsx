import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AuditEntry {
  id: number;
  table_name: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  row_id: string | null;
  actor_user_id: string | null;
  actor_role: string | null;
  old_data: any;
  new_data: any;
  created_at: string;
}

const TABLES = ["all", "transfers", "race_results", "captain_selections", "manager_drivers", "prediction_answers"];

const OP_BADGE: Record<string, string> = {
  INSERT: "bg-success/20 text-success border-success/40",
  UPDATE: "bg-amber-100 text-amber-700 border-amber-300",
  DELETE: "bg-destructive/20 text-destructive border-destructive/40",
};

function formatDanish(iso: string) {
  return new Date(iso).toLocaleString("da-DK", { dateStyle: "short", timeStyle: "medium" });
}

function diffSummary(entry: AuditEntry): string {
  if (entry.operation === "INSERT") return JSON.stringify(entry.new_data);
  if (entry.operation === "DELETE") return JSON.stringify(entry.old_data);
  // UPDATE: show changed fields only
  const o = entry.old_data || {}; const n = entry.new_data || {};
  const changes: string[] = [];
  for (const k of Object.keys(n)) {
    if (JSON.stringify(o[k]) !== JSON.stringify(n[k])) {
      changes.push(`${k}: ${JSON.stringify(o[k])} → ${JSON.stringify(n[k])}`);
    }
  }
  return changes.join(", ") || "(no changes)";
}

export default function AuditLog() {
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [limit, setLimit] = useState(100);
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ["audit_log", tableFilter, limit],
    queryFn: async () => {
      let q = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(limit);
      if (tableFilter !== "all") q = q.eq("table_name", tableFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AuditEntry[];
    },
  });

  // Resolve actor emails for display
  const actorIds = Array.from(new Set(entries.map((e) => e.actor_user_id).filter(Boolean) as string[]));
  const { data: actorMap = {} } = useQuery({
    queryKey: ["audit_actors", actorIds.join(",")],
    enabled: actorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("managers").select("user_id, name, team_name").in("user_id", actorIds);
      const m: Record<string, { name: string; team: string }> = {};
      (data || []).forEach((r: any) => { m[r.user_id] = { name: r.name, team: r.team_name }; });
      return m;
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Tabel:</span>
        {TABLES.map((t) => (
          <Button
            key={t}
            size="sm"
            variant={tableFilter === t ? "default" : "outline"}
            onClick={() => setTableFilter(t)}
            className="font-display text-xs"
          >
            {t}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()}>Opdater</Button>
          <Button size="sm" variant="outline" onClick={() => setLimit(limit + 100)}>Vis flere</Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Indlæser…</p>}
      {!isLoading && entries.length === 0 && <p className="text-sm text-muted-foreground">Ingen events.</p>}

      <div className="space-y-1">
        {entries.map((e) => {
          const actor = e.actor_user_id ? actorMap[e.actor_user_id] : null;
          const isOpen = expanded === e.id;
          return (
            <div key={e.id} className="rounded border border-border bg-card text-xs">
              <button
                onClick={() => setExpanded(isOpen ? null : e.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/50"
              >
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${OP_BADGE[e.operation]}`}>{e.operation}</Badge>
                <span className="font-mono text-muted-foreground">{e.table_name}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{formatDanish(e.created_at)}</span>
                <span className="ml-auto text-muted-foreground">
                  {actor ? `${actor.name} (${actor.team})` : e.actor_role || "system"}
                </span>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 space-y-2 border-t border-border">
                  <p className="text-[11px] text-muted-foreground mt-2">Row ID: <span className="font-mono">{e.row_id}</span></p>
                  <p className="text-[11px] text-muted-foreground">Actor ID: <span className="font-mono">{e.actor_user_id || "—"}</span></p>
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">Ændringer:</p>
                    <pre className="text-[11px] bg-secondary/30 rounded p-2 overflow-x-auto whitespace-pre-wrap">{diffSummary(e)}</pre>
                  </div>
                  {e.operation === "UPDATE" && (
                    <details>
                      <summary className="text-[11px] cursor-pointer text-muted-foreground">Vis fuldt before/after</summary>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <pre className="text-[10px] bg-secondary/30 rounded p-2 overflow-x-auto">{JSON.stringify(e.old_data, null, 2)}</pre>
                        <pre className="text-[10px] bg-secondary/30 rounded p-2 overflow-x-auto">{JSON.stringify(e.new_data, null, 2)}</pre>
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}