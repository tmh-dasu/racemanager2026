import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, AlertTriangle, LogOut, ShieldAlert, History } from "lucide-react";
import { fetchManagerDrivers, fetchDrivers, fetchRaceResults, fetchRaces, fetchSettings, fetchManagers, performTransfer, performEmergencyTransfer, fetchManagerByUserId, fetchTransfers, fetchAllCaptainSelections, fetchAllPredictionAnswers, fetchAllTransfers, computePointBreakdown, getTransferCostForTier } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import PageLayout from "@/components/PageLayout";
import ShareTeamCard from "@/components/ShareTeamCard";
import CaptainSelector from "@/components/CaptainSelector";
import PredictionPanel from "@/components/PredictionPanel";
import TransferConfirmContent from "@/components/TransferConfirmContent";

export default function MyTeamPage() {
  const { toast } = useToast();
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: manager, refetch: refetchManager } = useQuery({
    queryKey: ["manager", user?.id],
    queryFn: () => fetchManagerByUserId(user!.id),
    enabled: !!user,
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
  const { data: allManagers = [] } = useQuery({ queryKey: ["managers"], queryFn: fetchManagers });
  const { data: myTransfers = [] } = useQuery({
    queryKey: ["transfers", manager?.id],
    queryFn: () => fetchTransfers(manager!.id),
    enabled: !!manager,
  });
  const { data: captainSelections = [] } = useQuery({ queryKey: ["all_captain_selections"], queryFn: fetchAllCaptainSelections });
  const { data: predAnswers = [] } = useQuery({ queryKey: ["all_prediction_answers"], queryFn: fetchAllPredictionAnswers });
  const { data: allTransfersData = [] } = useQuery({ queryKey: ["all_transfers"], queryFn: fetchAllTransfers });

  const completedRounds = useMemo(() => new Set(allResults.map(r => r.race_id)).size, [allResults]);

  // Auto deadline: 24h before next upcoming race
  const transferDeadline = useMemo(() => {
    const now = Date.now();
    const next = races
      .filter(r => r.race_date && new Date((r as any).race_end_date || r.race_date).getTime() > now)
      .sort((a, b) => new Date(a.race_date!).getTime() - new Date(b.race_date!).getTime())[0];
    if (!next?.race_date) return null;
    return new Date(new Date(next.race_date).getTime() - 24 * 60 * 60 * 1000);
  }, [races]);
  const deadlinePassed = transferDeadline ? new Date() >= transferDeadline : true;
  const transfersAllowed = (settings?.transfer_window_open ?? false) && !deadlinePassed;

  const breakdown = useMemo(() => {
    if (!manager) return null;
    return computePointBreakdown(
      manager.id,
      managerDrivers.map(md => ({ manager_id: md.manager_id, driver_id: md.driver_id })),
      allResults,
      captainSelections,
      predAnswers,
      allTransfersData,
      completedRounds,
    );
  }, [manager, managerDrivers, allResults, captainSelections, predAnswers, allTransfersData, completedRounds]);

  const myRank = manager ? allManagers.findIndex((m) => m.id === manager.id) + 1 : null;

  const [transferOpen, setTransferOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [swapOutId, setSwapOutId] = useState<string | null>(null);
  const [swapInId, setSwapInId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const myDriverIds = managerDrivers.map((md) => md.driver_id);
  const myDrivers = drivers.filter((d) => myDriverIds.includes(d.id));
  const withdrawnDrivers = myDrivers.filter((d) => d.withdrawn);
  const hasWithdrawnDriver = withdrawnDrivers.length > 0;

  // Check if a withdrawn driver has already been replaced with a free transfer
  const hasUsedFreeTransferFor = (driverId: string) =>
    myTransfers.some((t) => t.old_driver_id === driverId && t.is_free);

  const unreplacedWithdrawn = withdrawnDrivers.filter((d) => !hasUsedFreeTransferFor(d.id));
  const canEmergencyTransfer = unreplacedWithdrawn.length > 0;

  // For transfer: only show same-tier drivers that aren't withdrawn
  const swapOutDriver = drivers.find((d) => d.id === swapOutId);
  const availableDrivers = drivers.filter((d) => !myDriverIds.includes(d.id) && !d.withdrawn && (!swapOutDriver || d.tier === swapOutDriver.tier));

  const swapInDriver = drivers.find(d => d.id === swapInId);
  const transferCost = swapInDriver ? getTransferCostForTier(swapInDriver.tier) : 10;

  function getDriverPoints(driverId: string) {
    return allResults.filter((r) => r.driver_id === driverId).reduce((s, r) => s + r.points, 0);
  }

  function getDriverRoundPoints(driverId: string, raceId: string) {
    const r = allResults.find((x) => x.driver_id === driverId && x.race_id === raceId);
    return r?.points || 0;
  }

  async function handleTransfer() {
    if (!manager || !swapOutId || !swapInId) return;
    const oldDriver = drivers.find((d) => d.id === swapOutId);
    const newDriver = drivers.find((d) => d.id === swapInId);
    if (!oldDriver || !newDriver || oldDriver.tier !== newDriver.tier) {
      toast({ title: "Du kan kun bytte til en kører i samme kategori", variant: "destructive" });
      return;
    }

    try {
      await performTransfer(manager.id, swapOutId, swapInId, transferCost);
      queryClient.invalidateQueries({ queryKey: ["manager", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["manager_drivers", manager.id] });
      queryClient.invalidateQueries({ queryKey: ["transfers", manager.id] });
      setTransferOpen(false);
      setConfirmOpen(false);
      setSwapOutId(null);
      setSwapInId(null);
      toast({ title: `Transfer gennemført! ${transferCost} point fratrukket 🔄` });
      refetchManager();
    } catch (err: any) {
      toast({ title: "Fejl: " + err.message, variant: "destructive" });
    }
  }

  async function handleEmergencyTransfer() {
    if (!manager || !swapOutId || !swapInId) return;

    try {
      await performEmergencyTransfer(manager.id, swapOutId, swapInId);
      queryClient.invalidateQueries({ queryKey: ["manager", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["manager_drivers", manager.id] });
      queryClient.invalidateQueries({ queryKey: ["transfers", manager.id] });
      setEmergencyOpen(false);
      setSwapOutId(null);
      setSwapInId(null);
      toast({ title: "Gratis nødtransfer gennemført! Kører erstattet 🔄" });
      refetchManager();
    } catch (err: any) {
      toast({ title: "Fejl: " + err.message, variant: "destructive" });
    }
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Indlæser...</p>
        </div>
      </PageLayout>
    );
  }

  if (!user) {
    return (
      <PageLayout>
        <div className="container py-12 text-center space-y-4">
          <AlertTriangle className="mx-auto h-10 w-10 text-gold" />
          <h1 className="font-display text-2xl font-bold text-foreground">Log ind for at se dit hold</h1>
          <p className="text-muted-foreground">Du skal være logget ind for at se dit hold.</p>
          <Button onClick={() => navigate("/login")} className="bg-gradient-racing text-primary-foreground font-display">
            Log ind
          </Button>
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
          <p className="text-muted-foreground">Du har ikke oprettet et hold endnu.</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/vaelg-hold")} className="bg-gradient-racing text-primary-foreground font-display">
              Opret hold
            </Button>
            <Button onClick={signOut} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Log ud
            </Button>
          </div>
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
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-display text-3xl font-bold text-foreground">{manager.total_points}</p>
              <p className="text-xs text-muted-foreground">point i alt</p>
              {myRank && myRank > 0 && (
                <p className="text-xs text-muted-foreground">#{myRank} af {allManagers.length}</p>
              )}
            </div>
            <Button onClick={signOut} variant="ghost" size="icon" title="Log ud">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Point Breakdown */}
        {breakdown && (
          <div className="rounded-lg border border-border bg-card p-4 shadow-card">
            <p className="text-xs text-muted-foreground mb-2 font-display font-semibold">Pointopdeling</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Race-point</p>
                <p className="font-display text-lg font-bold text-foreground">{breakdown.racePoints}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Holdkaptajn</p>
                <p className="font-display text-lg font-bold text-gold">+{breakdown.captainBonus}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Predictions</p>
                <p className="font-display text-lg font-bold text-success">+{breakdown.predictionPoints}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transfers</p>
                <p className={`font-display text-lg font-bold ${breakdown.transferCosts > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {breakdown.transferCosts > 0 ? `−${breakdown.transferCosts}` : "0"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Share */}
        <ShareTeamCard
          manager={manager}
          rank={myRank}
          totalManagers={allManagers.length}
          drivers={myDrivers}
          getDriverPoints={getDriverPoints}
        />

        {/* Transfer Window Status */}
        <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${transfersAllowed ? "bg-success animate-ping" : "bg-muted-foreground"}`}></span>
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${transfersAllowed ? "bg-success" : "bg-muted-foreground"}`}></span>
          </span>
          <span className="text-muted-foreground">
            {transfersAllowed
              ? "Transfervinduet er åbent"
              : deadlinePassed && settings?.transfer_window_open
                ? "Transfervinduet er lukket (deadline passeret)"
                : "Transfervinduet er lukket"}
          </span>
        </div>

        {/* Withdrawn Driver Warning */}
        {hasWithdrawnDriver && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <ShieldAlert className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-display font-semibold text-foreground">Kører udgået af klassen</p>
              <p className="text-sm text-muted-foreground mt-1">
                {withdrawnDrivers.map(d => d.name).join(", ")} er officielt udgået.
                {canEmergencyTransfer && " Du har et gratis nødtransfer til rådighed."}
              </p>
              {canEmergencyTransfer && (
                <Button
                  onClick={() => { setSwapOutId(unreplacedWithdrawn[0]?.id || null); setEmergencyOpen(true); }}
                  className="mt-2 bg-destructive text-destructive-foreground font-display font-semibold hover:bg-destructive/90"
                  size="sm"
                >
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  Gratis nødtransfer
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Transfer Button */}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => transfersAllowed
              ? setTransferOpen(true)
              : toast({ title: deadlinePassed ? "Deadline passeret (24t før løb)" : "Transfervinduet er lukket" })}
            disabled={!transfersAllowed}
            className="bg-accent text-accent-foreground font-display font-semibold hover:bg-accent/90"
          >
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Transfer
          </Button>
          <span className="text-xs text-muted-foreground">🥇 15 pts • 🥈 10 pts • 🥉 5 pts</span>
        </div>

        {/* Captain Selector */}
        {myDrivers.length > 0 && (
          <CaptainSelector managerId={manager.id} drivers={myDrivers.filter(d => !d.withdrawn)} races={races} />
        )}

        {/* Predictions */}
        <PredictionPanel managerId={manager.id} />

        {/* Drivers */}
        <div className="space-y-3">
          {myDrivers.map((d) => (
            <div key={d.id} className={`rounded-lg border p-4 shadow-card ${d.withdrawn ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-md font-display text-lg font-bold ${d.withdrawn ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground"}`}>
                  #{d.car_number}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`font-display font-semibold ${d.withdrawn ? "text-muted-foreground line-through" : "text-foreground"}`}>{d.name}</p>
                    {d.withdrawn && <span className="text-xs bg-destructive/20 text-destructive px-1.5 py-0.5 rounded font-display">Udgået</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{d.team}{d.club ? ` • ${d.club}` : ""}</p>
                  {d.quote && <p className="text-xs italic text-muted-foreground mt-0.5">"{d.quote}"</p>}
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

        {/* Transfer History */}
        {myTransfers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display font-semibold text-foreground">Transfer-historik</h2>
            </div>
            <div className="space-y-1">
              {myTransfers.map((t) => {
                const oldD = drivers.find((d) => d.id === t.old_driver_id);
                const newD = drivers.find((d) => d.id === t.new_driver_id);
                return (
                  <div key={t.id} className="flex items-center justify-between rounded bg-secondary/50 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-destructive">#{oldD?.car_number} {oldD?.name}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-success">#{newD?.car_number} {newD?.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`font-display font-bold ${t.is_free ? "text-success" : "text-destructive"}`}>
                        {t.is_free ? "Gratis" : `−${t.point_cost} pts`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString("da-DK")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">Transfer – Skift kører</DialogTitle>
            <DialogDescription>Du kan kun bytte til en kører inden for samme kategori. Koster 🥇 15 / 🥈 10 / 🥉 5 point.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Vælg kører at fjerne:</p>
              <div className="space-y-2">
                {myDrivers.filter(d => !d.withdrawn).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => { setSwapOutId(d.id); setSwapInId(null); }}
                    className={`w-full flex items-center gap-3 rounded-md border p-2 text-left transition ${swapOutId === d.id ? "border-destructive bg-destructive/10" : "border-border"}`}
                  >
                    <span className="font-display font-bold text-foreground">#{d.car_number}</span>
                    <span className="text-sm text-foreground">{d.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{d.tier === "gold" ? "🥇 Guld" : d.tier === "silver" ? "🥈 Sølv" : "🥉 Bronze"}</span>
                  </button>
                ))}
              </div>
            </div>
            {swapOutId && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Vælg ny kører ({swapOutDriver?.tier === "gold" ? "🥇 Guld" : swapOutDriver?.tier === "silver" ? "🥈 Sølv" : "🥉 Bronze"}):</p>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {availableDrivers.length === 0 && <p className="text-xs text-muted-foreground">Ingen ledige kørere i denne kategori.</p>}
                  {availableDrivers.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSwapInId(d.id)}
                      className={`w-full flex items-center gap-3 rounded-md border p-2 text-left transition ${
                        swapInId === d.id ? "border-success bg-success/10" : "border-border hover:border-success/50"
                      }`}
                    >
                      <span className="font-display font-bold text-foreground">#{d.car_number}</span>
                      <span className="text-sm text-foreground">{d.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{d.team}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!swapOutId || !swapInId}
              className="w-full bg-gradient-racing text-primary-foreground font-display shadow-racing"
            >
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Fortsæt til bekræftelse
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">Bekræft transfer</DialogTitle>
          </DialogHeader>
          <TransferConfirmContent
            swapOutDriver={swapOutDriver}
            swapInDriver={swapInDriver}
            transferCost={transferCost}
            managerId={manager?.id}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={handleTransfer}
          />
        </DialogContent>
      </Dialog>

      {/* Emergency Transfer Dialog */}
      <Dialog open={emergencyOpen} onOpenChange={setEmergencyOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">Gratis nødtransfer – Erstat udgået kører</DialogTitle>
            <DialogDescription>Du kan kun vælge en kører inden for samme kategori som den udgåede kører. Ingen pointfradrag.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {swapOutId && swapOutDriver && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm">
                <span className="text-destructive font-semibold">Udgået: </span>
                <span className="text-foreground">#{swapOutDriver.car_number} {swapOutDriver.name} ({swapOutDriver.tier === "gold" ? "🥇 Guld" : swapOutDriver.tier === "silver" ? "🥈 Sølv" : "🥉 Bronze"})</span>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Vælg erstatningskører:</p>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {availableDrivers.length === 0 && <p className="text-xs text-muted-foreground">Ingen ledige kørere i denne tier.</p>}
                {availableDrivers.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSwapInId(d.id)}
                    className={`w-full flex items-center gap-3 rounded-md border p-2 text-left transition ${
                      swapInId === d.id ? "border-success bg-success/10" : "border-border hover:border-success/50"
                    }`}
                  >
                    <span className="font-display font-bold text-foreground">#{d.car_number}</span>
                    <span className="text-sm text-foreground">{d.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{d.team}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-success/30 bg-success/10 p-3 text-center">
              <p className="text-sm font-display font-semibold text-success">Gratis – ingen pointfradrag</p>
            </div>
            <Button onClick={handleEmergencyTransfer} disabled={!swapOutId || !swapInId} className="w-full bg-destructive text-destructive-foreground font-display">
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Bekræft nødtransfer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
