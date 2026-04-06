import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Flag, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import PageLayout from "@/components/PageLayout";

export default function ResetPassword() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Adgangskoden skal være mindst 6 tegn", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Fejl", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Adgangskode opdateret! 🏁", description: "Du kan nu logge ind med din nye adgangskode." });
      navigate("/login");
    }
    setLoading(false);
  }

  return (
    <PageLayout>
      <div className="container flex min-h-[60vh] items-center justify-center py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-racing-red/10">
              <Flag className="h-8 w-8 text-racing-red" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Nulstil adgangskode</h1>
            <p className="text-sm text-muted-foreground">Indtast din nye adgangskode herunder</p>
          </div>

          {!ready ? (
            <p className="text-center text-sm text-muted-foreground">
              Verificerer link… Hvis dette tager lang tid, kan linket være ugyldigt eller udløbet.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Ny adgangskode"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary border-border pl-10"
                  required
                  minLength={6}
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-racing py-3 font-display text-base font-semibold text-primary-foreground shadow-racing hover:scale-105 transition-transform"
              >
                {loading ? "Vent..." : "Opdater adgangskode"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
