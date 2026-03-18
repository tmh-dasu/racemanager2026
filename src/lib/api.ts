import { supabase } from "@/integrations/supabase/client";

export interface Driver {
  id: string;
  name: string;
  car_number: number;
  team: string;
  price: number;
  photo_url: string | null;
}

export interface Race {
  id: string;
  round_number: number;
  name: string;
  location: string | null;
  race_date: string | null;
}

export interface RaceResult {
  id: string;
  race_id: string;
  driver_id: string;
  position: number | null;
  fastest_lap: boolean;
  pole_position: boolean;
  dnf: boolean;
  points: number;
}

export interface Manager {
  id: string;
  name: string;
  email: string;
  team_name: string;
  budget_remaining: number;
  joker_used: boolean;
  total_points: number;
}

export interface ManagerDriver {
  id: string;
  manager_id: string;
  driver_id: string;
}

export interface Settings {
  budget_limit: number;
  transfer_window_open: boolean;
  team_registration_open: boolean;
}

const POINTS_MAP: Record<number, number> = {
  1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1,
};

export function calculatePoints(position: number | null, fastestLap: boolean, pole: boolean, dnf: boolean): number {
  if (dnf) return 0;
  let pts = POINTS_MAP[position || 0] || 0;
  if (fastestLap) pts += 3;
  if (pole) pts += 3;
  return pts;
}

export async function fetchSettings(): Promise<Settings> {
  const { data } = await supabase.from("settings").select("*");
  const map: Record<string, string> = {};
  data?.forEach((s: any) => { map[s.key] = s.value; });
  return {
    budget_limit: Number(map.budget_limit || 100),
    transfer_window_open: map.transfer_window_open === "true",
    team_registration_open: map.team_registration_open === "true",
  };
}

export async function fetchDrivers(): Promise<Driver[]> {
  const { data } = await supabase.from("drivers").select("*").order("car_number");
  return (data || []) as Driver[];
}

export async function fetchRaces(): Promise<Race[]> {
  const { data } = await supabase.from("races").select("*").order("round_number");
  return (data || []) as Race[];
}

export async function fetchRaceResults(raceId?: string): Promise<RaceResult[]> {
  let query = supabase.from("race_results").select("*");
  if (raceId) query = query.eq("race_id", raceId);
  const { data } = await query;
  return (data || []) as RaceResult[];
}

export async function fetchManagers(): Promise<Manager[]> {
  const { data } = await supabase.from("managers").select("*").order("total_points", { ascending: false });
  return (data || []) as Manager[];
}

export async function fetchManagerByEmail(email: string): Promise<Manager | null> {
  const { data } = await supabase.from("managers").select("*").eq("email", email).maybeSingle();
  return data as Manager | null;
}

export async function fetchManagerDrivers(managerId: string): Promise<ManagerDriver[]> {
  const { data } = await supabase.from("manager_drivers").select("*").eq("manager_id", managerId);
  return (data || []) as ManagerDriver[];
}

export async function createManager(name: string, email: string, teamName: string, budgetRemaining: number) {
  const { data, error } = await supabase.from("managers").insert({ name, email, team_name: teamName, budget_remaining: budgetRemaining }).select().single();
  if (error) throw error;
  return data as Manager;
}

export async function addManagerDriver(managerId: string, driverId: string) {
  const { error } = await supabase.from("manager_drivers").insert({ manager_id: managerId, driver_id: driverId });
  if (error) throw error;
}

export async function useJoker(managerId: string, oldDriverId: string, newDriverId: string, newBudget: number) {
  const { error: deleteError } = await supabase.from("manager_drivers").delete().eq("manager_id", managerId).eq("driver_id", oldDriverId);
  if (deleteError) throw deleteError;
  const { error: insertError } = await supabase.from("manager_drivers").insert({ manager_id: managerId, driver_id: newDriverId });
  if (insertError) throw insertError;
  const { error: updateError } = await supabase.from("managers").update({ joker_used: true, budget_remaining: newBudget }).eq("id", managerId);
  if (updateError) throw updateError;
  await supabase.from("joker_transfers").insert({ manager_id: managerId, old_driver_id: oldDriverId, new_driver_id: newDriverId });
}

export async function updateSetting(key: string, value: string) {
  const { error } = await supabase.from("settings").update({ value }).eq("key", key);
  if (error) throw error;
}

export async function upsertDriver(driver: Partial<Driver> & { name: string; car_number: number; team: string; price: number }) {
  if (driver.id) {
    const { error } = await supabase.from("drivers").update(driver).eq("id", driver.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("drivers").insert(driver);
    if (error) throw error;
  }
}

export async function deleteDriver(id: string) {
  const { error } = await supabase.from("drivers").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteRace(id: string) {
  // Delete associated results first
  const { error: resErr } = await supabase.from("race_results").delete().eq("race_id", id);
  if (resErr) throw resErr;
  const { error } = await supabase.from("races").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteManager(id: string) {
  // Delete associated driver picks and joker transfers first
  await supabase.from("manager_drivers").delete().eq("manager_id", id);
  await supabase.from("joker_transfers").delete().eq("manager_id", id);
  const { error } = await supabase.from("managers").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertRace(race: Partial<Race> & { round_number: number; name: string }) {
  if (race.id) {
    const { error } = await supabase.from("races").update(race).eq("id", race.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("races").insert(race);
    if (error) throw error;
  }
}

export async function upsertRaceResult(result: Omit<RaceResult, "id">) {
  const points = calculatePoints(result.position, result.fastest_lap, result.pole_position, result.dnf);
  const { error } = await supabase.from("race_results").upsert(
    { ...result, points },
    { onConflict: "race_id,driver_id" }
  );
  if (error) throw error;
}

export async function recalculateManagerPoints() {
  const managers = await fetchManagers();
  for (const mgr of managers) {
    const mds = await fetchManagerDrivers(mgr.id);
    const driverIds = mds.map((md) => md.driver_id);
    if (driverIds.length === 0) continue;
    const { data: results } = await supabase.from("race_results").select("points").in("driver_id", driverIds);
    const total = (results || []).reduce((sum: number, r: any) => sum + (r.points || 0), 0);
    await supabase.from("managers").update({ total_points: total }).eq("id", mgr.id);
  }
}
