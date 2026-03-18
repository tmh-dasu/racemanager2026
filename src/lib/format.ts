/**
 * Format a number as DKR with xxx.xxx format
 * e.g. 450000 → "450.000 DKR"
 */
export function formatDKR(amount: number): string {
  return amount.toLocaleString("da-DK") + " DKR";
}
