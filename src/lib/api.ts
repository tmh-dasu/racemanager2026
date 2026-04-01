import { supabase } from "@/integrations/supabase/client";

export interface Driver {
  id: string;
  name: string;
  car_number: number;
  team: string;
  photo_url: string | null;
  bio: string;
  club: string;
  quote: string;
  tier: "gold" | "silver" | "bronze";
  withdrawn: boolean;
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
  total_points: number;
  slug?: string;
}

export interface ManagerDriver {
  id: string;
  manager_id: string;
  driver_id: string;
}

export interface Transfer {
  id: string;
  manager_id: string;
  old_driver_id: string;
  new_driver_id: string;
  point_cost: number;
  is_free: boolean;
  created_at: string;
}

export interface Settings {
  transfer_window_open: boolean;
  team_registration_open: boolean;
  transfer_cost: number;
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
  else dropCount = 0;

  dropCount = Math.min(dropCount, Math.max(0, sessionPoints.length - 1));

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
    transfer_cost: Number(map.transfer_cost || 10),
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
  const { data } = await supabase.from("managers_public").select("id, name, team_name, total_points, budget_remaining, created_at, slug").order("total_points", { ascending: false });
  return (data || []) as Manager[];
}

export async function fetchManagerBySlug(slug: string): Promise<Manager | null> {
  const { data } = await supabase.from("managers_public").select("id, name, team_name, total_points, budget_remaining, created_at, slug").eq("slug", slug).maybeSingle();
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

// Transfer system
export async function performTransfer(managerId: string, oldDriverId: string, newDriverId: string, pointCost: number) {
  // Remove old driver
  const { error: deleteError } = await supabase.from("manager_drivers").delete().eq("manager_id", managerId).eq("driver_id", oldDriverId);
  if (deleteError) throw deleteError;
  // Add new driver
  const { error: insertError } = await supabase.from("manager_drivers").insert({ manager_id: managerId, driver_id: newDriverId });
  if (insertError) throw insertError;
  // Log transfer
  const { error: logError } = await supabase.from("transfers").insert({ manager_id: managerId, old_driver_id: oldDriverId, new_driver_id: newDriverId, point_cost: pointCost, is_free: false } as any);
  if (logError) throw logError;
  // Note: captaincy budget follows tier slot, not individual driver — no captain inheritance needed
}

// Free emergency transfer (for withdrawn drivers)
export async function performEmergencyTransfer(managerId: string, oldDriverId: string, newDriverId: string) {
  const { error: deleteError } = await supabase.from("manager_drivers").delete().eq("manager_id", managerId).eq("driver_id", oldDriverId);
  if (deleteError) throw deleteError;
  const { error: insertError } = await supabase.from("manager_drivers").insert({ manager_id: managerId, driver_id: newDriverId });
  if (insertError) throw insertError;
  const { error: logError } = await supabase.from("transfers").insert({ manager_id: managerId, old_driver_id: oldDriverId, new_driver_id: newDriverId, point_cost: 0, is_free: true } as any);
  if (logError) throw logError;
  // Note: captaincy budget follows tier slot — no captain inheritance needed
}

export async function fetchTransfers(managerId?: string): Promise<Transfer[]> {
  let query = supabase.from("transfers").select("*").order("created_at", { ascending: false });
  if (managerId) query = query.eq("manager_id", managerId);
  const { data } = await query;
  return (data || []) as Transfer[];
}

export async function fetchAllTransfers(): Promise<Transfer[]> {
  const { data } = await supabase.from("transfers").select("*").order("created_at", { ascending: false });
  return (data || []) as Transfer[];
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
  await supabase.from("transfers").delete().eq("manager_id", id);
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
  const { data: allTransfers } = await supabase.from("transfers").select("manager_id, point_cost");

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

    // Prediction bonuses: 5 points per correct answer
    const predictionBonus = (allPredAnswers || []).filter((a: any) => a.manager_id === mgr.id && a.is_correct === true).length * 5;

    // Transfer costs (deducted from total)
    const transferCosts = (allTransfers || [])
      .filter((t: any) => t.manager_id === mgr.id)
      .reduce((sum: number, t: any) => sum + (t.point_cost || 0), 0);

    await supabase.from("managers").update({ total_points: total + predictionBonus - transferCosts }).eq("id", mgr.id);
  }
}

// Captain functions
export async function fetchCaptainSelections(managerId: string): Promise<CaptainSelection[]> {
  const { data } = await supabase.from("captain_selections").select("*").eq("manager_id", managerId);
  return (data || []) as CaptainSelection[];
}

export async function fetchAllCaptainSelections(): Promise<CaptainSelection[]> {
  const { data } = await supabase.from("captain_selections").select("*");
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

// getCaptaincyBudget is now handled in CaptainSelector component (per tier slot, not per driver)

// Prediction types
export interface PredictionQuestion {
  id: string;
  race_id: string;
  question_type: "duel" | "point_duel" | "yes_no";
  question_text: string;
  correct_answer: string | null;
  published: boolean;
  prediction_deadline: string | null;
  option_a: string | null;
  option_b: string | null;
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

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  duel: "Duel – hvem kvalificerer sig bedst?",
  point_duel: "Pointduel – hvem scorer flest point?",
  yes_no: "Ja/Nej-spørgsmål",
};

export async function fetchPredictionQuestions(): Promise<PredictionQuestion[]> {
  const { data } = await supabase.from("prediction_questions").select("*").order("created_at");
  return (data || []) as unknown as PredictionQuestion[];
}

export async function fetchPublishedPredictionQuestions(): Promise<PredictionQuestion[]> {
  const { data } = await supabase.from("prediction_questions").select("*").eq("published", true).order("created_at");
  return (data || []) as unknown as PredictionQuestion[];
}

export async function fetchPredictionAnswers(managerId: string): Promise<PredictionAnswer[]> {
  const { data } = await supabase.from("prediction_answers").select("*").eq("manager_id", managerId);
  return (data || []) as PredictionAnswer[];
}

export async function fetchAllPredictionAnswers(): Promise<PredictionAnswer[]> {
  const { data } = await supabase.from("prediction_answers").select("*");
  return (data || []) as PredictionAnswer[];
}

export async function submitPredictionAnswer(questionId: string, managerId: string, answer: string) {
  const { error } = await supabase.from("prediction_answers").upsert(
    { question_id: questionId, manager_id: managerId, answer },
    { onConflict: "question_id,manager_id" }
  );
  if (error) throw error;
}

export async function upsertPredictionQuestion(q: { id?: string; race_id: string; question_type: string; question_text: string; correct_answer?: string | null; published?: boolean; prediction_deadline?: string | null; option_a?: string | null; option_b?: string | null }) {
  if (q.id) {
    const { error } = await supabase.from("prediction_questions").update(q as any).eq("id", q.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("prediction_questions").insert(q as any);
    if (error) throw error;
  }
}

export async function deletePredictionQuestion(id: string) {
  // Delete answers first
  await supabase.from("prediction_answers").delete().eq("question_id", id);
  const { error } = await supabase.from("prediction_questions").delete().eq("id", id);
  if (error) throw error;
}

export async function resolvePredictions(questionId: string, correctAnswer: string) {
  const { error: qErr } = await supabase.from("prediction_questions").update({ correct_answer: correctAnswer }).eq("id", questionId);
  if (qErr) throw qErr;

  const { data: answers } = await supabase.from("prediction_answers").select("id, answer").eq("question_id", questionId);
  for (const a of (answers || [])) {
    const isCorrect = a.answer.toLowerCase() === correctAnswer.toLowerCase();
    await supabase.from("prediction_answers").update({ is_correct: isCorrect }).eq("id", a.id);
  }
}

// Driver withdrawal: mark driver as withdrawn, notify affected managers
export async function withdrawDriver(driverId: string) {
  const { error: wErr } = await supabase.from("drivers").update({ withdrawn: true } as any).eq("id", driverId);
  if (wErr) throw wErr;

  // Find all managers who have this driver
  const { data: affectedMDs } = await supabase.from("manager_drivers").select("manager_id").eq("driver_id", driverId);
  if (!affectedMDs || affectedMDs.length === 0) return { affectedCount: 0 };

  const managerIds = affectedMDs.map((md: any) => md.manager_id);
  const { data: affectedManagers } = await supabase.from("managers").select("id, email, team_name").in("id", managerIds);

  // Send email notifications
  for (const mgr of (affectedManagers || [])) {
    if (mgr.email) {
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            to: mgr.email,
            subject: "⚠️ Kører udgået – DASU RaceManager",
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <h2 style="color:#e11d48;">Kører udgået af klassen</h2>
              <p>Hej ${mgr.team_name},</p>
              <p>En kører på dit hold er officielt udgået af klassen.</p>
              <p>Du har fået et <strong>gratis ekstraordinært transfer</strong> til at erstatte den udgåede kører med en ny kører inden for samme tier – uden pointfradrag.</p>
              <p>Gå til <a href="https://dasuracemanager.lovable.app/mit-hold" style="color:#2563eb;">Mit Hold</a> for at foretage skiftet.</p>
              <p>Med venlig hilsen,<br/>DASU RaceManager</p>
            </div>`,
          },
        });
      } catch (e) {
        console.error("Failed to send withdrawal email to", mgr.email, e);
      }
    }
  }

  return { affectedCount: affectedManagers?.length || 0 };
}
