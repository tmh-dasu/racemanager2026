import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Clock, Lock } from "lucide-react";
import { fetchCaptainSelections, setCaptainSelection, getNextRaceWithDeadline, getCaptaincyBudget, type Driver, type Race, type CaptainSelection } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface CaptainSelectorProps {
  managerId: string;
  drivers: Driver[];
  races: Race[];
}

export default function CaptainSelector({ managerId, drivers, races }: CaptainSelectorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const { data: captainSelections = [] } = useQuery({
    queryKey: ["captain_selections", managerId],
    queryFn: () => fetchCaptainSelections(managerId),
    enabled: !!managerId,
  });

  const nextRace = getNextRaceWithDeadline(races);
  const now = new Date();
  const isLocked = !nextRace || (nextRace.captain_deadline && new Date(nextRace.captain_deadline) <= now);

  const currentCaptainForNextRace = nextRace
    ? captainSelections.find((c) => c.race_id === nextRace.id)?.driver_id || null
    : null;

  async function handleSelect(driverId: string) {
    if (!nextRace || isLocked || submitting) return;
    
    const budget = getCaptaincyBudget(driverId, captainSelections.filter((c) => c.race_id !== nextRace.id));
    if (budget <= 0) {
      toast({ title: "Denne kører har brugt alle 2 captaincies", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await setCaptainSelection(managerId, nextRace.id, driverId);
      queryClient.invalidateQueries({ queryKey: ["captain_selections", managerId] });
      const driverName = drivers.find((d) => d.id === driverId)?.name || "";
      toast({ title: `${driverName} valgt som captain! 👑` });
    } catch (err: any) {
      toast({ title: "Fejl: " + err.message, variant: "destructive" });
    }
    setSubmitting(false);
  }

  const deadlineStr = nextRace?.captain_deadline
    ? new Date(nextRace.captain_deadline).toLocaleString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-gold" />
          <h2 className="font-display font-bold text-foreground">Captain-valg</h2>
        </div>
        {isLocked ? (
          <Badge className="bg-muted text-muted-foreground border-border">
            <Lock className="h-3 w-3 mr-1" />Låst
          </Badge>
        ) : deadlineStr ? (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40">
            <Clock className="h-3 w-3 mr-1" />Deadline: {deadlineStr}
          </Badge>
        ) : null}
      </div>

      {nextRace ? (
        <p className="text-sm text-muted-foreground">
          {isLocked 
            ? `Captain-valg for ${nextRace.name} er lukket.`
            : `Vælg captain for ${nextRace.name} — kørers point tæller dobbelt!`}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Intet kommende arrangement med captain-valg.</p>
      )}

      {!currentCaptainForNextRace && !isLocked && nextRace && (
        <p className="text-xs text-yellow-400">⚠️ Du har ikke valgt captain endnu — ingen bonus uden valg!</p>
      )}

      <div className="grid gap-2">
        {drivers.map((d) => {
          const remaining = getCaptaincyBudget(
            d.id,
            captainSelections.filter((c) => nextRace ? c.race_id !== nextRace.id : true)
          );
          const isCaptain = currentCaptainForNextRace === d.id;
          const canSelect = !isLocked && remaining > 0 && !submitting;

          return (
            <button
              key={d.id}
              onClick={() => canSelect && handleSelect(d.id)}
              disabled={!canSelect && !isCaptain}
              className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                isCaptain
                  ? "border-gold bg-gold/10 shadow-[0_0_12px_rgba(255,215,0,0.15)]"
                  : canSelect
                  ? "border-border bg-card hover:border-gold/50"
                  : "border-border bg-card opacity-50 cursor-not-allowed"
              }`}
            >
              {isCaptain && <Crown className="h-5 w-5 text-gold shrink-0" />}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary font-display text-sm font-bold text-muted-foreground">
                #{d.car_number}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-foreground truncate">{d.name}</p>
                <p className="text-xs text-muted-foreground">{d.team}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <span
                      key={i}
                      className={`inline-block h-2 w-2 rounded-full ${
                        i < remaining ? "bg-gold" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{remaining}/2 tilbage</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
