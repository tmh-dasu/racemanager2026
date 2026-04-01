import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Shield, Plus, Trash2, Save, AlertTriangle, Ticket, Copy } from "lucide-react";
import { fetchDrivers, fetchRaces, fetchSettings, fetchManagers, upsertDriver, deleteDriver, upsertRace, deleteRace, updateSetting, deleteManager, fetchPredictionQuestions, upsertPredictionQuestion, resolvePredictions, deletePredictionQuestion, withdrawDriver, fetchAllTransfers, QUESTION_TYPE_LABELS } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

import ResultsAdmin from "@/components/admin/ResultsAdmin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import PageLayout from "@/components/PageLayout";

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();

  if (authLoading || adminLoading) {
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
          <h1 className="font-display text-2xl font-bold text-foreground">Log ind for at tilgå admin</h1>
          <Button onClick={() => navigate("/login")} className="bg-gradient-racing text-primary-foreground font-display">Log ind</Button>
        </div>
      </PageLayout>
    );
  }

  if (!isAdmin) {
    return (
      <PageLayout>
        <div className="container py-12 text-center space-y-4">
          <Shield className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="font-display text-2xl font-bold text-foreground">Ingen adgang</h1>
          <p className="text-muted-foreground">Du har ikke admin-rettigheder.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container py-6">
        <h1 className="font-display text-2xl font-bold text-foreground mb-4">Admin Panel</h1>
        <Tabs defaultValue="drivers">
          <TabsList className="bg-secondary border-border mb-4 flex-wrap">
            <TabsTrigger value="drivers" className="font-display">Kørere</TabsTrigger>
            <TabsTrigger value="races" className="font-display">Løb</TabsTrigger>
            <TabsTrigger value="results" className="font-display">Resultater</TabsTrigger>
            <TabsTrigger value="predictions" className="font-display">Predictions</TabsTrigger>
            <TabsTrigger value="managers" className="font-display">Managers</TabsTrigger>
            <TabsTrigger value="transfers" className="font-display">Transfers</TabsTrigger>
            <TabsTrigger value="vouchers" className="font-display">Vouchers</TabsTrigger>
            <TabsTrigger value="settings" className="font-display">Indstillinger</TabsTrigger>
          </TabsList>

          <TabsContent value="drivers"><DriversAdmin /></TabsContent>
          <TabsContent value="races"><RacesAdmin /></TabsContent>
          <TabsContent value="results"><ResultsAdmin /></TabsContent>
          <TabsContent value="predictions"><PredictionsAdmin /></TabsContent>
          <TabsContent value="managers"><ManagersAdmin /></TabsContent>
          <TabsContent value="transfers"><TransfersAdmin /></TabsContent>
          <TabsContent value="vouchers"><VouchersAdmin /></TabsContent>
          <TabsContent value="settings"><SettingsAdmin /></TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}



function DriversAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: drivers = [], refetch } = useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });
  const [form, setForm] = useState({ name: "", car_number: "", team: "", photo_url: "", bio: "", club: "", quote: "", tier: "bronze" });
  const [editId, setEditId] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  function startEdit(d: any) {
    setEditId(d.id);
    setForm({ name: d.name, car_number: String(d.car_number), team: d.team, photo_url: d.photo_url || "", bio: d.bio || "", club: d.club || "", quote: d.quote || "", tier: d.tier || "bronze" });
  }

  function resetForm() {
    setEditId(null);
    setForm({ name: "", car_number: "", team: "", photo_url: "", bio: "", club: "", quote: "", tier: "bronze" });
  }

  function handleTierChange(tier: string) {
    setForm({ ...form, tier });
  }

  async function handleSave() {
    if (!form.name || !form.car_number || !form.team) {
      toast({ title: "Udfyld alle påkrævede felter", variant: "destructive" }); return;
    }
    try {
      await upsertDriver({ id: editId || undefined, name: form.name, car_number: Number(form.car_number), team: form.team, photo_url: form.photo_url || null, bio: form.bio, club: form.club, quote: form.quote, tier: form.tier } as any);
      resetForm();
      refetch();
      toast({ title: editId ? "Kører opdateret" : "Kører tilføjet" });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
  }

  async function handleDelete(id: string) {
    await deleteDriver(id);
    refetch();
    toast({ title: "Kører slettet" });
  }

  async function handleWithdraw(d: any) {
    if (!confirm(`Er du sikker på at markere ${d.name} som udgået af klassen? Berørte hold får et gratis nødtransfer og notificeres via email.`)) return;
    setWithdrawing(true);
    try {
      const result = await withdrawDriver(d.id);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      toast({ title: `${d.name} markeret som udgået. ${result.affectedCount} hold berørt.` });
    } catch (err: any) {
      toast({ title: "Fejl: " + err.message, variant: "destructive" });
    }
    setWithdrawing(false);
  }

  const tierLabel = (t: string) => t === "gold" ? "🥇 Guld" : t === "silver" ? "🥈 Sølv" : "🥉 Bronze";

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input placeholder="Navn *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border" />
        <Input placeholder="Bil # *" type="number" value={form.car_number} onChange={(e) => setForm({ ...form, car_number: e.target.value })} className="bg-secondary border-border" />
        <Input placeholder="Team *" value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} className="bg-secondary border-border" />
        <select value={form.tier} onChange={(e) => handleTierChange(e.target.value)} className="rounded-md bg-secondary border border-border px-3 py-2 text-sm text-foreground">
          <option value="gold">🥇 Guld</option>
          <option value="silver">🥈 Sølv</option>
          <option value="bronze">🥉 Bronze</option>
        </select>
        <Input placeholder="Børsværdi" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-secondary border-border" />
        <Input placeholder="Klub" value={form.club} onChange={(e) => setForm({ ...form, club: e.target.value })} className="bg-secondary border-border" />
        <Input placeholder="Citat" value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} className="bg-secondary border-border" />
        <Input placeholder="Bio (maks 100 tegn)" maxLength={100} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="bg-secondary border-border" />
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSave} className="bg-gradient-racing text-primary-foreground font-display">
          {editId ? <><Save className="h-4 w-4 mr-1" />Gem</> : <><Plus className="h-4 w-4 mr-1" />Tilføj</>}
        </Button>
        {editId && <Button variant="outline" onClick={resetForm}>Annuller</Button>}
      </div>
      <div className="space-y-1">
        {(["gold", "silver", "bronze"] as const).map((tier) => {
          const tierDrivers = drivers.filter((d: any) => (d.tier || "bronze") === tier);
          if (tierDrivers.length === 0) return null;
          return (
            <div key={tier} className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase mt-3">{tierLabel(tier)} ({tierDrivers.length})</p>
              {tierDrivers.map((d: any) => (
                <div key={d.id} className={`flex items-center justify-between rounded px-3 py-2 text-sm ${d.withdrawn ? "bg-destructive/10 border border-destructive/20" : "bg-secondary/50"}`}>
                  <button onClick={() => startEdit(d)} className="text-left flex-1 min-w-0">
                    <span className={d.withdrawn ? "text-muted-foreground line-through" : "text-foreground"}>#{d.car_number} {d.name} – {d.team} – {Number(d.price).toLocaleString("da-DK")} DKR</span>
                    {d.club && <span className="text-muted-foreground ml-2">• {d.club}</span>}
                    {d.withdrawn && <span className="text-destructive ml-2 text-xs font-bold">UDGÅET</span>}
                  </button>
                  <div className="flex items-center gap-1 ml-2">
                    {!d.withdrawn && (
                      <button
                        onClick={() => handleWithdraw(d)}
                        disabled={withdrawing}
                        className="text-amber-500 hover:text-amber-400 transition-colors"
                        title="Markér som udgået af klassen"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(d.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RacesAdmin() {
  const { toast } = useToast();
  const { data: races = [], refetch } = useQuery({ queryKey: ["races"], queryFn: fetchRaces });
  const [form, setForm] = useState({ round_number: "", name: "", location: "", race_date: "", captain_deadline: "" });

  async function handleAdd() {
    if (!form.round_number || !form.name) { toast({ title: "Udfyld runde og navn", variant: "destructive" }); return; }
    try {
      await upsertRace({ round_number: Number(form.round_number), name: form.name, location: form.location || null, race_date: form.race_date || null, captain_deadline: form.captain_deadline || null } as any);
      setForm({ round_number: "", name: "", location: "", race_date: "", captain_deadline: "" });
      refetch();
      toast({ title: "Løb tilføjet" });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Input placeholder="Runde #" type="number" value={form.round_number} onChange={(e) => setForm({ ...form, round_number: e.target.value })} className="bg-secondary border-border" />
        <Input placeholder="Navn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border" />
        <Input placeholder="Lokation" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="bg-secondary border-border" />
        <div>
          <label className="text-xs text-muted-foreground">Løbsdato</label>
          <Input type="datetime-local" value={form.race_date} onChange={(e) => setForm({ ...form, race_date: e.target.value })} className="bg-secondary border-border" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Captain deadline</label>
          <Input type="datetime-local" value={form.captain_deadline} onChange={(e) => setForm({ ...form, captain_deadline: e.target.value })} className="bg-secondary border-border" />
        </div>
      </div>
      <Button onClick={handleAdd} className="bg-gradient-racing text-primary-foreground font-display"><Plus className="h-4 w-4 mr-1" />Tilføj løb</Button>
      <div className="space-y-1">
        {races.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded bg-secondary/50 px-3 py-2 text-sm text-foreground">
            <span>
              Runde {r.round_number}: {r.name} {r.location && `– ${r.location}`}
              {r.captain_deadline && <span className="text-muted-foreground ml-2">• Captain DL: {new Date(r.captain_deadline).toLocaleString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
            </span>
            <button onClick={async () => { await deleteRace(r.id); refetch(); toast({ title: "Løb slettet" }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}




function PredictionsAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: races = [] } = useQuery({ queryKey: ["races"], queryFn: fetchRaces });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });
  const { data: questions = [], refetch } = useQuery({ queryKey: ["prediction_questions"], queryFn: fetchPredictionQuestions });

  const [form, setForm] = useState({ race_id: "", question_type: "duel", question_text: "", option_a: "", option_b: "", prediction_deadline: "" });
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveAnswer, setResolveAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  const isDuel = form.question_type === "duel" || form.question_type === "point_duel";

  async function handleCreate() {
    if (!form.race_id || !form.question_text) { toast({ title: "Vælg løb og skriv spørgsmål", variant: "destructive" }); return; }
    if (isDuel && (!form.option_a || !form.option_b)) { toast({ title: "Vælg begge kørere for duel", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await upsertPredictionQuestion({
        race_id: form.race_id,
        question_type: form.question_type,
        question_text: form.question_text,
        option_a: isDuel ? `driver:${form.option_a}` : form.question_type === "yes_no" ? "ja" : null,
        option_b: isDuel ? `driver:${form.option_b}` : form.question_type === "yes_no" ? "nej" : null,
        prediction_deadline: form.prediction_deadline || null,
      });
      setForm({ race_id: "", question_type: "duel", question_text: "", option_a: "", option_b: "", prediction_deadline: "" });
      refetch();
      toast({ title: "Prediction-spørgsmål oprettet" });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
    setSaving(false);
  }

  async function handlePublish(id: string, published: boolean) {
    setSaving(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.from("prediction_questions").update({ published } as any).eq("id", id);
      if (error) throw error;
      refetch();
      toast({ title: published ? "Spørgsmål publiceret" : "Spørgsmål skjult" });
      
      // Send notification when publishing
      if (published) {
        const question = questions.find(q => q.id === id);
        if (question) {
          try {
            await supabase.functions.invoke("notify-predictions", {
              body: { race_id: question.race_id },
            });
            toast({ title: "Prediction-notifikation sendt til alle spillere" });
          } catch (e) {
            console.error("Failed to send prediction notification:", e);
          }
        }
      }
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
    setSaving(false);
  }

  async function handleResolve() {
    if (!resolveId || !resolveAnswer) return;
    setSaving(true);
    try {
      await resolvePredictions(resolveId, resolveAnswer);
      // Recalculate points
      const { recalculateManagerPoints } = await import("@/lib/api");
      await recalculateManagerPoints();
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      setResolveId(null);
      setResolveAnswer("");
      refetch();
      toast({ title: "Predictions afgjort! Point opdateret." });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
    setSaving(false);
  }

  async function handleDeleteQuestion(id: string) {
    if (!confirm("Slet dette spørgsmål og alle tilhørende svar?")) return;
    try {
      await deletePredictionQuestion(id);
      refetch();
      toast({ title: "Spørgsmål slettet" });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
  }

  function getDriverName(val: string) {
    const id = val.replace("driver:", "");
    const d = drivers.find((d) => d.id === id);
    return d ? `#${d.car_number} ${d.name}` : val;
  }

  // Group questions by race
  const questionsByRace = new Map<string, typeof questions>();
  for (const q of questions) {
    if (!questionsByRace.has(q.race_id)) questionsByRace.set(q.race_id, []);
    questionsByRace.get(q.race_id)!.push(q);
  }

  return (
    <div className="space-y-6">
      {/* Create question */}
      <div className="space-y-2">
        <h3 className="font-display font-semibold text-foreground">Opret prediction-spørgsmål</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <select value={form.race_id} onChange={(e) => setForm({ ...form, race_id: e.target.value })} className="rounded-md bg-secondary border border-border px-3 py-2 text-sm text-foreground">
            <option value="">Vælg løb</option>
            {races.map((r) => <option key={r.id} value={r.id}>R{r.round_number}: {r.name}</option>)}
          </select>
          <select value={form.question_type} onChange={(e) => setForm({ ...form, question_type: e.target.value })} className="rounded-md bg-secondary border border-border px-3 py-2 text-sm text-foreground">
            {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div>
            <label className="text-xs text-muted-foreground">Deadline</label>
            <Input type="datetime-local" value={form.prediction_deadline} onChange={(e) => setForm({ ...form, prediction_deadline: e.target.value })} className="bg-secondary border-border" />
          </div>
        </div>
        <Input placeholder="Spørgsmålstekst *" value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} className="bg-secondary border-border" />
        {isDuel && (
          <div className="grid gap-2 sm:grid-cols-2">
            <select value={form.option_a} onChange={(e) => setForm({ ...form, option_a: e.target.value })} className="rounded-md bg-secondary border border-border px-3 py-2 text-sm text-foreground">
              <option value="">Kører A</option>
              {drivers.filter(d => !d.withdrawn).map((d) => <option key={d.id} value={d.id}>#{d.car_number} {d.name}</option>)}
            </select>
            <select value={form.option_b} onChange={(e) => setForm({ ...form, option_b: e.target.value })} className="rounded-md bg-secondary border border-border px-3 py-2 text-sm text-foreground">
              <option value="">Kører B</option>
              {drivers.filter(d => !d.withdrawn).map((d) => <option key={d.id} value={d.id}>#{d.car_number} {d.name}</option>)}
            </select>
          </div>
        )}
        <Button onClick={handleCreate} disabled={saving} className="bg-gradient-racing text-primary-foreground font-display">
          <Plus className="h-4 w-4 mr-1" />Opret spørgsmål
        </Button>
      </div>

      {/* Existing questions grouped by race */}
      {races.map((race) => {
        const raceQs = questionsByRace.get(race.id) || [];
        if (raceQs.length === 0) return null;
        return (
          <div key={race.id} className="space-y-2">
            <h3 className="font-display font-semibold text-foreground">R{race.round_number}: {race.name} ({raceQs.length}/3)</h3>
            {raceQs.map((q: any) => (
              <div key={q.id} className="rounded bg-secondary/50 px-3 py-3 text-sm space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-foreground">{q.question_text}</span>
                    <span className="text-xs text-muted-foreground ml-2">({QUESTION_TYPE_LABELS[q.question_type]})</span>
                    {q.option_a && <span className="text-xs text-muted-foreground ml-2">• {getDriverName(q.option_a)} vs {getDriverName(q.option_b)}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {q.published ? (
                      <span className="text-xs text-green-400 font-semibold">Publiceret</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Kladde</span>
                    )}
                    {q.correct_answer && <span className="text-xs text-green-400">✓ Afgjort</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {!q.published && (
                    <Button size="sm" variant="outline" onClick={() => handlePublish(q.id, true)} disabled={saving} className="text-xs">
                      Publicer
                    </Button>
                  )}
                  {q.published && !q.correct_answer && (
                    <Button size="sm" variant="outline" onClick={() => handlePublish(q.id, false)} disabled={saving} className="text-xs">
                      Skjul
                    </Button>
                  )}
                  {!q.correct_answer && (
                    <>
                      {q.question_type === "yes_no" ? (
                        <select value={resolveId === q.id ? resolveAnswer : ""} onChange={(e) => { setResolveId(q.id); setResolveAnswer(e.target.value); }} className="rounded-md bg-card border border-border px-2 py-1 text-sm text-foreground">
                          <option value="">Vælg korrekt svar</option>
                          <option value="ja">Ja</option>
                          <option value="nej">Nej</option>
                        </select>
                      ) : (
                        <select value={resolveId === q.id ? resolveAnswer : ""} onChange={(e) => { setResolveId(q.id); setResolveAnswer(e.target.value); }} className="rounded-md bg-card border border-border px-2 py-1 text-sm text-foreground">
                          <option value="">Vælg korrekt svar</option>
                          {q.option_a && <option value={q.option_a}>{getDriverName(q.option_a)}</option>}
                          {q.option_b && <option value={q.option_b}>{getDriverName(q.option_b)}</option>}
                        </select>
                      )}
                      <Button size="sm" onClick={handleResolve} disabled={resolveId !== q.id || !resolveAnswer || saving} className="bg-gradient-racing text-primary-foreground font-display text-xs">
                        Afgør
                      </Button>
                    </>
                  )}
                  <button onClick={() => handleDeleteQuestion(q.id)} className="text-destructive hover:text-destructive/80 ml-auto">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
      {questions.length === 0 && <p className="text-sm text-muted-foreground">Ingen spørgsmål oprettet endnu.</p>}
    </div>
  );
}

function SettingsAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, refetch } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const [transferCostInput, setTransferCostInput] = useState("");

  async function toggle(key: string, current: boolean) {
    await updateSetting(key, (!current).toString());
    refetch();
    queryClient.invalidateQueries({ queryKey: ["settings"] });
    toast({ title: "Indstilling opdateret" });
    
    // Send transfer window notification
    if (key === "transfer_window_open") {
      try {
        await supabase.functions.invoke("notify-transfer-window", {
          body: { action: !current ? "opened" : "closing" },
        });
        toast({ title: `Transfer-notifikation sendt til alle spillere` });
      } catch (e) {
        console.error("Failed to send transfer notification:", e);
      }
    }
  }

  async function saveTransferCost() {
    const val = Number(transferCostInput);
    if (isNaN(val) || val < 0) { toast({ title: "Angiv et gyldigt tal", variant: "destructive" }); return; }
    await updateSetting("transfer_cost", String(val));
    refetch();
    queryClient.invalidateQueries({ queryKey: ["settings"] });
    toast({ title: "Transaktionsomkostning opdateret" });
  }

  if (!settings) return null;

  return (
    <div className="space-y-4 max-w-md">
      <div className="flex items-center justify-between rounded bg-secondary/50 px-4 py-3">
        <span className="text-sm text-foreground">Holdregistrering åben</span>
        <Switch checked={settings.team_registration_open} onCheckedChange={() => toggle("team_registration_open", settings.team_registration_open)} />
      </div>
      <div className="flex items-center justify-between rounded bg-secondary/50 px-4 py-3">
        <span className="text-sm text-foreground">Transfervindue åbent</span>
        <Switch checked={settings.transfer_window_open} onCheckedChange={() => toggle("transfer_window_open", settings.transfer_window_open)} />
      </div>
      <div className="rounded bg-secondary/50 px-4 py-3 space-y-2">
        <span className="text-sm text-foreground">Transaktionsomkostning per transfer (point)</span>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder={String(settings.transfer_cost)}
            value={transferCostInput}
            onChange={(e) => setTransferCostInput(e.target.value)}
            className="bg-card border-border w-32"
          />
          <Button size="sm" onClick={saveTransferCost} className="bg-gradient-racing text-primary-foreground font-display">
            <Save className="h-4 w-4 mr-1" />Gem
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Nuværende: {settings.transfer_cost} point. Ændringer træder i kraft ved næste transfer.</p>
      </div>
    </div>
  );
}

function ManagersAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: managers = [], refetch } = useQuery({ queryKey: ["managers"], queryFn: fetchManagers });

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Er du sikker på at du vil slette "${name}"? Alle holddata slettes permanent.`)) return;
    try {
      await deleteManager(id);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      toast({ title: `Manager "${name}" slettet` });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{managers.length} hold tilmeldt</p>
      {managers.map((m) => (
        <div key={m.id} className="flex items-center justify-between rounded bg-secondary/50 px-3 py-2 text-sm">
          <div className="flex-1 min-w-0">
            <span className="font-medium text-foreground">{m.team_name}</span>
            <span className="text-muted-foreground ml-2">({m.name})</span>
            <span className="text-muted-foreground ml-2">• {m.total_points} point</span>
            
          </div>
          <button onClick={() => handleDelete(m.id, m.team_name)} className="text-destructive hover:text-destructive/80 shrink-0 ml-2"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

function TransfersAdmin() {
  const { data: transfers = [] } = useQuery({ queryKey: ["all_transfers"], queryFn: fetchAllTransfers });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });
  const { data: managers = [] } = useQuery({ queryKey: ["managers"], queryFn: fetchManagers });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{transfers.length} transfers i alt</p>
      {transfers.length === 0 && <p className="text-sm text-muted-foreground">Ingen transfers endnu.</p>}
      <div className="space-y-1">
        {transfers.map((t: any) => {
          const oldD = drivers.find((d: any) => d.id === t.old_driver_id);
          const newD = drivers.find((d: any) => d.id === t.new_driver_id);
          const mgr = managers.find((m: any) => m.id === t.manager_id);
          return (
            <div key={t.id} className="flex items-center justify-between rounded bg-secondary/50 px-3 py-2 text-sm">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-medium text-foreground truncate">{mgr?.team_name || "?"}</span>
                <span className="text-muted-foreground">:</span>
                <span className="text-destructive">#{oldD?.car_number} {oldD?.name}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-success">#{newD?.car_number} {newD?.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`font-display font-bold ${t.is_free ? "text-success" : "text-destructive"}`}>
                  {t.is_free ? "Gratis" : `−${t.point_cost} pts`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VouchersAdmin() {
  const { toast } = useToast();
  const [newCode, setNewCode] = useState("");
  const [bulkCount, setBulkCount] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: vouchers = [], refetch } = useQuery({
    queryKey: ["vouchers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("voucher_codes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as { id: string; code: string; used_by: string | null; used_at: string | null; created_at: string }[];
    },
  });

  function generateCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "DASU-";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  async function handleAddSingle() {
    const code = newCode.trim().toUpperCase();
    if (!code) { toast({ title: "Indtast en kode", variant: "destructive" }); return; }
    setAdding(true);
    try {
      const { error } = await supabase.from("voucher_codes").insert({ code });
      if (error) throw error;
      setNewCode("");
      refetch();
      toast({ title: `Voucher "${code}" oprettet` });
    } catch (err: any) {
      toast({ title: err.message?.includes("duplicate") ? "Koden findes allerede" : err.message, variant: "destructive" });
    }
    setAdding(false);
  }

  async function handleGenerateBulk() {
    const count = Math.min(Math.max(1, Number(bulkCount) || 0), 50);
    if (count === 0) { toast({ title: "Angiv antal (1-50)", variant: "destructive" }); return; }
    setAdding(true);
    try {
      const codes = Array.from({ length: count }, () => ({ code: generateCode() }));
      const { error } = await supabase.from("voucher_codes").insert(codes);
      if (error) throw error;
      setBulkCount("");
      refetch();
      toast({ title: `${count} voucher-koder genereret` });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
    setAdding(false);
  }

  async function handleDelete(id: string, code: string) {
    if (!confirm(`Slet voucher "${code}"?`)) return;
    const { error } = await supabase.from("voucher_codes").delete().eq("id", id);
    if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    refetch();
    toast({ title: "Voucher slettet" });
  }

  function copyToClipboard(code: string) {
    navigator.clipboard.writeText(code);
    toast({ title: `"${code}" kopieret` });
  }

  const usedCount = vouchers.filter((v) => v.used_by).length;
  const availableCount = vouchers.length - usedCount;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <span className="text-muted-foreground">Total: <span className="font-bold text-foreground">{vouchers.length}</span></span>
        <span className="text-muted-foreground">Ledige: <span className="font-bold text-green-500">{availableCount}</span></span>
        <span className="text-muted-foreground">Brugte: <span className="font-bold text-racing-red">{usedCount}</span></span>
      </div>

      {/* Add single code */}
      <div className="flex gap-2">
        <Input
          placeholder="Voucher-kode (f.eks. VIP2026)"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          className="bg-secondary border-border uppercase max-w-xs"
          maxLength={50}
          onKeyDown={(e) => e.key === "Enter" && handleAddSingle()}
        />
        <Button onClick={handleAddSingle} disabled={adding} className="bg-gradient-racing text-primary-foreground font-display">
          <Plus className="h-4 w-4 mr-1" />Tilføj
        </Button>
      </div>

      {/* Generate bulk */}
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Antal"
          type="number"
          min={1}
          max={50}
          value={bulkCount}
          onChange={(e) => setBulkCount(e.target.value)}
          className="bg-secondary border-border w-24"
        />
        <Button onClick={handleGenerateBulk} disabled={adding} variant="outline" className="font-display">
          <Ticket className="h-4 w-4 mr-1" />Generér tilfældige koder
        </Button>
      </div>

      {/* List */}
      <div className="space-y-1">
        {vouchers.map((v) => (
          <div key={v.id} className={`flex items-center justify-between rounded px-3 py-2 text-sm ${v.used_by ? "bg-muted/50" : "bg-secondary/50"}`}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button onClick={() => copyToClipboard(v.code)} className="hover:text-gold transition-colors" title="Kopiér">
                <Copy className="h-3.5 w-3.5" />
              </button>
              <span className={`font-mono font-semibold ${v.used_by ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {v.code}
              </span>
              {v.used_by && v.used_at && (
                <span className="text-xs text-muted-foreground">
                  Brugt {new Date(v.used_at).toLocaleDateString("da-DK")}
                </span>
              )}
            </div>
            {!v.used_by && (
              <button onClick={() => handleDelete(v.id, v.code)} className="text-destructive hover:text-destructive/80 ml-2">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {vouchers.length === 0 && <p className="text-sm text-muted-foreground">Ingen voucher-koder oprettet endnu.</p>}
      </div>
    </div>
  );
}
