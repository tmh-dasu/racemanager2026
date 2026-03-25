import { supabase } from "@/integrations/supabase/client";

export interface Driver {
  id: string;
  name: string;
  car_number: number;
  team: string;
  price: number;
  photo_url: string | null;
  bio: string;
  club: string;
  quote: string;
  tier: "gold" | "silver" | "bronze";
}

export interface Race {
  id: string;
  round_number: number;
  name: string;
  location: string | null;
  race_date: string | null;
  captain_deadline: string | null;
}

export interface CaptainSelection {
  id: string;
  manager_id: string;
  race_id: string;
  driver_id: string;
  created_at: string;
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
  slug?: string;
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
  const { data } = await supabase.from("managers_public").select("id, name, team_name, total_points, joker_used, budget_remaining, created_at, slug").order("total_points", { ascending: false });
  return (data || []) as Manager[];
}

export async function fetchManagerBySlug(slug: string): Promise<Manager | null> {
  const { data } = await supabase.from("managers_public").select("id, name, team_name, total_points, joker_used, budget_remaining, created_at, slug").eq("slug", slug).maybeSingle();
  return data as Manager | null;
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

export function generateSlug(teamName: string): string {
  return teamName.toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function createManager(name: string, email: string, teamName: string, budgetRemaining: number, userId?: string) {
  const slug = generateSlug(teamName);
  const insertData: any = { name, email, team_name: teamName, budget_remaining: budgetRemaining, slug };
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

  // Inherit captaincy: update future captain selections from old driver to new driver
  // Only for races where captain_deadline hasn't passed yet
  const { data: futureRaces } = await supabase.from("races").select("id").gt("captain_deadline", new Date().toISOString());
  if (futureRaces && futureRaces.length > 0) {
    const futureRaceIds = futureRaces.map((r) => r.id);
    await supabase.from("captain_selections")
      .update({ driver_id: newDriverId })
      .eq("manager_id", managerId)
      .eq("driver_id", oldDriverId)
      .in("race_id", futureRaceIds);
  }
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
  const { data: managerRows } = await supabase.from("managers").select("id");
  if (!managerRows || managerRows.length === 0) return;

  const { data: resultRaces } = await supabase.from("race_results").select("race_id");
  const completedRounds = new Set((resultRaces || []).map((r: any) => r.race_id)).size;

  const { data: allResults } = await supabase.from("race_results").select("driver_id, points, race_id");
  const { data: allMDs } = await supabase.from("manager_drivers").select("manager_id, driver_id");
  const { data: allCaptains } = await supabase.from("captain_selections").select("manager_id, race_id, driver_id");
  const { data: allPredAnswers } = await supabase.from("prediction_answers").select("manager_id, is_correct");
  const { data: allSeasonPreds } = await supabase.from("season_predictions").select("manager_id, is_correct");

  for (const mgr of managerRows) {
    const driverIds = (allMDs || []).filter((md: any) => md.manager_id === mgr.id).map((md: any) => md.driver_id);
    if (driverIds.length === 0) {
      await supabase.from("managers").update({ total_points: 0 }).eq("id", mgr.id);
      continue;
    }

    const captainMap = new Map<string, string>();
    (allCaptains || []).filter((c: any) => c.manager_id === mgr.id).forEach((c: any) => {
      captainMap.set(c.race_id, c.driver_id);
    });

    const sessionPoints = (allResults || [])
      .filter((r: any) => driverIds.includes(r.driver_id))
      .map((r: any) => {
        const pts = r.points || 0;
        const isCaptain = captainMap.get(r.race_id) === r.driver_id;
        return isCaptain ? pts * 2 : pts;
      });
    const { total } = applyDropWorst(sessionPoints, completedRounds);

    // Prediction bonuses: +10 per correct race prediction, +15 for correct season prediction
    const predictionBonus = (allPredAnswers || []).filter((a: any) => a.manager_id === mgr.id && a.is_correct === true).length * 10;
    const seasonBonus = (allSeasonPreds || []).find((s: any) => s.manager_id === mgr.id && s.is_correct === true) ? 15 : 0;

    await supabase.from("managers").update({ total_points: total + predictionBonus + seasonBonus }).eq("id", mgr.id);
  }
}

// Captain functions
export async function fetchCaptainSelections(managerId: string): Promise<CaptainSelection[]> {
  const { data } = await supabase.from("captain_selections").select("*").eq("manager_id", managerId);
  return (data || []) as CaptainSelection[];
}

export async function setCaptainSelection(managerId: string, raceId: string, driverId: string) {
  const { error } = await supabase.from("captain_selections").upsert(
    { manager_id: managerId, race_id: raceId, driver_id: driverId },
    { onConflict: "manager_id,race_id" }
  );
  if (error) throw error;
}

export function getNextRaceWithDeadline(races: Race[]): Race | null {
  const now = new Date();
  return races
    .filter((r) => r.captain_deadline && new Date(r.captain_deadline) > now)
    .sort((a, b) => new Date(a.captain_deadline!).getTime() - new Date(b.captain_deadline!).getTime())[0] || null;
}

export function getCaptaincyBudget(
  driverId: string, 
  captainSelections: CaptainSelection[]
): number {
  const used = captainSelections.filter((c) => c.driver_id === driverId).length;
  return Math.max(0, 2 - used);
}

// Prediction types
export interface PredictionQuestion {
  id: string;
  race_id: string;
  question_type: "final_winner" | "fastest_qualifying" | "tier_winner" | "most_points";
  question_text: string;
  correct_answer: string | null;
  created_at: string;
}

export interface PredictionAnswer {
  id: string;
  question_id: string;
  manager_id: string;
  answer: string;
  is_correct: boolean | null;
  created_at: string;
}

export interface SeasonPrediction {
  id: string;
  manager_id: string;
  driver_id: string;
  is_correct: boolean | null;
  created_at: string;
}

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  final_winner: "Gæt vinder af finalen",
  fastest_qualifying: "Gæt hurtigste i tidtagning",
  tier_winner: "Gæt hvilken tier vinder finalen",
  most_points: "Gæt kører med flest point",
};

// Prediction API functions
export async function fetchPredictionQuestions(): Promise<PredictionQuestion[]> {
  const { data } = await supabase.from("prediction_questions").select("*").order("created_at");
  return (data || []) as PredictionQuestion[];
}

export async function fetchPredictionAnswers(managerId: string): Promise<PredictionAnswer[]> {
  const { data } = await supabase.from("prediction_answers").select("*").eq("manager_id", managerId);
  return (data || []) as PredictionAnswer[];
}

export async function submitPredictionAnswer(questionId: string, managerId: string, answer: string) {
  const { error } = await supabase.from("prediction_answers").upsert(
    { question_id: questionId, manager_id: managerId, answer },
    { onConflict: "question_id,manager_id" }
  );
  if (error) throw error;
}

export async function fetchSeasonPrediction(managerId: string): Promise<SeasonPrediction | null> {
  const { data } = await supabase.from("season_predictions").select("*").eq("manager_id", managerId).maybeSingle();
  return data as SeasonPrediction | null;
}

export async function submitSeasonPrediction(managerId: string, driverId: string) {
  const { error } = await supabase.from("season_predictions").insert({ manager_id: managerId, driver_id: driverId });
  if (error) throw error;
}

export async function upsertPredictionQuestion(q: { id?: string; race_id: string; question_type: string; question_text: string; correct_answer?: string | null }) {
  if (q.id) {
    const { error } = await supabase.from("prediction_questions").update(q).eq("id", q.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("prediction_questions").insert(q);
    if (error) throw error;
  }
}

export async function resolvePredictions(questionId: string, correctAnswer: string) {
  // Update the question with correct answer
  const { error: qErr } = await supabase.from("prediction_questions").update({ correct_answer: correctAnswer }).eq("id", questionId);
  if (qErr) throw qErr;

  // Fetch all answers and mark correct/incorrect
  const { data: answers } = await supabase.from("prediction_answers").select("id, answer").eq("question_id", questionId);
  for (const a of (answers || [])) {
    const isCorrect = a.answer.toLowerCase() === correctAnswer.toLowerCase();
    await supabase.from("prediction_answers").update({ is_correct: isCorrect }).eq("id", a.id);
  }
}
