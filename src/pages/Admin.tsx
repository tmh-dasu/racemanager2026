import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Shield, Users, Flag, Settings as SettingsIcon, Plus, Trash2, Save, AlertTriangle, Ticket, Copy } from "lucide-react";
import { fetchDrivers, fetchRaces, fetchRaceResults, fetchSettings, fetchManagers, fetchManagerDrivers, upsertDriver, deleteDriver, upsertRace, deleteRace, updateSetting, deleteManager, fetchPredictionQuestions, upsertPredictionQuestion, resolvePredictions, QUESTION_TYPE_LABELS, type Driver, type Race, type Manager } from "@/lib/api";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
            <TabsTrigger value="vouchers" className="font-display">Vouchers</TabsTrigger>
            <TabsTrigger value="settings" className="font-display">Indstillinger</TabsTrigger>
          </TabsList>

          <TabsContent value="drivers"><DriversAdmin /></TabsContent>
          <TabsContent value="races"><RacesAdmin /></TabsContent>
          <TabsContent value="results"><ResultsAdmin /></TabsContent>
          <TabsContent value="predictions"><PredictionsAdmin /></TabsContent>
          <TabsContent value="managers"><ManagersAdmin /></TabsContent>
          <TabsContent value="vouchers"><VouchersAdmin /></TabsContent>
          <TabsContent value="settings"><SettingsAdmin /></TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}

const TIER_DEFAULTS: Record<string, number> = { gold: 5000000, silver: 3000000, bronze: 2000000 };

function DriversAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: drivers = [], refetch } = useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });
  const [form, setForm] = useState({ name: "", car_number: "", team: "", price: "", photo_url: "", bio: "", club: "", quote: "", tier: "bronze" });
  const [editId, setEditId] = useState<string | null>(null);

  function startEdit(d: any) {
    setEditId(d.id);
    setForm({ name: d.name, car_number: String(d.car_number), team: d.team, price: String(d.price), photo_url: d.photo_url || "", bio: d.bio || "", club: d.club || "", quote: d.quote || "", tier: d.tier || "bronze" });
  }

  function resetForm() {
    setEditId(null);
    setForm({ name: "", car_number: "", team: "", price: "", photo_url: "", bio: "", club: "", quote: "", tier: "bronze" });
  }

  function handleTierChange(tier: string) {
    const autoPrice = !form.price || Object.values(TIER_DEFAULTS).includes(Number(form.price));
    setForm({ ...form, tier, ...(autoPrice ? { price: String(TIER_DEFAULTS[tier] || 2000000) } : {}) });
  }

  async function handleSave() {
    if (!form.name || !form.car_number || !form.team) {
      toast({ title: "Udfyld alle påkrævede felter", variant: "destructive" }); return;
    }
    const price = Number(form.price) || TIER_DEFAULTS[form.tier] || 2000000;
    try {
      await upsertDriver({ id: editId || undefined, name: form.name, car_number: Number(form.car_number), team: form.team, price, photo_url: form.photo_url || null, bio: form.bio, club: form.club, quote: form.quote, tier: form.tier } as any);
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
                <div key={d.id} className="flex items-center justify-between rounded bg-secondary/50 px-3 py-2 text-sm">
                  <button onClick={() => startEdit(d)} className="text-left flex-1 min-w-0">
                    <span className="text-foreground">#{d.car_number} {d.name} – {d.team} – {Number(d.price).toLocaleString("da-DK")} DKR</span>
                    {d.club && <span className="text-muted-foreground ml-2">• {d.club}</span>}
                  </button>
                  <button onClick={() => handleDelete(d.id)} className="text-destructive hover:text-destructive/80 ml-2"><Trash2 className="h-4 w-4" /></button>
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
  const { data: races = [] } = useQuery({ queryKey: ["races"], queryFn: fetchRaces });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });
  const { data: questions = [], refetch } = useQuery({ queryKey: ["prediction_questions"], queryFn: fetchPredictionQuestions });

  const [form, setForm] = useState({ race_id: "", question_type: "final_winner", question_text: "" });
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveAnswer, setResolveAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!form.race_id || !form.question_text) { toast({ title: "Vælg løb og skriv spørgsmål", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await upsertPredictionQuestion({ race_id: form.race_id, question_type: form.question_type, question_text: form.question_text });
      setForm({ race_id: "", question_type: "final_winner", question_text: "" });
      refetch();
      toast({ title: "Prediction-spørgsmål oprettet" });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
    setSaving(false);
  }

  async function handleResolve() {
    if (!resolveId || !resolveAnswer) return;
    setSaving(true);
    try {
      await resolvePredictions(resolveId, resolveAnswer);
      setResolveId(null);
      setResolveAnswer("");
      refetch();
      toast({ title: "Predictions afgjort!" });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* Create question */}
      <div className="space-y-2">
        <h3 className="font-display font-semibold text-foreground">Opret prediction-spørgsmål</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select value={form.race_id} onChange={(e) => setForm({ ...form, race_id: e.target.value })} className="rounded-md bg-secondary border border-border px-3 py-2 text-sm text-foreground">
            <option value="">Vælg løb</option>
            {races.map((r) => <option key={r.id} value={r.id}>R{r.round_number}: {r.name}</option>)}
          </select>
          <select value={form.question_type} onChange={(e) => setForm({ ...form, question_type: e.target.value })} className="rounded-md bg-secondary border border-border px-3 py-2 text-sm text-foreground">
            {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <Input placeholder="Spørgsmålstekst *" value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} className="bg-secondary border-border sm:col-span-2" />
        </div>
        <Button onClick={handleCreate} disabled={saving} className="bg-gradient-racing text-primary-foreground font-display">
          <Plus className="h-4 w-4 mr-1" />Opret spørgsmål
        </Button>
      </div>

      {/* Existing questions */}
      <div className="space-y-2">
        <h3 className="font-display font-semibold text-foreground">Spørgsmål</h3>
        {questions.length === 0 && <p className="text-sm text-muted-foreground">Ingen spørgsmål oprettet endnu.</p>}
        {questions.map((q) => {
          const race = races.find((r) => r.id === q.race_id);
          return (
            <div key={q.id} className="rounded bg-secondary/50 px-3 py-3 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-foreground">{race?.name || "?"}: </span>
                  <span className="text-foreground">{q.question_text}</span>
                  <span className="text-xs text-muted-foreground ml-2">({QUESTION_TYPE_LABELS[q.question_type]})</span>
                </div>
                {q.correct_answer ? (
                  <span className="text-xs text-green-400">✓ Afgjort: {
                    q.question_type === "tier_winner" ? (q.correct_answer === "gold" ? "Guld" : q.correct_answer === "silver" ? "Sølv" : "Bronze")
                    : (drivers.find((d) => d.id === q.correct_answer)?.name || q.correct_answer)
                  }</span>
                ) : null}
              </div>
              {!q.correct_answer && (
                <div className="flex gap-2 items-center">
                  {q.question_type === "tier_winner" ? (
                    <select value={resolveId === q.id ? resolveAnswer : ""} onChange={(e) => { setResolveId(q.id); setResolveAnswer(e.target.value); }} className="rounded-md bg-card border border-border px-2 py-1 text-sm text-foreground">
                      <option value="">Vælg korrekt svar</option>
                      <option value="gold">Guld</option>
                      <option value="silver">Sølv</option>
                      <option value="bronze">Bronze</option>
                    </select>
                  ) : (
                    <select value={resolveId === q.id ? resolveAnswer : ""} onChange={(e) => { setResolveId(q.id); setResolveAnswer(e.target.value); }} className="rounded-md bg-card border border-border px-2 py-1 text-sm text-foreground">
                      <option value="">Vælg korrekt kører</option>
                      {drivers.map((d) => <option key={d.id} value={d.id}>#{d.car_number} {d.name}</option>)}
                    </select>
                  )}
                  <Button size="sm" onClick={handleResolve} disabled={resolveId !== q.id || !resolveAnswer || saving} className="bg-gradient-racing text-primary-foreground font-display text-xs">
                    Afgør
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, refetch } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  async function toggle(key: string, current: boolean) {
    await updateSetting(key, (!current).toString());
    refetch();
    queryClient.invalidateQueries({ queryKey: ["settings"] });
    toast({ title: "Indstilling opdateret" });
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
            {m.joker_used && <span className="text-muted-foreground ml-2">• Joker brugt</span>}
          </div>
          <button onClick={() => handleDelete(m.id, m.team_name)} className="text-destructive hover:text-destructive/80 shrink-0 ml-2"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
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
