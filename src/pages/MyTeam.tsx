import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Trophy, Zap, ArrowLeftRight, AlertTriangle } from "lucide-react";
import { fetchManagerByEmail, fetchManagerDrivers, fetchDrivers, fetchRaceResults, fetchRaces, fetchSettings, useJoker, type Manager, type Driver } from "@/lib/api";
import { formatDKR } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import PageLayout from "@/components/PageLayout";

export default function MyTeamPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [lookupEmail, setLookupEmail] = useState(searchParams.get("email") || "");

  const { data: manager, refetch: refetchManager } = useQuery({
    queryKey: ["manager", lookupEmail],
    queryFn: () => fetchManagerByEmail(lookupEmail),
    enabled: !!lookupEmail,
  });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });
  const { data: managerDrivers = [] } = useQuery({
    queryKey: ["manager_drivers", manager?.id],
    queryFn: () => fetchManagerDrivers(manager!.id),
    enabled: !!manager,
  });
  const { data: races = [] } = useQuery({ queryKey: ["races"], queryFn: fetchRaces });
  const { data: allResults = [] } = useQuery({ queryKey: ["race_results"], queryFn: () => fetchRaceResults() });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const [jokerOpen, setJokerOpen] = useState(false);
  const [swapOutId, setSwapOutId] = useState<string | null>(null);
  const [swapInId, setSwapInId] = useState<string | null>(null);

  const myDriverIds = managerDrivers.map((md) => md.driver_id);
  const myDrivers = drivers.filter((d) => myDriverIds.includes(d.id));
  const availableDrivers = drivers.filter((d) => !myDriverIds.includes(d.id));

  function getDriverPoints(driverId: string) {
    return allResults.filter((r) => r.driver_id === driverId).reduce((s, r) => s + r.points, 0);
  }

  function getDriverRoundPoints(driverId: string, raceId: string) {
    const r = allResults.find((x) => x.driver_id === driverId && x.race_id === raceId);
    return r?.points || 0;
  }

  async function handleJoker() {
    if (!manager || !swapOutId || !swapInId) return;
    const oldDriver = drivers.find((d) => d.id === swapOutId);
    const newDriver = drivers.find((d) => d.id === swapInId);
    if (!oldDriver || !newDriver) return;

    const priceDiff = newDriver.price - oldDriver.price;
    const newBudget = manager.budget_remaining - priceDiff;
    if (newBudget < 0) {
      toast({ title: "Ikke nok budget til dette skifte", variant: "destructive" });
      return;
    }

    try {
      await useJoker(manager.id, swapOutId, swapInId, newBudget);
      queryClient.invalidateQueries({ queryKey: ["manager", lookupEmail] });
      queryClient.invalidateQueries({ queryKey: ["manager_drivers", manager.id] });
      setJokerOpen(false);
      setSwapOutId(null);
      setSwapInId(null);
      toast({ title: "Joker brugt! Kører skiftet 🃏" });
      refetchManager();
    } catch (err: any) {
      toast({ title: "Fejl: " + err.message, variant: "destructive" });
    }
  }

  if (!lookupEmail) {
    return (
      <PageLayout>
        <div className="container py-12 space-y-4">
          <h1 className="font-display text-2xl font-bold text-foreground">Mit Hold</h1>
          <p className="text-muted-foreground">Indtast din email for at se dit hold</p>
          <div className="flex gap-2 max-w-md">
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-secondary border-border" />
            <Button onClick={() => setLookupEmail(email)} className="bg-gradient-racing text-primary-foreground font-display">
              Find hold
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!manager) {
    return (
      <PageLayout>
        <div className="container py-12 text-center space-y-4">
          <AlertTriangle className="mx-auto h-10 w-10 text-gold" />
          <h1 className="font-display text-2xl font-bold text-foreground">Intet hold fundet</h1>
          <p className="text-muted-foreground">Ingen hold fundet med email: {lookupEmail}</p>
          <Button onClick={() => { setLookupEmail(""); setEmail(""); }} variant="outline">Prøv igen</Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{manager.team_name}</h1>
            <p className="text-sm text-muted-foreground">{manager.name}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl font-bold text-foreground">{manager.total_points}</p>
            <p className="text-xs text-muted-foreground">point i alt</p>
          </div>
        </div>

        {/* Joker Status */}
        <div className="flex items-center gap-3">
          {!manager.joker_used ? (
            <Button
              onClick={() => settings?.transfer_window_open ? setJokerOpen(true) : toast({ title: "Transfervinduet er lukket" })}
              className="bg-success text-success-foreground font-display font-semibold hover:bg-success/90"
            >
              <Zap className="mr-2 h-4 w-4" />
              Joker tilgængelig
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4" />
              Joker brugt
            </div>
          )}
          <span className="text-xs text-muted-foreground">Budget: {formatDKR(Number(manager.budget_remaining))}</span>
        </div>

        {/* Drivers */}
        <div className="space-y-3">
          {myDrivers.map((d) => (
            <div key={d.id} className="rounded-lg border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-secondary font-display text-lg font-bold text-muted-foreground">
                  #{d.car_number}
                </div>
                <div className="flex-1">
                  <p className="font-display font-semibold text-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.team}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-bold text-foreground">{getDriverPoints(d.id)}</p>
                  <p className="text-xs text-muted-foreground">point</p>
                </div>
              </div>
              {races.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {races.map((race) => (
                    <div key={race.id} className="shrink-0 rounded bg-secondary px-2 py-1 text-center">
                      <p className="text-xs text-muted-foreground">R{race.round_number}</p>
                      <p className="font-display text-sm font-bold text-foreground">{getDriverRoundPoints(d.id, race.id)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Joker Dialog */}
      <Dialog open={jokerOpen} onOpenChange={setJokerOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">Brug Joker – Skift kører</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Vælg kører at fjerne:</p>
              <div className="space-y-2">
                {myDrivers.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSwapOutId(d.id)}
                    className={`w-full flex items-center gap-3 rounded-md border p-2 text-left transition ${swapOutId === d.id ? "border-destructive bg-destructive/10" : "border-border"}`}
                  >
                    <span className="font-display font-bold text-foreground">#{d.car_number}</span>
                    <span className="text-sm text-foreground">{d.name}</span>
                    <span className="ml-auto text-sm text-gold">{formatDKR(d.price)}</span>
                  </button>
                ))}
              </div>
            </div>
            {swapOutId && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Vælg ny kører:</p>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {availableDrivers.map((d) => {
                    const oldDriver = drivers.find((x) => x.id === swapOutId);
                    const priceDiff = d.price - (oldDriver?.price || 0);
                    const canAfford = manager.budget_remaining - priceDiff >= 0;
                    return (
                      <button
                        key={d.id}
                        onClick={() => canAfford && setSwapInId(d.id)}
                        disabled={!canAfford}
                        className={`w-full flex items-center gap-3 rounded-md border p-2 text-left transition ${
                          swapInId === d.id ? "border-success bg-success/10" : !canAfford ? "border-border opacity-40" : "border-border hover:border-success/50"
                        }`}
                      >
                        <span className="font-display font-bold text-foreground">#{d.car_number}</span>
                        <span className="text-sm text-foreground">{d.name}</span>
                        <span className="ml-auto text-sm text-gold">{d.price} mio</span>
                        {!canAfford && <span className="text-xs text-destructive">For dyr</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <Button onClick={handleJoker} disabled={!swapOutId || !swapInId} className="w-full bg-gradient-racing text-primary-foreground font-display shadow-racing">
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Bekræft joker-skifte
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
