import { useState } from "react";
import { CreditCard, ShieldCheck, Flag, Ticket, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageLayout from "@/components/PageLayout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [voucherCode, setVoucherCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [paying, setPaying] = useState(false);

  async function handlePay() {
    if (!user) {
      navigate("/login");
      return;
    }
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment");
      if (error) throw error;
      if (data?.url) {
        window.location.assign(data.url);
      } else {
        throw new Error("Ingen betalingslink modtaget");
      }
    } catch (err: any) {
      toast({
        title: "Kunne ikke starte betaling",
        description: err.message || "Prøv igen senere",
        variant: "destructive",
      });
    }
    setPaying(false);
  }

  async function handleVoucher() {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!voucherCode.trim()) {
      toast({ title: "Indtast en voucher-kode", variant: "destructive" });
      return;
    }

    setValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-voucher", {
        body: { code: voucherCode },
      });

      if (error || !data?.success) {
        toast({
          title: data?.error || "Ugyldig voucher-kode",
          variant: "destructive",
        });
      } else {
        toast({ title: "Voucher indløst! 🎉" });
        navigate("/vaelg-hold?paid=true");
      }
    } catch {
      toast({ title: "Noget gik galt", variant: "destructive" });
    }
    setValidating(false);
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
              Tilmelding til DASU RaceManager 2026
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
                49 <span className="text-lg text-muted-foreground">kr.</span>
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
                <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-racing-red" />
                <span>Betal med MobilePay eller kort via Stripe</span>
              </div>
            </div>

            <Button
              onClick={handlePay}
              disabled={paying}
              className="w-full bg-gradient-racing py-3 font-display text-base font-semibold text-primary-foreground shadow-racing hover:scale-105 transition-transform"
            >
              <CreditCard className="h-5 w-5" />
              {paying ? "Starter betaling..." : "Betal med kort / MobilePay"}
            </Button>
          </div>

          {/* Voucher Section */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-gold" />
              <span className="font-display font-semibold text-foreground">Har du en voucher-kode?</span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Indtast kode"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                className="bg-secondary border-border uppercase"
                maxLength={50}
                onKeyDown={(e) => e.key === "Enter" && handleVoucher()}
              />
              <Button
                onClick={handleVoucher}
                disabled={validating || !voucherCode.trim()}
                variant="outline"
                className="shrink-0 border-gold text-gold hover:bg-gold/10 font-display"
              >
                {validating ? "Tjekker..." : "Indløs"}
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Ved at betale accepterer du{" "}
            <a href="/vilkaar" className="text-racing-red hover:underline font-medium">
              vilkårene for DASU RaceManager 2026
            </a>
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
