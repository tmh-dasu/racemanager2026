import { useQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import { fetchCaptainSelections, type Driver, type CaptainSelection } from "@/lib/api";
import { Button } from "@/components/ui/button";

const TIER_LABELS: Record<string, string> = { gold: "Guld", silver: "Sølv", bronze: "Bronze" };
const TIER_EMOJI: Record<string, string> = { gold: "🥇", silver: "🥈", bronze: "🥉" };

interface Props {
  swapOutDriver?: Driver;
  swapInDriver?: Driver;
  transferCost: number;
  managerId?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function TransferConfirmContent({ swapOutDriver, swapInDriver, transferCost, managerId, onCancel, onConfirm }: Props) {
  const { data: captainSelections = [] } = useQuery({
    queryKey: ["captain_selections", managerId],
    queryFn: () => fetchCaptainSelections(managerId!),
    enabled: !!managerId,
  });

  const tier = swapOutDriver?.tier || "bronze";
  const tierCaptainCount = captainSelections.filter((c) => c.driver_id === swapOutDriver?.id).length;

  const tierRemaining = Math.max(0, 2 - tierCaptainCount);
  const tierRemaining = Math.max(0, 2 - tierCaptainCount);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-secondary/50 p-4 space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-destructive font-semibold">Ud:</span>
          <span className="text-foreground">#{swapOutDriver?.car_number} {swapOutDriver?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-success font-semibold">Ind:</span>
          <span className="text-foreground">#{swapInDriver?.car_number} {swapInDriver?.name}</span>
        </div>
      </div>

      {/* Captaincy budget info for this tier */}
      <div className="rounded-lg border border-border bg-secondary/30 p-3">
        <div className="flex items-center gap-2 mb-1">
          <Crown className="h-4 w-4 text-gold" />
          <span className="text-sm font-display font-semibold text-foreground">Captaincy-budget for {TIER_EMOJI[tier]} {TIER_LABELS[tier]}-pladsen</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {tierRemaining === 0
            ? `Alle 2 captaincies for ${TIER_LABELS[tier]}-pladsen er brugt. Den nye kører kan ikke captaines.`
            : `${tierRemaining}/2 captaincies tilbage. Den nye kører overtager dette budget.`}
        </p>
      </div>

      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center">
        <p className="text-sm text-muted-foreground">Pointfradrag</p>
        <p className="font-display text-2xl font-bold text-destructive">−{transferCost} point</p>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Fradraget er permanent og kan ikke fortrydes.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Annuller</Button>
        <Button onClick={onConfirm} className="flex-1 bg-gradient-racing text-primary-foreground font-display">
          Bekræft transfer
        </Button>
      </div>
    </div>
  );
}
