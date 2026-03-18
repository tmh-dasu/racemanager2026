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
  session_type: string;
  position: number | null;
  fastest_lap: boolean;
  pole_position: boolean;
  dnf: boolean;
  points: number;
}

export interface Manager {
  id: string;
  name: string;
  email?: string;
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

export const SESSION_TYPES = ["qualifying", "heat1", "heat2", "heat3"] as const;
export const SESSION_LABELS: Record<string, string> = {
  qualifying: "Tidtagning",
  heat1: "Heat 1",
  heat2: "Heat 2",
  heat3: "Heat 3",
};

// SuperGT points scale: positions 1-20
const POINTS_MAP: Record<number, number> = {
  1: 25, 2: 22, 3: 20, 4: 18, 5: 16, 6: 15, 7: 14, 8: 13,
  9: 12, 10: 11, 11: 10, 12: 9, 13: 8, 14: 7, 15: 6, 16: 5,
  17: 4, 18: 3, 19: 2, 20: 1,
};

export function calculatePoints(position: number | null, dnf: boolean): number {
  if (dnf) return 0;
  return POINTS_MAP[position || 0] || 0;
}

/** Drop worst individual session results based on number of completed rounds (§2.7)
 *  Drop-worst only activates from round 4 onwards. */
export function applyDropWorst(sessionPoints: number[], completedRounds: number): { total: number; dropCount: number } {
  let dropCount: number;
  if (completedRounds >= 7) dropCount = 4;
  else if (completedRounds >= 6) dropCount = 3;
  else if (completedRounds >= 4) dropCount = 2;
  else dropCount = 0; // No drops before round 4

  // Never drop more results than available (keep at least 1)
  dropCount = Math.min(dropCount, Math.max(0, sessionPoints.length - 1));

  // Sort ascending to find worst individual results
  const sorted = [...sessionPoints].sort((a, b) => a - b);
  const kept = sorted.slice(dropCount);
  const total = kept.reduce((sum, pts) => sum + pts, 0);
  return { total, dropCount };
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
  const { data } = await supabase.from("managers_public").select("id, name, team_name, total_points, joker_used, budget_remaining, created_at").order("total_points", { ascending: false });
  return (data || []) as Manager[];
}

export async function fetchManagerByEmail(email: string): Promise<Manager | null> {
  const { data } = await supabase.from("managers").select("*").eq("email", email).maybeSingle();
  return data as Manager | null;
}

export async function fetchManagerByUserId(userId: string): Promise<Manager | null> {
  const { data } = await supabase.from("managers").select("*").eq("user_id", userId).maybeSingle();
  return data as Manager | null;
}

export async function fetchManagerDrivers(managerId: string): Promise<ManagerDriver[]> {
  const { data } = await supabase.from("manager_drivers").select("*").eq("manager_id", managerId);
  return (data || []) as ManagerDriver[];
}

export async function createManager(name: string, email: string, teamName: string, budgetRemaining: number, userId?: string) {
  const insertData: any = { name, email, team_name: teamName, budget_remaining: budgetRemaining };
  if (userId) insertData.user_id = userId;
  const { data, error } = await supabase.from("managers").insert(insertData).select().single();
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
  const { error: resErr } = await supabase.from("race_results").delete().eq("race_id", id);
  if (resErr) throw resErr;
  const { error } = await supabase.from("races").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteManager(id: string) {
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
  const points = calculatePoints(result.position, result.dnf);
  const { error } = await supabase.from("race_results").upsert(
    { ...result, points },
    { onConflict: "race_id,driver_id,session_type" }
  );
  if (error) throw error;
}

export async function recalculateManagerPoints() {
  const managers = await fetchManagers();
  const races = await fetchRaces();
  // Count only rounds that have actual results
  const { data: resultRaces } = await supabase.from("race_results").select("race_id");
  const completedRounds = new Set((resultRaces || []).map((r: any) => r.race_id)).size;
  for (const mgr of managers) {
    const mds = await fetchManagerDrivers(mgr.id);
    const driverIds = mds.map((md) => md.driver_id);
    if (driverIds.length === 0) continue;
    const { data: results } = await supabase.from("race_results").select("points").in("driver_id", driverIds);
    
    // Collect all individual session points
    const sessionPoints = (results || []).map((r: any) => r.points || 0);
    const { total } = applyDropWorst(sessionPoints, completedRounds);
    
    await supabase.from("managers").update({ total_points: total }).eq("id", mgr.id);
  }
}
