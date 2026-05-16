/**
 * Map CoinGecko assets to TradingView symbols (EXCHANGE:PAIR).
 * Fallback: BINANCE:{SYMBOL}USDT — users can pick another exchange in the TV toolbar.
 * localStorage caches last-opened symbol per coin for faster revisits.
 */

const LS_PREFIX = "ca-tv-symbol:v1:";

const COINGECKO_TO_TV: Record<string, string> = {
  bitcoin: "BINANCE:BTCUSDT",
  ethereum: "BINANCE:ETHUSDT",
  tether: "BINANCE:USDTUSDT",
  "usd-coin": "BINANCE:USDCUSDT",
  binancecoin: "BINANCE:BNBUSDT",
  solana: "BINANCE:SOLUSDT",
  ripple: "BINANCE:XRPUSDT",
  dogecoin: "BINANCE:DOGEUSDT",
  cardano: "BINANCE:ADAUSDT",
  avalanche: "BINANCE:AVAXUSDT",
  chainlink: "BINANCE:LINKUSDT",
  polkadot: "BINANCE:DOTUSDT",
  polygon: "BINANCE:MATICUSDT",
  litecoin: "BINANCE:LTCUSDT",
  "shiba-inu": "BINANCE:SHIBUSDT",
  tron: "BINANCE:TRXUSDT",
  "bitcoin-cash": "BINANCE:BCHUSDT",
  uniswap: "BINANCE:UNIUSDT",
  cosmos: "BINANCE:ATOMUSDT",
  "near-protocol": "BINANCE:NEARUSDT",
  aptos: "BINANCE:APTUSDT",
  optimism: "BINANCE:OPUSDT",
  arbitrum: "BINANCE:ARBUSDT",
  sui: "BINANCE:SUIUSDT",
  pepe: "BINANCE:PEPEUSDT",
  render: "BINANCE:RENDERUSDT",
  filecoin: "BINANCE:FILUSDT",
  fantom: "BINANCE:FTMUSDT",
  injective: "BINANCE:INJUSDT",
  "internet-computer": "BINANCE:ICPUSDT",
  lido: "BINANCE:LDOUSDT",
  bonk: "BINANCE:BONKUSDT",
  floki: "BINANCE:FLOKIUSDT",
  aave: "BINANCE:AAVEUSDT",
  maker: "BINANCE:MKRUSDT",
  "curve-dao-token": "BINANCE:CRVUSDT",
  havven: "BINANCE:SNXUSDT",
  theta: "BINANCE:THETAUSDT",
  stellar: "BINANCE:XLMUSDT",
  monero: "BINANCE:XMRUSDT",
  "ethereum-classic": "BINANCE:ETCUSDT",
  algorand: "BINANCE:ALGOUSDT",
  "vechain": "BINANCE:VETUSDT",
  "hedera-hashgraph": "BINANCE:HBARUSDT",
};

function readCache(coinId: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_PREFIX + coinId.toLowerCase());
    if (!raw) return null;
    const j = JSON.parse(raw) as { tv?: string };
    if (typeof j.tv === "string" && j.tv.includes(":")) return j.tv;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeTvSymbolCache(coinId: string, tvSymbol: string): void {
  if (typeof localStorage === "undefined" || !coinId || !tvSymbol) return;
  try {
    localStorage.setItem(
      LS_PREFIX + coinId.toLowerCase(),
      JSON.stringify({ tv: tvSymbol, t: Date.now() }),
    );
  } catch {
    /* quota */
  }
}

function fallbackPair(symbolUpper: string): string {
  const s = symbolUpper.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!s) return "BINANCE:BTCUSDT";
  return `BINANCE:${s}USDT`;
}

/** Resolve TradingView symbol for a CoinGecko id + ticker. */
export function resolveTradingViewSymbol(coinId: string | undefined, symbolUpper: string): string {
  const id = coinId?.toLowerCase().trim();
  const sym = symbolUpper.toUpperCase().trim();
  if (id) {
    const cached = readCache(id);
    if (cached) return cached;
    const curated = COINGECKO_TO_TV[id];
    if (curated) return curated;
  }
  return fallbackPair(sym);
}
