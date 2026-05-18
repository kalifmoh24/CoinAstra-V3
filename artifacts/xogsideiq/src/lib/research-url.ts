/** Stable coin detail URL with asset id to avoid symbol collisions. */
export function researchHref(coin: { symbol: string; id: string }): string {
  return `/research/${coin.symbol.toUpperCase()}?id=${encodeURIComponent(coin.id)}`;
}
