import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Users, Flag, Settings as SettingsIcon, Plus, Trash2, Save } from "lucide-react";
import { fetchDrivers, fetchRaces, fetchRaceResults, fetchSettings, fetchManagers, fetchManagerDrivers, upsertDriver, deleteDriver, upsertRace, deleteRace, upsertRaceResult, updateSetting, recalculateManagerPoints, deleteManager, type Driver, type Race, type Manager } from "@/lib/api";
import { formatDKR } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import PageLayout from "@/components/PageLayout";

const ADMIN_PASSWORD = "dasu2025";

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);

  if (!authed) {
    return (
      <PageLayout>
        <div className="container py-12 max-w-sm space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-racing-red" />
            <h1 className="font-display text-2xl font-bold text-foreground">Admin</h1>
          </div>
          <Input
            type="password"
            placeholder="Adgangskode"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (password === ADMIN_PASSWORD ? setAuthed(true) : toast({ title: "Forkert kode", variant: "destructive" }))}
            className="bg-secondary border-border"
          />
          <Button onClick={() => password === ADMIN_PASSWORD ? setAuthed(true) : toast({ title: "Forkert kode", variant: "destructive" })} className="w-full bg-gradient-racing text-primary-foreground font-display">
            Log ind
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container py-6">
        <h1 className="font-display text-2xl font-bold text-foreground mb-4">Admin Panel</h1>
        <Tabs defaultValue="drivers">
          <TabsList className="bg-secondary border-border mb-4">
            <TabsTrigger value="drivers" className="font-display">Kørere</TabsTrigger>
            <TabsTrigger value="races" className="font-display">Løb</TabsTrigger>
            <TabsTrigger value="results" className="font-display">Resultater</TabsTrigger>
            <TabsTrigger value="managers" className="font-display">Managers</TabsTrigger>
            <TabsTrigger value="settings" className="font-display">Indstillinger</TabsTrigger>
          </TabsList>

          <TabsContent value="drivers"><DriversAdmin /></TabsContent>
          <TabsContent value="races"><RacesAdmin /></TabsContent>
          <TabsContent value="results"><ResultsAdmin /></TabsContent>
          <TabsContent value="managers"><ManagersAdmin /></TabsContent>
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
  const [form, setForm] = useState({ name: "", car_number: "", team: "", price: "", photo_url: "" });

  async function handleAdd() {
    if (!form.name || !form.car_number || !form.team || !form.price) {
      toast({ title: "Udfyld alle felter", variant: "destructive" }); return;
    }
    try {
      await upsertDriver({ name: form.name, car_number: Number(form.car_number), team: form.team, price: Number(form.price), photo_url: form.photo_url || null });
      setForm({ name: "", car_number: "", team: "", price: "", photo_url: "" });
      refetch();
      toast({ title: "Kører tilføjet" });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
  }

  async function handleDelete(id: string) {
    await deleteDriver(id);
    refetch();
    toast({ title: "Kører slettet" });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-5">
        <Input placeholder="Navn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border" />
        <Input placeholder="Bil #" type="number" value={form.car_number} onChange={(e) => setForm({ ...form, car_number: e.target.value })} className="bg-secondary border-border" />
        <Input placeholder="Team" value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} className="bg-secondary border-border" />
        <Input placeholder="Pris" type="number" step="0.1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-secondary border-border" />
        <Button onClick={handleAdd} className="bg-gradient-racing text-primary-foreground font-display"><Plus className="h-4 w-4 mr-1" />Tilføj</Button>
      </div>
      <div className="space-y-1">
        {drivers.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded bg-secondary/50 px-3 py-2 text-sm">
            <span className="text-foreground">#{d.car_number} {d.name} – {d.team} – {Number(d.price).toLocaleString("da-DK")} DKR</span>
            <button onClick={() => handleDelete(d.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RacesAdmin() {
  const { toast } = useToast();
  const { data: races = [], refetch } = useQuery({ queryKey: ["races"], queryFn: fetchRaces });
  const [form, setForm] = useState({ round_number: "", name: "", location: "", race_date: "" });

  async function handleAdd() {
    if (!form.round_number || !form.name) { toast({ title: "Udfyld runde og navn", variant: "destructive" }); return; }
    try {
      await upsertRace({ round_number: Number(form.round_number), name: form.name, location: form.location || null, race_date: form.race_date || null });
      setForm({ round_number: "", name: "", location: "", race_date: "" });
      refetch();
      toast({ title: "Løb tilføjet" });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-4">
        <Input placeholder="Runde #" type="number" value={form.round_number} onChange={(e) => setForm({ ...form, round_number: e.target.value })} className="bg-secondary border-border" />
        <Input placeholder="Navn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border" />
        <Input placeholder="Lokation" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="bg-secondary border-border" />
        <Input placeholder="Dato" type="datetime-local" value={form.race_date} onChange={(e) => setForm({ ...form, race_date: e.target.value })} className="bg-secondary border-border" />
      </div>
      <Button onClick={handleAdd} className="bg-gradient-racing text-primary-foreground font-display"><Plus className="h-4 w-4 mr-1" />Tilføj løb</Button>
      <div className="space-y-1">
        {races.map((r) => (
          <div key={r.id} className="rounded bg-secondary/50 px-3 py-2 text-sm text-foreground">
            Runde {r.round_number}: {r.name} {r.location && `– ${r.location}`}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: races = [] } = useQuery({ queryKey: ["races"], queryFn: fetchRaces });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });
  const [selectedRace, setSelectedRace] = useState("");
  const [results, setResults] = useState<Record<string, { position: string; fastest_lap: boolean; pole_position: boolean; dnf: boolean }>>({});

  async function initResults(raceId: string) {
    setSelectedRace(raceId);
    const init: typeof results = {};
    drivers.forEach((d) => { init[d.id] = { position: "", fastest_lap: false, pole_position: false, dnf: false }; });
    
    // Fetch existing results for this race
    const existing = await fetchRaceResults(raceId);
    existing.forEach((r) => {
      if (init[r.driver_id]) {
        init[r.driver_id] = {
          position: r.position !== null ? String(r.position) : "",
          fastest_lap: r.fastest_lap,
          pole_position: r.pole_position,
          dnf: r.dnf,
        };
      }
    });
    setResults(init);
  }

  async function handleSave() {
    try {
      for (const [driverId, r] of Object.entries(results)) {
        if (!r.position && !r.dnf) continue;
        await upsertRaceResult({
          race_id: selectedRace,
          driver_id: driverId,
          position: r.dnf ? null : Number(r.position) || null,
          fastest_lap: r.fastest_lap,
          pole_position: r.pole_position,
          dnf: r.dnf,
          points: 0,
        });
      }
      await recalculateManagerPoints();
      queryClient.invalidateQueries({ queryKey: ["race_results"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      toast({ title: "Resultater gemt og point opdateret ✅" });
    } catch (err: any) { toast({ title: err.message, variant: "destructive" }); }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {races.map((r) => (
          <Button key={r.id} variant={selectedRace === r.id ? "default" : "outline"} onClick={() => initResults(r.id)} className="font-display">
            R{r.round_number}
          </Button>
        ))}
      </div>
      {selectedRace && (
        <div className="space-y-2">
          {drivers.map((d) => (
            <div key={d.id} className="flex items-center gap-2 rounded bg-secondary/50 px-3 py-2">
              <span className="w-32 text-sm font-medium text-foreground truncate">#{d.car_number} {d.name}</span>
              <Input
                placeholder="Pos"
                type="number"
                className="w-16 bg-card border-border text-sm"
                value={results[d.id]?.position || ""}
                onChange={(e) => setResults({ ...results, [d.id]: { ...results[d.id], position: e.target.value } })}
                disabled={results[d.id]?.dnf}
              />
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                <input type="checkbox" checked={results[d.id]?.fastest_lap || false} onChange={(e) => setResults({ ...results, [d.id]: { ...results[d.id], fastest_lap: e.target.checked } })} />
                FL
              </label>
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                <input type="checkbox" checked={results[d.id]?.pole_position || false} onChange={(e) => setResults({ ...results, [d.id]: { ...results[d.id], pole_position: e.target.checked } })} />
                Pole
              </label>
              <label className="flex items-center gap-1 text-xs text-destructive">
                <input type="checkbox" checked={results[d.id]?.dnf || false} onChange={(e) => setResults({ ...results, [d.id]: { ...results[d.id], dnf: e.target.checked, position: "" } })} />
                DNF
              </label>
            </div>
          ))}
          <Button onClick={handleSave} className="bg-gradient-racing text-primary-foreground font-display">
            <Save className="h-4 w-4 mr-1" />Gem resultater
          </Button>
        </div>
      )}
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

  async function updateBudget(val: string) {
    await updateSetting("budget_limit", val);
    refetch();
    toast({ title: "Budget opdateret" });
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
      <div className="flex items-center gap-3 rounded bg-secondary/50 px-4 py-3">
        <span className="text-sm text-foreground">Budgetgrænse</span>
        <Input
          type="number"
          className="w-24 bg-card border-border"
          defaultValue={settings.budget_limit}
          onBlur={(e) => updateBudget(e.target.value)}
        />
      </div>
    </div>
  );
}
