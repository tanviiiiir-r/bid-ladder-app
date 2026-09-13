/** Cents → clean dollar string. 1000 → $10, 17500 → $175, 1050 → $10.50 */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  const hasFraction = cents % 100 !== 0;
  return `$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}
