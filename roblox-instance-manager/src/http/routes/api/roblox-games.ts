import type { IncomingMessage, ServerResponse } from "http";

// ── Cache ──────────────────────────────────────────────────────────────────
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}
function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data as T;
}

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function rFetch(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Roblox API ${res.status}`);
  return res.json();
}

interface RawGame {
  placeId: number;
  universeId: number;
  name: string;
  playerCount: number;
  upVotes: number;
  downVotes: number;
  genre: string;
  gameDescription?: string;
}
interface GameDetail {
  id: number;
  rootPlaceId: number;
  name: string;
  description: string;
  creator: { name: string };
  playing: number;
  visits: number;
  maxPlayers: number;
  updated: string;
  genre: string;
  favoritedCount: number;
}

async function fetchThumbs(ids: number[]): Promise<Map<number, string>> {
  const m = new Map<number, string>();
  if (!ids.length) return m;
  try {
    const d = await rFetch(
      `https://thumbnails.roblox.com/v1/games/icons?universeIds=${ids.join(",")}&size=256x256&format=Png&isCircular=false`
    ) as { data: Array<{ targetId: number; imageUrl: string }> };
    for (const item of d.data ?? []) m.set(item.targetId, item.imageUrl);
  } catch { /* non-critical */ }
  return m;
}

async function enrichGames(raw: RawGame[]): Promise<unknown[]> {
  const uids = raw.map((g) => g.universeId).filter(Boolean);
  const detailMap = new Map<number, GameDetail>();

  if (uids.length) {
    try {
      const d = await rFetch(`https://games.roblox.com/v1/games?universeIds=${uids.join(",")}`) as { data: GameDetail[] };
      for (const x of d.data ?? []) detailMap.set(x.id, x);
    } catch { /* fall back to list data */ }
  }

  const thumbMap = await fetchThumbs(uids);

  return raw.map((g) => {
    const det = detailMap.get(g.universeId);
    return {
      universeId: g.universeId,
      placeId: g.placeId,
      name: det?.name ?? g.name,
      description: det?.description ?? g.gameDescription ?? "",
      playerCount: det?.playing ?? g.playerCount ?? 0,
      visits: det?.visits ?? 0,
      upVotes: g.upVotes ?? 0,
      downVotes: g.downVotes ?? 0,
      genre: det?.genre ?? g.genre ?? "",
      creator: det?.creator?.name ?? "Unknown",
      maxPlayers: det?.maxPlayers ?? 0,
      favoritedCount: det?.favoritedCount ?? 0,
      thumbnail: thumbMap.get(g.universeId) ?? null,
      updated: det?.updated ?? null,
    };
  });
}

async function getList(sortToken = "", keyword = "", pageSize = 18): Promise<RawGame[]> {
  let url = `https://games.roblox.com/v1/games/list?model.pageSize=${pageSize}&model.genreFilter=0&model.timeFilter=0&model.gameFilter=0`;
  if (sortToken) url += `&model.sortToken=${encodeURIComponent(sortToken)}`;
  if (keyword)   url += `&model.keyword=${encodeURIComponent(keyword)}`;
  const d = await rFetch(url) as { games: RawGame[] };
  return d.games ?? [];
}

async function getSortToken(name: string): Promise<string> {
  try {
    const d = await rFetch("https://games.roblox.com/v1/games/list-sorts") as {
      sorts: Array<{ name: string; token: string }>;
    };
    return d.sorts?.find((s) => s.name?.toLowerCase() === name.toLowerCase())?.token ?? "";
  } catch { return ""; }
}

// ── Handler ────────────────────────────────────────────────────────────────
// Endpoint: GET /api/roblox-games?type=popular|trending|search&q=...
export async function GET(_req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  const type = url.searchParams.get("type") ?? "popular";
  const q    = url.searchParams.get("q") ?? "";

  // Search
  if (type === "search") {
    if (!q.trim()) return json(res, 400, { error: "Missing q param" });
    const key = `search:${q.toLowerCase()}`;
    const cached = getCache(key);
    if (cached) return json(res, 200, cached);
    try {
      const raw = await getList("", q);
      const enriched = await enrichGames(raw);
      setCache(key, enriched);
      return json(res, 200, enriched);
    } catch (err) {
      return json(res, 502, { error: String(err) });
    }
  }

  // Popular / Trending
  const key = `games:${type}`;
  const cached = getCache(key);
  if (cached) return json(res, 200, cached);

  try {
    const sortToken = type === "trending" ? await getSortToken("TopRated") : "";
    const raw = await getList(sortToken);
    const enriched = await enrichGames(raw);
    setCache(key, enriched);
    return json(res, 200, enriched);
  } catch (err) {
    return json(res, 502, { error: String(err) });
  }
}
