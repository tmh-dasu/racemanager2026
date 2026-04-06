import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Flag, Mail, Lock, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import PageLayout from "@/components/PageLayout";

export default function AuthPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Login fejlede", description: error.message, variant: "destructive" });
      } else {
        navigate("/vaelg-hold");
      }
    } else {
      if (!name.trim()) {
        toast({ title: "Indtast dit navn", variant: "destructive" });
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast({ title: "Oprettelse fejlede", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Konto oprettet! 🏁", description: "Du er nu logget ind." });
        navigate("/vaelg-hold");
      }
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
            <h1 className="font-display text-2xl font-bold text-foreground">
              {isLogin ? "Log ind" : "Opret konto"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLogin ? "Log ind for at se dit hold" : "Opret en konto for at deltage i DASU RaceManager"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Dit navn"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-secondary border-border pl-10"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-secondary border-border pl-10"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Adgangskode"
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
              {loading ? "Vent..." : isLogin ? "Log ind" : "Opret konto"}
            </Button>
          </form>

          {isLogin && (
            <div className="text-center">
              <button
                type="button"
                onClick={async () => {
                  if (!email.trim()) {
                    toast({ title: "Indtast din email først", variant: "destructive" });
                    return;
                  }
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  if (error) {
                    toast({ title: "Fejl", description: error.message, variant: "destructive" });
                  } else {
                    toast({ title: "Email sendt! 📧", description: "Tjek din indbakke for et link til nulstilling." });
                  }
                }}
                className="text-sm text-muted-foreground hover:text-racing-red hover:underline transition-colors"
              >
                Glemt adgangskode?
              </button>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Har du ikke en konto?" : "Har du allerede en konto?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-semibold text-racing-red hover:underline"
            >
              {isLogin ? "Opret konto" : "Log ind"}
            </button>
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
