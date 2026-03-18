import { CreditCard, ShieldCheck, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/PageLayout";
import { useToast } from "@/hooks/use-toast";

export default function PaymentPage() {
  const { toast } = useToast();

  function handlePay() {
    // TODO: Replace with Stripe Checkout session redirect
    toast({
      title: "Stripe er ikke konfigureret endnu",
      description: "Betalingsintegration kommer snart. Kontakt admin for adgang.",
      variant: "destructive",
    });
  }

  return (
    <PageLayout>
      <div className="container flex min-h-[60vh] items-center justify-center py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-racing-red/10">
              <Flag className="h-8 w-8 text-racing-red" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Tilmelding til DASU Race Manager 2026
            </h1>
            <p className="text-sm text-muted-foreground">
              Betal tilmeldingsgebyret for at oprette dit fantasy-hold
            </p>
          </div>

          {/* Price Card */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tilmeldingsgebyr</span>
              <span className="font-display text-3xl font-bold text-foreground">
                50 <span className="text-lg text-muted-foreground">kr.</span>
              </span>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-racing-red" />
                <span>Engangsbetaling – ingen abonnement</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-racing-red" />
                <span>Giver adgang til at vælge dit hold for hele sæsonen</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-racing-red" />
                <span>Sikker betaling via Stripe</span>
              </div>
            </div>

            <Button
              onClick={handlePay}
              className="w-full bg-gradient-racing py-3 font-display text-base font-semibold text-primary-foreground shadow-racing hover:scale-105 transition-transform"
            >
              <CreditCard className="h-5 w-5" />
              Betal med kort
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Ved at betale accepterer du vilkårene for DASU Race Manager 2026
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
