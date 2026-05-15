/**
 * Builds artifacts/xogsideiq/public/data/coins-market-metadata.json
 * - GET /coins/markets page=1 (250 rows: image, rank, snapshot fields)
 * - GET /coins/list — fill up to LIMIT total (single call), remainder without images
 *
 *   node scripts/generate-coins-market-metadata.mjs
 *   LIMIT=10000 node scripts/generate-coins-market-metadata.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outFile = path.join(root, "artifacts", "xogsideiq", "public", "data", "coins-market-metadata.json");

const LIMIT = Math.min(10_000, Math.max(250, Number(process.env.LIMIT || 10_000)));

async function cgJson(url) {
  const r = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "CoinAstra-metadata-generator/1.0",
    },
  });
  if (!r.ok) throw new Error(`${url} → ${r.status} ${(await r.text()).slice(0, 180)}`);
  return r.json();
}

function fromMarket(m, fallbackRank) {
  return {
    id: m.id,
    symbol: m.symbol,
    name: m.name,
    image: m.image,
    r: m.market_cap_rank ?? fallbackRank,
    mc: m.market_cap ?? 0,
    v: m.total_volume ?? 0,
    csup: m.circulating_supply ?? 0,
    tsup: m.total_supply ?? null,
    msup: m.max_supply ?? null,
    h24: m.high_24h ?? 0,
    l24: m.low_24h ?? 0,
    ch1h: m.price_change_percentage_1h_in_currency ?? null,
    ch7d: m.price_change_percentage_7d_in_currency ?? null,
    ch24: m.price_change_percentage_24h ?? null,
    pc24: m.price_change_24h ?? null,
  };
}

function fromList(c, rank) {
  return {
    id: c.id,
    symbol: c.symbol,
    name: c.name,
    image: "",
    r: rank,
    mc: 0,
    v: 0,
    csup: 0,
    tsup: null,
    msup: null,
    h24: 0,
    l24: 0,
    ch1h: null,
    ch7d: null,
    ch24: null,
    pc24: null,
  };
}

async function main() {
  const enrichUrl = new URL("https://api.coingecko.com/api/v3/coins/markets");
  enrichUrl.searchParams.set("vs_currency", "usd");
  enrichUrl.searchParams.set("order", "market_cap_desc");
  enrichUrl.searchParams.set("per_page", "250");
  enrichUrl.searchParams.set("page", "1");
  enrichUrl.searchParams.set("sparkline", "false");
  enrichUrl.searchParams.set("price_change_percentage", "1h,7d");

  /** @type {any[]} */
  const top = await cgJson(enrichUrl.toString());
  const coins = top.map((m, i) => fromMarket(m, i + 1));
  const seen = new Set(coins.map((c) => c.id));

  const listUrl = "https://api.coingecko.com/api/v3/coins/list?include_platform=false";
  /** @type {{id:string,symbol:string,name:string}[]} */
  const fullList = await cgJson(listUrl);

  let rank = coins.length + 1;
  for (const c of fullList) {
    if (coins.length >= LIMIT) break;
    if (!c.id || !c.symbol || seen.has(c.id)) continue;
    seen.add(c.id);
    coins.push(fromList(c, rank));
    rank += 1;
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(
    outFile,
    JSON.stringify({
      v: 1,
      generatedAt: new Date().toISOString(),
      count: coins.length,
      coins,
    }),
  );
  console.log("Wrote", outFile, `(${coins.length} coins)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
