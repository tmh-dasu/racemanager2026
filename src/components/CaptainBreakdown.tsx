import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Driver, Race, ManagerRoundPoints } from "@/lib/api";

const TIER_BADGE: Record<string, { label: string; className: string }> = {
  gold: { label: "Guld", className: "bg-gold/20 text-gold border-gold/40" },
  silver: { label: "Sølv", className: "bg-silver/20 text-silver border-silver/40" },
  bronze: { label: "Bronze", className: "bg-bronze/20 text-bronze border-bronze/40" },
};

interface Props {
  roundPoints: Pick<ManagerRoundPoints, "race_id" | "captain_bonus" | "captain_driver_id">[];
  races: Race[];
  drivers: Driver[];
  /** Start folded out (used on public team pages). */
  defaultOpen?: boolean;
}

export default function CaptainBreakdown({ roundPoints, races, drivers, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const rows = useMemo(() => {
    const raceMap = new Map(races.map((r) => [r.id, r]));
    return roundPoints
      .map((rp) => {
        const race = raceMap.get(rp.race_id);
        const driver = drivers.find((d) => d.id === rp.captain_driver_id);
        return {
          raceId: rp.race_id,
          roundNumber: race?.round_number ?? 0,
          raceName: race?.name ?? "Ukendt løb",
          driver,
          bonus: rp.captain_bonus,
        };
      })
      .sort((a, b) => a.roundNumber - b.roundNumber);
  }, [roundPoints, races, drivers]);

  const total = rows.reduce((s, r) => s + r.bonus, 0);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-secondary/30"
      >
        <Crown className="h-4 w-4 text-gold shrink-0" />
        <span className="font-display font-semibold text-foreground">Holdkaptajn pr. runde</span>
        <span className="ml-auto font-display font-bold text-gold">+{total}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          <div className="space-y-1">
            {rows.map((row) => {
              const tier = row.driver ? TIER_BADGE[row.driver.tier] : null;
              return (
                <div
                  key={row.raceId}
                  className="flex items-center gap-2 rounded bg-secondary/50 px-3 py-2 text-sm"
                >
                  <span className="font-display font-bold text-muted-foreground shrink-0 w-8">
                    R{row.roundNumber}
                  </span>
                  <div className="min-w-0 flex-1">
                    {row.driver ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate text-foreground">{row.driver.name}</span>
                        {tier && (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${tier.className}`}>
                            {tier.label}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Ingen holdkaptajn valgt</span>
                    )}
                    <p className="text-[11px] text-muted-foreground truncate">{row.raceName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-gold">+{row.bonus}</p>
                    <p className="text-[11px] text-muted-foreground">bonus</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-xs text-muted-foreground">Bonus i alt</span>
            <span className="font-display font-bold text-gold">+{total}</span>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Din holdkaptajns point for hele arrangementet (alle 4 sessioner) tæller dobbelt — bonussen er
            præcis lig kaptajnens point i runden. Kører kaptajnen fx 47 point, får du 47 point + 47 i bonus.
            Ingen kaptajn valgt inden deadline = ingen bonus.{" "}
            <Link to="/regler" className="text-primary underline underline-offset-2">
              Se regler
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
