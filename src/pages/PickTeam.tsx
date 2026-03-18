import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { User, DollarSign, Check, AlertTriangle } from "lucide-react";
import { formatDKR } from "@/lib/format";
import { fetchDrivers, fetchSettings, createManager, addManagerDriver, fetchManagerByEmail } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useToast } from "@/hooks/use-toast";
import PageLayout from "@/components/PageLayout";

export default function PickTeamPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [teamName, setTeamName] = useState("");
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const budgetLimit = settings?.budget_limit ?? 100;
  const registrationOpen = settings?.team_registration_open ?? false;
  const spent = drivers
    .filter((d) => selectedDriverIds.includes(d.id))
    .reduce((sum, d) => sum + d.price, 0);
  const remaining = budgetLimit - spent;

  function toggleDriver(id: string) {
    setSelectedDriverIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  async function handleSubmit() {
    if (!name || !email || !teamName) {
      toast({ title: "Udfyld alle felter", variant: "destructive" });
      return;
    }
    if (selectedDriverIds.length !== 3) {
      toast({ title: "Vælg præcis 3 kørere", variant: "destructive" });
      return;
    }
    if (remaining < 0) {
      toast({ title: "Du overskrider budgettet", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const existing = await fetchManagerByEmail(email);
      if (existing) {
        toast({ title: "Denne email er allerede brugt", variant: "destructive" });
        setSubmitting(false);
        return;
      }
      const manager = await createManager(name, email, teamName, remaining);
      for (const dId of selectedDriverIds) {
        await addManagerDriver(manager.id, dId);
      }
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      toast({ title: "Hold oprettet! 🏁" });
      navigate("/mit-hold?email=" + encodeURIComponent(email));
    } catch (err: any) {
      toast({ title: "Fejl: " + err.message, variant: "destructive" });
    }
    setSubmitting(false);
  }

  if (!registrationOpen) {
    return (
      <PageLayout>
        <div className="container py-12 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-gold" />
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Holdregistrering lukket</h1>
          <p className="mt-2 text-muted-foreground">Holdvalg er ikke længere åbent for denne sæson.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container py-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Vælg dit hold</h1>
          <p className="text-sm text-muted-foreground">Vælg 3 kørere inden for budgettet</p>
        </div>

        {/* Form Fields */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Input placeholder="Dit navn" value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-border" />
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-secondary border-border" />
          <Input placeholder="Holdnavn" value={teamName} onChange={(e) => setTeamName(e.target.value)} className="bg-secondary border-border" />
        </div>

        {/* Budget Bar */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <DollarSign className="h-5 w-5 text-gold" />
          <div className="flex-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Budget</span>
              <span className={`font-display font-bold ${remaining < 0 ? "text-destructive" : "text-foreground"}`}>
                {remaining.toFixed(1)} / {budgetLimit}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${remaining < 0 ? "bg-destructive" : "bg-gradient-racing"}`}
                style={{ width: `${Math.max(0, Math.min(100, (remaining / budgetLimit) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Driver Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {drivers.map((d) => {
            const selected = selectedDriverIds.includes(d.id);
            const disabled = !selected && selectedDriverIds.length >= 3;
            return (
              <button
                key={d.id}
                onClick={() => toggleDriver(d.id)}
                disabled={disabled}
                className={`group relative flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                  selected
                    ? "border-racing-red bg-racing-red/10 shadow-racing"
                    : disabled
                    ? "border-border bg-card opacity-50 cursor-not-allowed"
                    : "border-border bg-card hover:border-racing-red/50"
                }`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-secondary font-display text-lg font-bold text-muted-foreground">
                  #{d.car_number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-foreground truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.team}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-display text-lg font-bold text-gold">{d.price}</span>
                  <p className="text-xs text-muted-foreground">mio</p>
                </div>
                {selected && (
                  <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-racing">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {drivers.length === 0 && (
          <p className="text-center text-muted-foreground">Ingen kørere tilgængelige endnu.</p>
        )}

        {/* Submit */}
        <div className="flex justify-center">
          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedDriverIds.length !== 3 || remaining < 0}
            className="bg-gradient-racing px-8 py-3 font-display text-base font-semibold text-primary-foreground shadow-racing hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
          >
            {submitting ? "Opretter..." : "Bekræft hold 🏁"}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
