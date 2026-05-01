import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert an ISO timestamp (UTC) into a value suitable for <input type="datetime-local">,
 * formatted in Europe/Copenhagen (CEST/CET) — independent of the browser's locale.
 * Returns "" if iso is falsy.
 */
export function isoToCphLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * Convert a "YYYY-MM-DDTHH:mm" value (interpreted as Europe/Copenhagen time)
 * into a UTC ISO string for storage. Independent of the browser's timezone.
 * Returns null if input is falsy.
 */
export function cphLocalInputToIso(local: string | null | undefined): string | null {
  if (!local) return null;
  // Parse the parts manually so we don't rely on browser timezone.
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  // Build a UTC timestamp first, then adjust by Copenhagen's offset at that moment.
  const utcGuess = Date.UTC(+y, +mo - 1, +d, +h, +mi);
  // Determine the offset (in minutes) Europe/Copenhagen had at utcGuess.
  // We do two passes to handle DST boundary correctly.
  const offsetAt = (ts: number) => {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Copenhagen",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
    const parts = dtf.formatToParts(new Date(ts));
    const get = (t: string) => +(parts.find(p => p.type === t)?.value || 0);
    const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    return (asUTC - ts) / 60000; // minutes
  };
  let offset = offsetAt(utcGuess);
  let utcMs = utcGuess - offset * 60000;
  // Re-check around DST transitions
  const offset2 = offsetAt(utcMs);
  if (offset2 !== offset) {
    utcMs = utcGuess - offset2 * 60000;
  }
  return new Date(utcMs).toISOString();
}
