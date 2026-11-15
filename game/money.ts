/** All money in the game is stored as an integer number of lakhs (1 Cr = 100 L). */
export function formatMoney(lakhs: number): string {
  if (lakhs >= 100) {
    const cr = (lakhs / 100).toFixed(2).replace(/\.?0+$/, "");
    return `₹${cr} Cr`;
  }
  return `₹${lakhs} L`;
}

/** IPL-style bid increments: the higher the price, the bigger the jump. */
export function increment(currentBid: number): number {
  if (currentBid < 100) return 5;
  if (currentBid < 200) return 10;
  if (currentBid < 500) return 20;
  return 25;
}
