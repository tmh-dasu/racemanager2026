import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Shield, Plus, Trash2, Save, AlertTriangle, Ticket, Copy, GripVertical } from "lucide-react";
import { fetchDrivers, fetchRaces, fetchSettings, fetchManagers, upsertDriver, deleteDriver, upsertRace, deleteRace, updateSetting, deleteManager, fetchPredictionQuestions, upsertPredictionQuestion, resolvePredictions, deletePredictionQuestion, withdrawDriver, fetchAllTransfers, fetchPredictionCategories, upsertPredictionCategory, deletePredictionCategory, fetchSponsors, upsertSponsor, deleteSponsor } from "@/lib/api";
import PrizeLottery from "@/components/admin/PrizeLottery";
import PrizeSettings from "@/components/admin/PrizeSettings";
import { supabase } from "@/integrations/supabase/client";

import ResultsAdmin from "@/components/admin/ResultsAdmin";
import AdminStatusCard from "@/components/admin/AdminStatusCard";
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
  const [activeTab, setActiveTab] = useState("drivers");

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
        <AdminStatusCard onNavigateTab={setActiveTab} />
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary border-border mb-4 flex-wrap">
            <TabsTrigger value="drivers" className="font-display">Kørere</TabsTrigger>
            <TabsTrigger value="races" className="font-display">Løb</TabsTrigger>
            <TabsTrigger value="results" className="font-display">Resultater</TabsTrigger>
            <TabsTrigger value="predictions" className="font-display">Predictions</TabsTrigger>
            <TabsTrigger value="managers" className="font-display">Managers</TabsTrigger>
            <TabsTrigger value="transfers" className="font-display">Transfers</TabsTrigger>
            <TabsTrigger value="vouchers" className="font-display">Vouchers</TabsTrigger>
            <TabsTrigger value="lottery" className="font-display">Lodtrækning</TabsTrigger>
            <TabsTrigger value="settings" className="font-display">Indstillinger</TabsTrigger>
          </TabsList>

          <TabsContent value="drivers"><DriversAdmin /></TabsContent>
          <TabsContent value="races"><RacesAdmin /></TabsContent>
          <TabsContent value="results"><ResultsAdmin /></TabsContent>
          <TabsContent value="predictions"><PredictionsAdmin /></TabsContent>
          <TabsContent value="managers"><ManagersAdmin /></TabsContent>
          <TabsContent value="transfers"><TransfersAdmin /></TabsContent>
          <TabsContent value="vouchers"><VouchersAdmin /></TabsContent>
          <TabsContent value="lottery"><PrizeLottery /></TabsContent>
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
                    <span className={d.withdrawn ? "text-muted-foreground line-through" : "text-foreground"}>#{d.car_number} {d.name} – {d.team}</span>
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
  const [form, setForm] = useState({ round_number: "", name: "", location: "", race_date: "", address: "" });
  const [formLinks, setFormLinks] = useState<{ label: string; url: string }[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", location: "", race_date: "", address: "" });
  const [editLinks, setEditLinks] = useState<{ label: string; url: string }[]>([]);

  function addLink(links: { label: string; url: string }[], setLinks: (l: { label: string; url: string }[]) => void) {
    setLinks([...links, { label: "", url: "" }]);
  }
  function updateLink(links: { label: string; url: string }[], setLinks: (l: { label: string; url: string }[]) => void, idx: number, field: "label" | "url", value: string) {
    const updated = [...links];
    updated[idx] = { ...updated[idx], [field]: value };
    setLinks(updated);
  }
  function removeLink(links: { label: string; url: string }[], setLinks: (l: { label: string; url: string }[]) => void, idx: number) {
    setLinks(links.filter((_, i) => i !== idx));
  }

  async function handleAdd() {
    if (!form.round_number || !form.name) { toast({ title: "Udfyld runde og navn", variant: "destructive" }); return; }
    try {
      const raceDate = form.race_date || null;
      const captainDeadline = raceDate ? new Date(new Date(raceDate).getTime() - 24 * 60 * 60 * 1000).toISOString() : null;
      const validLinks = formLinks.filter(l => l.label && l.url);
      await upsertRace({ round_number: Number(form.round_number), name: form.name, location: form.location || null, race_date: raceDate, captain_deadline: captainDeadline, address: form.address || null, links: validLinks } as any);
      setForm({ round_number: "", name: "", location: "", race_date: "", address: "" });
      setFormLinks([]);
      refetch();
      toast({ title: "Løb tilføjet" });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
  }

  function startEdit(r: any) {
    setEditingId(r.id);
    setEditForm({
      name: r.name || "",
      location: r.location || "",
      race_date: r.race_date ? new Date(r.race_date).toISOString().slice(0, 16) : "",
      address: r.address || "",
    });
    setEditLinks(Array.isArray(r.links) ? r.links : []);
  }

  async function handleSaveEdit(r: any) {
    try {
      const raceDate = editForm.race_date || null;
      const captainDeadline = raceDate ? new Date(new Date(raceDate).getTime() - 24 * 60 * 60 * 1000).toISOString() : null;
      const validLinks = editLinks.filter(l => l.label && l.url);
      await upsertRace({ id: r.id, round_number: r.round_number, name: editForm.name, location: editForm.location || null, race_date: raceDate, captain_deadline: captainDeadline, address: editForm.address || null, links: validLinks } as any);
      setEditingId(null);
      refetch();
      toast({ title: "Løb opdateret" });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
  }

  function LinksEditor({ links, setLinks }: { links: { label: string; url: string }[]; setLinks: (l: { label: string; url: string }[]) => void }) {
    return (
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Links (billetter, YouTube osv.)</label>
        {links.map((link, i) => (
          <div key={i} className="flex gap-1 items-center">
            <Input placeholder="Tekst (f.eks. Billetter)" value={link.label} onChange={(e) => updateLink(links, setLinks, i, "label", e.target.value)} className="bg-card border-border text-xs h-7 flex-1" />
            <Input placeholder="URL" value={link.url} onChange={(e) => updateLink(links, setLinks, i, "url", e.target.value)} className="bg-card border-border text-xs h-7 flex-[2]" />
            <button onClick={() => removeLink(links, setLinks, i)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-3 w-3" /></button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => addLink(links, setLinks)} className="text-xs h-6"><Plus className="h-3 w-3 mr-1" />Tilføj link</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <Input placeholder="Runde #" type="number" value={form.round_number} onChange={(e) => setForm({ ...form, round_number: e.target.value })} className="bg-secondary border-border" />
        <Input placeholder="Navn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border" />
        <Input placeholder="Lokation" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="bg-secondary border-border" />
        <div>
          <label className="text-xs text-muted-foreground">Løbsdato & tid</label>
          <Input type="datetime-local" value={form.race_date} onChange={(e) => setForm({ ...form, race_date: e.target.value })} className="bg-secondary border-border" />
        </div>
      </div>
      <Input placeholder="Adresse (f.eks. Bøgelundvej 42, 6330 Padborg)" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-secondary border-border" />
      <LinksEditor links={formLinks} setLinks={setFormLinks} />
      {form.race_date && (
        <p className="text-xs text-muted-foreground">⏰ Deadline (captain + transfer) lukker automatisk: <strong className="text-foreground">{new Date(new Date(form.race_date).getTime() - 24 * 60 * 60 * 1000).toLocaleString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</strong></p>
      )}
      <Button onClick={handleAdd} className="bg-gradient-racing text-primary-foreground font-display"><Plus className="h-4 w-4 mr-1" />Tilføj løb</Button>
      <div className="space-y-2">
        {races.map((r) => (
          <div key={r.id} className="rounded-lg border border-border bg-secondary/50 p-3 text-sm text-foreground">
            {editingId === r.id ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-display font-bold">Runde {r.round_number}</div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input placeholder="Navn" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-card border-border" />
                  <Input placeholder="Lokation" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="bg-card border-border" />
                  <div>
                    <label className="text-xs text-muted-foreground">Løbsdato & tid</label>
                    <Input type="datetime-local" value={editForm.race_date} onChange={(e) => setEditForm({ ...editForm, race_date: e.target.value })} className="bg-card border-border" />
                  </div>
                </div>
                <Input placeholder="Adresse" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="bg-card border-border" />
                <LinksEditor links={editLinks} setLinks={setEditLinks} />
                {editForm.race_date && (
                  <p className="text-xs text-muted-foreground">⏰ Deadline lukker: <strong className="text-foreground">{new Date(new Date(editForm.race_date).getTime() - 24 * 60 * 60 * 1000).toLocaleString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</strong></p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleSaveEdit(r)} className="bg-success text-success-foreground"><Save className="h-3 w-3 mr-1" />Gem</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Annuller</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-display font-semibold">Runde {r.round_number}: {r.name}</span>
                  {r.location && <span className="text-muted-foreground"> – {r.location}</span>}
                  {r.race_date && (
                    <span className="text-muted-foreground ml-2">
                      • {new Date(r.race_date).toLocaleString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      <span className="text-xs ml-1">(DL: {new Date(new Date(r.race_date).getTime() - 24 * 60 * 60 * 1000).toLocaleString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })})</span>
                    </span>
                  )}
                  {r.address && <div className="text-xs text-muted-foreground mt-0.5">📍 {r.address}</div>}
                  {r.links && r.links.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-0.5">🔗 {r.links.map(l => l.label).join(", ")}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(r)} className="text-accent hover:text-accent/80 text-xs font-display">Rediger</button>
                  <button onClick={async () => { await deleteRace(r.id); refetch(); toast({ title: "Løb slettet" }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            )}
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
  const { data: categories = [], refetch: refetchCats } = useQuery({ queryKey: ["prediction_categories"], queryFn: fetchPredictionCategories });

  const [form, setForm] = useState({ race_id: "", question_type: "", question_text: "", option_a: "", option_b: "", prediction_deadline: "" });
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveAnswer, setResolveAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  // Category management
  const [catForm, setCatForm] = useState({ key: "", label: "", is_duel: false });
  const [showCatForm, setShowCatForm] = useState(false);

  const selectedCat = categories.find(c => c.key === form.question_type);
  const isDuel = selectedCat?.is_duel ?? false;

  // Build labels map from dynamic categories
  const categoryLabels: Record<string, string> = {};
  for (const c of categories) categoryLabels[c.key] = c.label;

  async function handleCreate() {
    if (!form.race_id || !form.question_text || !form.question_type) { toast({ title: "Vælg løb, kategori og skriv spørgsmål", variant: "destructive" }); return; }
    if (isDuel && (!form.option_a || !form.option_b)) { toast({ title: "Vælg begge kørere for duel", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await upsertPredictionQuestion({
        race_id: form.race_id,
        question_type: form.question_type,
        question_text: form.question_text,
        option_a: isDuel ? `driver:${form.option_a}` : (form.option_a || null),
        option_b: isDuel ? `driver:${form.option_b}` : (form.option_b || null),
        prediction_deadline: form.prediction_deadline || null,
      });
      setForm({ race_id: "", question_type: "", question_text: "", option_a: "", option_b: "", prediction_deadline: "" });
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

  async function handleCreateCategory() {
    if (!catForm.key || !catForm.label) { toast({ title: "Udfyld nøgle og label", variant: "destructive" }); return; }
    try {
      await upsertPredictionCategory({ key: catForm.key, label: catForm.label, is_duel: catForm.is_duel, sort_order: categories.length + 1 });
      setCatForm({ key: "", label: "", is_duel: false });
      setShowCatForm(false);
      refetchCats();
      toast({ title: "Kategori oprettet" });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm("Slet denne kategori? Eksisterende spørgsmål beholdes.")) return;
    try {
      await deletePredictionCategory(id);
      refetchCats();
      toast({ title: "Kategori slettet" });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
  }

  function getDriverName(val: string) {
    const id = val.replace("driver:", "");
    const d = drivers.find((d) => d.id === id);
    return d ? `#${d.car_number} ${d.name}` : val;
  }

  function getResolveOptions(q: any) {
    const cat = categories.find(c => c.key === q.question_type);
    if (cat?.is_duel) {
      return (
        <select value={resolveId === q.id ? resolveAnswer : ""} onChange={(e) => { setResolveId(q.id); setResolveAnswer(e.target.value); }} className="rounded-md bg-card border border-border px-2 py-1 text-sm text-foreground">
          <option value="">Vælg korrekt svar</option>
          {q.option_a && <option value={q.option_a}>{getDriverName(q.option_a)}</option>}
          {q.option_b && <option value={q.option_b}>{getDriverName(q.option_b)}</option>}
        </select>
      );
    }
    // Free text / yes-no style – admin types the correct answer
    return (
      <Input
        placeholder="Korrekt svar"
        value={resolveId === q.id ? resolveAnswer : ""}
        onChange={(e) => { setResolveId(q.id); setResolveAnswer(e.target.value); }}
        className="bg-card border-border w-40 text-sm"
      />
    );
  }

  const questionsByRace = new Map<string, typeof questions>();
  for (const q of questions) {
    if (!questionsByRace.has(q.race_id)) questionsByRace.set(q.race_id, []);
    questionsByRace.get(q.race_id)!.push(q);
  }

  return (
    <div className="space-y-6">
      {/* Category management */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-foreground">Kategorier</h3>
          <Button size="sm" variant="outline" onClick={() => setShowCatForm(!showCatForm)}>
            <Plus className="h-4 w-4 mr-1" />{showCatForm ? "Annuller" : "Tilføj kategori"}
          </Button>
        </div>
        {showCatForm && (
          <div className="flex flex-wrap gap-2 items-end">
            <Input placeholder="Nøgle (f.eks. top_speed)" value={catForm.key} onChange={(e) => setCatForm({ ...catForm, key: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })} className="bg-secondary border-border w-40" />
            <Input placeholder="Label (f.eks. Topfart-gæt)" value={catForm.label} onChange={(e) => setCatForm({ ...catForm, label: e.target.value })} className="bg-secondary border-border w-64" />
            <label className="flex items-center gap-1 text-sm text-muted-foreground">
              <Switch checked={catForm.is_duel} onCheckedChange={(v) => setCatForm({ ...catForm, is_duel: v })} />
              Duel (vælg 2 kørere)
            </label>
            <Button size="sm" onClick={handleCreateCategory} className="bg-gradient-racing text-primary-foreground font-display">Opret</Button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-1 rounded bg-secondary/50 px-3 py-1 text-sm">
              <span className="text-foreground">{c.label}</span>
              {c.is_duel && <span className="text-xs text-muted-foreground">(duel)</span>}
              <button onClick={() => handleDeleteCategory(c.id)} className="text-destructive hover:text-destructive/80 ml-1">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Create question */}
      <div className="space-y-2">
        <h3 className="font-display font-semibold text-foreground">Opret prediction-spørgsmål</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <select value={form.race_id} onChange={(e) => setForm({ ...form, race_id: e.target.value })} className="rounded-md bg-secondary border border-border px-3 py-2 text-sm text-foreground">
            <option value="">Vælg løb</option>
            {races.map((r) => <option key={r.id} value={r.id}>R{r.round_number}: {r.name}</option>)}
          </select>
          <select value={form.question_type} onChange={(e) => setForm({ ...form, question_type: e.target.value })} className="rounded-md bg-secondary border border-border px-3 py-2 text-sm text-foreground">
            <option value="">Vælg kategori</option>
            {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
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
        {!isDuel && form.question_type && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Svarmulighed A (valgfrit, f.eks. Ja)" value={form.option_a} onChange={(e) => setForm({ ...form, option_a: e.target.value })} className="bg-secondary border-border" />
            <Input placeholder="Svarmulighed B (valgfrit, f.eks. Nej)" value={form.option_b} onChange={(e) => setForm({ ...form, option_b: e.target.value })} className="bg-secondary border-border" />
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
            <h3 className="font-display font-semibold text-foreground">R{race.round_number}: {race.name} ({raceQs.length})</h3>
            {raceQs.map((q: any) => (
              <div key={q.id} className="rounded bg-secondary/50 px-3 py-3 text-sm space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-foreground">{q.question_text}</span>
                    <span className="text-xs text-muted-foreground ml-2">({categoryLabels[q.question_type] || q.question_type})</span>
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
                      {getResolveOptions(q)}
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
  const [adminEmailInput, setAdminEmailInput] = useState("");

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
        <span className="text-sm text-foreground">Transaktionsomkostning per transfer</span>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Omkostningen beregnes automatisk ud fra kørerens kategori:</p>
          <ul className="list-disc list-inside">
            <li><span className="text-gold font-medium">Guld</span>: 15 point</li>
            <li><span className="text-silver font-medium">Sølv</span>: 10 point</li>
            <li><span className="text-bronze font-medium">Bronze</span>: 5 point</li>
          </ul>
          <p>Gratis transfer ved udskiftning af udgåede kørere.</p>
        </div>
      </div>
      <div className="rounded bg-secondary/50 px-4 py-3 space-y-2">
        <span className="text-sm text-foreground">Admin notifikations-email</span>
        <p className="text-xs text-muted-foreground">Modtager advarsler 72 timer inden arrangement hvis opsætning mangler.</p>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder={settings.admin_notification_email || "admin@example.com"}
            value={adminEmailInput}
            onChange={(e) => setAdminEmailInput(e.target.value)}
            className="bg-card border-border flex-1"
          />
          <Button size="sm" onClick={async () => {
            if (!adminEmailInput.trim()) { toast({ title: "Angiv en email", variant: "destructive" }); return; }
            await updateSetting("admin_notification_email", adminEmailInput.trim());
            refetch();
            queryClient.invalidateQueries({ queryKey: ["settings"] });
            setAdminEmailInput("");
            toast({ title: "Admin-email opdateret" });
          }} className="bg-gradient-racing text-primary-foreground font-display">
            <Save className="h-4 w-4 mr-1" />Gem
          </Button>
        </div>
        {settings.admin_notification_email && (
          <p className="text-xs text-muted-foreground">Nuværende: {settings.admin_notification_email}</p>
        )}
      </div>

      {/* Sponsor settings */}
      <SponsorSettings settings={settings} refetch={refetch} queryClient={queryClient} />

      {/* Prize settings */}
      <PrizeSettings />
    </div>
  );
}

function SponsorSettings({ queryClient }: { settings: any; refetch: () => void; queryClient: any }) {
  const { toast } = useToast();
  const { data: sponsors = [], refetch: refetchSponsors } = useQuery({ queryKey: ["sponsors"], queryFn: fetchSponsors });
  const [form, setForm] = useState({ name: "", logo_url: "", website_url: "", tagline: "", prize_description: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  function startEdit(s: any) {
    setEditId(s.id);
    setForm({ name: s.name, logo_url: s.logo_url || "", website_url: s.website_url || "", tagline: s.tagline || "", prize_description: s.prize_description || "" });
  }

  function resetForm() {
    setEditId(null);
    setForm({ name: "", logo_url: "", website_url: "", tagline: "", prize_description: "" });
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const fileName = `sponsor-logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("sponsor-logos").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("sponsor-logos").getPublicUrl(fileName);
      setForm({ ...form, logo_url: urlData.publicUrl });
      toast({ title: "Logo uploadet" });
    } catch (err: any) {
      toast({ title: `Upload fejlede: ${err.message}`, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { toast({ title: "Angiv sponsor-navn", variant: "destructive" }); return; }
    try {
      await upsertSponsor({
        id: editId || undefined,
        name: form.name.trim(),
        logo_url: form.logo_url.trim() || null,
        website_url: form.website_url.trim() || null,
        tagline: form.tagline.trim() || null,
        prize_description: form.prize_description.trim() || null,
        sort_order: editId ? undefined : sponsors.length,
      } as any);
      resetForm();
      refetchSponsors();
      queryClient.invalidateQueries({ queryKey: ["sponsors"] });
      toast({ title: editId ? "Sponsor opdateret" : "Sponsor tilføjet" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  }

  async function handleDrop(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const reordered = [...sponsors];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    try {
      await Promise.all(reordered.map((s: any, i: number) => upsertSponsor({ id: s.id, name: s.name, sort_order: i } as any)));
      refetchSponsors();
      queryClient.invalidateQueries({ queryKey: ["sponsors"] });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Slet sponsor "${name}"?`)) return;
    try {
      await deleteSponsor(id);
      refetchSponsors();
      queryClient.invalidateQueries({ queryKey: ["sponsors"] });
      toast({ title: "Sponsor slettet" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  }

  return (
    <div className="rounded bg-secondary/50 px-4 py-3 space-y-3">
      <span className="text-sm font-medium text-foreground">Præmiesponsorer (forside)</span>
      <p className="text-xs text-muted-foreground">Tilføj en eller flere sponsorer. De vises på forsiden adskilt af en rød streg.</p>

      {/* Form */}
      <div className="space-y-2 border border-border rounded p-3 bg-card">
        <Input placeholder="Sponsor-navn *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border" />
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Sponsor-logo</label>
          <div className="flex items-center gap-2">
            <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} className="text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50" />
            {uploading && <span className="text-xs text-muted-foreground">Uploader...</span>}
          </div>
          {form.logo_url && (
            <div className="flex items-center gap-2 mt-1">
              <img src={form.logo_url} alt="Logo preview" className="h-10 w-auto object-contain rounded border border-border" />
              <button onClick={() => setForm({ ...form, logo_url: "" })} className="text-xs text-destructive hover:underline">Fjern</button>
            </div>
          )}
        </div>
        <Input placeholder="Website-URL" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} className="bg-secondary border-border" />
        <Input placeholder="Tagline / beskrivelse (valgfri)" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="bg-secondary border-border" />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} className="bg-gradient-racing text-primary-foreground font-display">
            {editId ? <><Save className="h-4 w-4 mr-1" />Gem</> : <><Plus className="h-4 w-4 mr-1" />Tilføj sponsor</>}
          </Button>
          {editId && <Button size="sm" variant="outline" onClick={resetForm}>Annuller</Button>}
        </div>
      </div>

      {/* List */}
      <div className="space-y-1">
        {sponsors.map((s: any, idx: number) => (
          <div
            key={s.id}
            draggable
            onDragStart={(e) => { setDragIdx(idx); e.dataTransfer.effectAllowed = "move"; }}
            onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
            onDragLeave={() => setDragOverIdx(null)}
            onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) handleDrop(dragIdx, idx); setDragIdx(null); setDragOverIdx(null); }}
            onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
            className={`flex items-center justify-between rounded bg-card px-3 py-2 text-sm border transition-colors cursor-grab active:cursor-grabbing ${dragOverIdx === idx ? "border-racing-red bg-racing-red/5" : "border-border"} ${dragIdx === idx ? "opacity-50" : ""}`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <button onClick={() => startEdit(s)} className="text-left flex-1 min-w-0 flex items-center gap-2">
                {s.logo_url && <img src={s.logo_url} alt="" className="h-6 w-auto object-contain" />}
                <span className="font-medium text-foreground">{s.name}</span>
                {s.tagline && <span className="text-muted-foreground text-xs truncate">– {s.tagline}</span>}
              </button>
            </div>
            <button onClick={() => handleDelete(s.id, s.name)} className="text-destructive hover:text-destructive/80 ml-2"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {sponsors.length === 0 && <p className="text-xs text-muted-foreground">Ingen sponsorer tilføjet endnu.</p>}
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
