import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import {
  AppHeader,
  LoginScreen,
  MatchResultsScreen,
  MusicSelectionScreen,
  PlaylistDetailScreen,
  SettingsScreen,
} from "./components";
import type {
  AppSettings,
  BeatSaverMap,
  BeatSaverSearchResponse,
  MatchPhase,
  PlaylistTracksResponse,
  PlaylistsResponse,
  SelectedTrack,
  SpotifyPlaylist,
  SpotifyTrack,
  SpotifyUserProfile,
  TrackMatch,
  UserData,
} from "./types";
import "./index.css";

declare global {
  interface Window {
    electron: {
      startAuth: () => void;
      onAuthSuccess: (callback: (token: string) => void) => void;
      openExternal: (url: string) => void;
      selectDirectory: () => Promise<string | null>;
      scanCustomLevels: (path: string) => Promise<string[]>;
      downloadMap: (args: {
        selectionId: string;
        mapId: string;
        downloadURL: string;
        songName: string;
        artistName: string;
        beatSaberPath: string;
      }) => Promise<{ success: boolean; error?: string }>;
      onDownloadProgress: (
        callback: (data: { selectionId: string; progress: number }) => void,
      ) => void;
      createBplist: (args: {
        title: string;
        imageBase64: string;
        songs: { hash: string; songName: string }[];
        beatSaberPath: string;
      }) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  beatSaberPath: "",
  matchThreshold: 80,
  preferredDifficulty: "ExpertPlus",
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem("tunesaver-settings");
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: AppSettings) {
  localStorage.setItem("tunesaver-settings", JSON.stringify(s));
}

// ─── String matching ───────────────────────────────────────────────────────────

function stringSimilarity(a: string, b: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .trim();
  const na = norm(a);
  const nb = norm(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const aWords = na.split(/\s+/);
  const bWords = nb.split(/\s+/);
  const common = aWords.filter((w) => bWords.includes(w)).length;
  if (common > 0) {
    const wordSim = common / Math.max(aWords.length, bWords.length);
    if (wordSim >= 0.5) return 0.5 + wordSim * 0.5;
  }

  const m = na.length;
  const n = nb.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        na[i - 1] === nb[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

// Strip parentheticals and common feature tags from a track/map title so they
// don't pollute search queries or drag down match scores.
// e.g. "This Fffire (New Version)" → "This Fffire"
//      "Can't Stop (feat. Guest)" → "Can't Stop"
//      "Song ft. Someone"         → "Song"
function stripParentheticals(s: string): string {
  return s
    .replace(/\s*[\(\[][^\)\]]*[\)\]]/g, "") // remove (...) and [...]
    .replace(/\s*[-–—]?\s*\b(feat|ft)\.?\s.+$/i, "") // remove feat./ft. suffix
    .trim();
}

// Best title similarity between a Spotify track name and a BeatSaver map title.
// Handles two common patterns:
//   BeatSaver convention  "Artist - Song"       → scores against just "Song"
//   Spotify convention    "Song - New Version"  → scores aCore (pre-dash) too
function titleSimilarity(spotifyTitle: string, bsTitle: string): number {
  const a = stripParentheticals(spotifyTitle);
  // Strip Spotify-style " - Version Suffix" (e.g. "Song - Live Version" → "Song")
  const aCore = a.replace(/\s+[-–—]\s+.+$/, "").trim() || a;
  const b = stripParentheticals(bsTitle);

  let best = Math.max(
    stringSimilarity(a,     bsTitle), // cleaned spotify vs raw BS
    stringSimilarity(a,     b),       // both cleaned
    stringSimilarity(aCore, b),       // core spotify title vs cleaned BS
  );

  // Many BeatSaver maps use "Artist - Song" as the title — try just the parts
  const dashIdx = b.indexOf(" - ");
  if (dashIdx !== -1) {
    best = Math.max(
      best,
      stringSimilarity(a,     b.slice(dashIdx + 3)), // after " - "
      stringSimilarity(a,     b.slice(0, dashIdx)),   // before " - "
      stringSimilarity(aCore, b.slice(dashIdx + 3)), // core vs after " - "
    );
  }

  return best;
}

function calculateMatchScore(
  track: SpotifyTrack,
  map: BeatSaverMap,
  preferredDifficulty: string,
): number {
  const nameScore = titleSimilarity(track.name ?? "", map.metadata.songName);
  const artistScore = stringSimilarity(
    track.artists?.map((a) => a.name).join(" ") ?? "",
    map.metadata.songAuthorName,
  );
  let score = nameScore * 0.65 + artistScore * 0.35;

  const hasPref = map.versions?.[0]?.diffs?.some(
    (d) => d.difficulty === preferredDifficulty,
  );
  if (hasPref) score = Math.min(1, score + 0.02);

  return Math.round(score * 100);
}

// ─── Spotify helpers ───────────────────────────────────────────────────────────

const currentUserUrl = "https://api.spotify.com/v1/me";
const allPlaylistsUrl = "https://api.spotify.com/v1/me/playlists";

const filterReadablePlaylists = (
  playlists: SpotifyPlaylist[],
  userId: string,
) => playlists.filter((p) => p.owner?.id === userId || p.collaborative);

async function fetchAllPlaylists(accessToken: string) {
  const playlists: SpotifyPlaylist[] = [];
  let nextUrl: string | null = allPlaylistsUrl;
  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data: PlaylistsResponse = await res.json();
    playlists.push(...(data.items ?? []));
    nextUrl = data.next ?? null;
  }
  console.log(accessToken);
  return playlists;
}

async function fetchPlaylistTrackCount(
  playlistId: string,
  accessToken: string,
): Promise<number | null> {
  try {
    // /tracks?limit=1 returns a paging object where `total` is always accurate
    const res = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.total === "number" ? data.total : null;
  } catch {
    return null;
  }
}

async function fetchPlaylistTracksAll(
  playlistId: string,
  accessToken: string,
): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  let nextUrl: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}/items`;
  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) break;
    const data: PlaylistTracksResponse = await res.json();
    tracks.push(
      ...(data.items ?? [])
        .map((item) => item.item ?? item.track)
        .filter((t): t is SpotifyTrack => Boolean(t)),
    );
    nextUrl = data.next ?? null;
  }
  return tracks;
}

// ─── BeatSaver search ─────────────────────────────────────────────────────────

async function searchBeatSaver(track: SpotifyTrack): Promise<BeatSaverMap[]> {
  const rawName   = track.name ?? "";
  const cleanName = stripParentheticals(rawName);
  // Strip Spotify-style " - Version Suffix" (e.g. "This Fffire - New Version" → "This Fffire").
  // Used for search queries and as the reference title for relevance sorting.
  const coreName  = cleanName.replace(/\s+[-–—]\s+.+$/, "").trim() || cleanName;
  const artist    = track.artists?.[0]?.name ?? "";

  // Spotify API often returns typographic quotes (U+2018/U+2019 etc.).
  // encodeURIComponent("%E2%80%99") doesn't tokenise the same as ASCII "'" in
  // BeatSaver's Solr, so normalise before encoding every query.
  const normalizeForQuery = (s: string) =>
    s
      .replace(/[‘’‚‛]/g, "'") // curly single quotes → '
      .replace(/[“”„‟]/g, '"') // curly double quotes → "
      .trim();

  // Fire one BeatSaver text query and return the docs.
  // page defaults to 0 (first 20 results); pass 1 to get the next 20.
  const bsSearch = async (q: string, page = 0): Promise<BeatSaverMap[]> => {
    try {
      const res = await fetch(
        `https://api.beatsaver.com/search/text/${page}?q=${encodeURIComponent(normalizeForQuery(q))}`,
      );
      if (!res.ok) return [];
      const data: BeatSaverSearchResponse = await res.json();
      return data.docs ?? [];
    } catch {
      return [];
    }
  };

  // Merge incoming results into the pool, deduplicating by map id.
  const merge = (pool: BeatSaverMap[], incoming: BeatSaverMap[]) => {
    const seen = new Set(pool.map((m) => m.id));
    for (const m of incoming) if (!seen.has(m.id)) pool.push(m);
    return pool;
  };

  // Re-sort the entire pool using the same combined title+artist weighting as
  // calculateMatchScore so the correct map always wins, even when multiple maps
  // share the same song title but by different artists (e.g. many "Polarize"
  // covers would otherwise push the real Twenty One Pilots map out of the top 5).
  const allArtists = track.artists?.map((a) => a.name).join(" ") ?? "";
  const sortByRelevance = (pool: BeatSaverMap[]) => {
    const combined = (m: BeatSaverMap) =>
      titleSimilarity(coreName, m.metadata.songName) * 0.65 +
      stringSimilarity(allArtists, m.metadata.songAuthorName) * 0.35;
    return [...pool].sort((a, b) => combined(b) - combined(a));
  };

  // High-confidence early exit: we found at least one map that closely matches
  // the track title. Threshold is 0.85 — tight enough to avoid false positives
  // like "Can't Stop Won't Stop" (≈ 0.75) stopping the search prematurely.
  const hasStrongMatch = (pool: BeatSaverMap[]) =>
    pool.some((m) => titleSimilarity(coreName, m.metadata.songName) >= 0.85);

  // ── Step 1: raw title + artist (exactly as Spotify gives it) ──────────────
  let pool = await bsSearch(`${rawName} ${artist}`.trim());
  if (hasStrongMatch(pool)) return sortByRelevance(pool).slice(0, 5);

  // ── Step 2: parens/feat stripped title + artist ────────────────────────────
  const cleanQuery = `${cleanName} ${artist}`.trim();
  if (cleanQuery !== `${rawName} ${artist}`.trim()) {
    pool = merge(pool, await bsSearch(cleanQuery));
    if (hasStrongMatch(pool)) return sortByRelevance(pool).slice(0, 5);
  }

  // ── Step 3: core title + artist (also strips "Song - Version Suffix") ──────
  const coreQuery = `${coreName} ${artist}`.trim();
  if (coreQuery !== cleanQuery) {
    pool = merge(pool, await bsSearch(coreQuery));
    if (hasStrongMatch(pool)) return sortByRelevance(pool).slice(0, 5);
  }

  // ── Step 4: core title only (no artist — maximises recall when the artist
  //    name is confusing BeatSaver's search or the map is filed differently)
  pool = merge(pool, await bsSearch(coreName));
  if (hasStrongMatch(pool)) return sortByRelevance(pool).slice(0, 5);

  // ── Step 5: deduplicated-letter title (e.g. "Fffire" → "Fire") ────────────
  // Handles tracks with intentionally repeated letters that BeatSaver maps
  // spell with the standard number of letters (e.g. "This Fffire" → "This Fire").
  const dedupedCore = coreName.replace(/(.)\1+/gi, "$1");
  if (dedupedCore !== coreName) {
    pool = merge(pool, await bsSearch(`${dedupedCore} ${artist}`.trim()));
    if (hasStrongMatch(pool)) return sortByRelevance(pool).slice(0, 5);
    pool = merge(pool, await bsSearch(dedupedCore));
    if (hasStrongMatch(pool)) return sortByRelevance(pool).slice(0, 5);
  }

  // ── Step 6: page-1 sweep for common song titles ───────────────────────────
  // If every step so far returned results but none scored ≥ 0.85, the right map
  // is probably beyond position 20 in BeatSaver's ranking. Fetch the next page
  // for the two most direct queries so we scan up to 60 candidates.
  pool = merge(pool, await bsSearch(`${rawName} ${artist}`.trim(), 1));
  if (hasStrongMatch(pool)) return sortByRelevance(pool).slice(0, 5);
  pool = merge(pool, await bsSearch(coreName, 1));

  return sortByRelevance(pool).slice(0, 5);
}

async function runInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    if (i + batchSize < items.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return results;
}

// ─── App ──────────────────────────────────────────────────────────────────────

type AppView = "music" | "settings" | "playlist" | "matching";

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AppView>("music");
  const [selectedPlaylists, setSelectedPlaylists] = useState<SpotifyPlaylist[]>(
    [],
  );
  const [activePlaylist, setActivePlaylist] = useState<SpotifyPlaylist | null>(
    null,
  );
  const [activePlaylistTracks, setActivePlaylistTracks] = useState<
    SpotifyTrack[] | null
  >(null);
  const [playlistTrackError, setPlaylistTrackError] = useState<string | null>(
    null,
  );
  const [selectedTracks, setSelectedTracks] = useState<SelectedTrack[]>([]);
  const [isLoadingPlaylistTracks, setIsLoadingPlaylistTracks] = useState(false);
  const [isShowingAllPlaylists, setIsShowingAllPlaylists] = useState(false);
  const [isLoadingAllPlaylists, setIsLoadingAllPlaylists] = useState(false);

  // Settings & navigation history
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [previousView, setPreviousView] = useState<AppView>("music");
  const [showNoPathModal, setShowNoPathModal] = useState(false);

  // Matching
  const [trackMatches, setTrackMatches] = useState<TrackMatch[]>([]);
  const [matchPhase, setMatchPhase] = useState<MatchPhase>({
    type: "collecting",
  });
  const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(
    new Map(),
  );
  const [downloadErrors, setDownloadErrors] = useState<Map<string, string>>(
    new Map(),
  );

  useEffect(() => {
    window.electron.onAuthSuccess((t) => {
      setToken(t);
      setLoggedIn(true);
      setCurrentView("music");
    });
    window.electron.onDownloadProgress(({ selectionId, progress }) => {
      setDownloadProgress((prev) => new Map(prev).set(selectionId, progress));
    });
  }, []);

  useEffect(() => {
    if (token) {
      setLoggedIn(true);
      setIsShowingAllPlaylists(false);
      fetch(currentUserUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((profile: SpotifyUserProfile) => {
          setCurrentUserId(profile.id);
          return fetchAllPlaylists(token).then((playlists) => {
            setUserData({
              playlists: filterReadablePlaylists(playlists, profile.id).slice(
                0,
                6,
              ),
            });
          });
        });
    }
  }, [token]);

  const handleSettingsChange = (s: AppSettings) => {
    setSettings(s);
    saveSettings(s);
  };

  const showAllPlaylists = () => {
    if (!token || !currentUserId) return;
    setIsLoadingAllPlaylists(true);
    fetchAllPlaylists(token)
      .then((playlists) => {
        setUserData({
          playlists: filterReadablePlaylists(playlists, currentUserId),
        });
        setIsShowingAllPlaylists(true);
      })
      .finally(() => setIsLoadingAllPlaylists(false));
  };

  const togglePlaylistSelection = (playlist: SpotifyPlaylist) => {
    const alreadySelected = selectedPlaylists.some((p) => p.id === playlist.id);
    if (alreadySelected) {
      setSelectedPlaylists((cur) => cur.filter((p) => p.id !== playlist.id));
      return;
    }
    setSelectedPlaylists((cur) => [...cur, playlist]);
    // If the simplified playlist object didn't include a track count, fetch it.
    if (!playlist.tracks?.total && token) {
      fetchPlaylistTrackCount(playlist.id, token).then((total) => {
        if (total === null) return;
        setSelectedPlaylists((cur) =>
          cur.map((p) =>
            p.id === playlist.id ? { ...p, tracks: { total } } : p,
          ),
        );
      });
    }
  };

  const removePlaylistSelection = (playlist: SpotifyPlaylist) => {
    setSelectedPlaylists((cur) => cur.filter((p) => p.id !== playlist.id));
  };

  const toggleTrackSelection = (track: SpotifyTrack, index: number) => {
    const trackId =
      track.id ??
      track.uri ??
      `${activePlaylist?.id ?? "playlist"}-${track.name}-${index}`;
    setSelectedTracks((cur) =>
      cur.some((t) => t.selectionId === trackId)
        ? cur.filter((t) => t.selectionId !== trackId)
        : [...cur, { selectionId: trackId, track }],
    );
  };

  const removeTrackSelection = (selectionId: string) => {
    setSelectedTracks((cur) =>
      cur.filter((t) => t.selectionId !== selectionId),
    );
  };

  const fetchPlaylistTracksForView = async (playlist: SpotifyPlaylist) => {
    if (!token) return;
    setActivePlaylist(playlist);
    setActivePlaylistTracks(null);
    setPlaylistTrackError(null);
    setIsLoadingPlaylistTracks(true);
    setCurrentView("playlist");
    try {
      const tracks: SpotifyTrack[] = [];
      let nextUrl: string | null =
        `https://api.spotify.com/v1/playlists/${playlist.id}/items`;
      while (nextUrl) {
        const res = await fetch(nextUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(
            err.error?.message ?? `Spotify returned ${res.status}`,
          );
        }
        const data: PlaylistTracksResponse = await res.json();
        tracks.push(
          ...(data.items ?? [])
            .map((item) => item.item ?? item.track)
            .filter((t): t is SpotifyTrack => Boolean(t)),
        );
        nextUrl = data.next ?? null;
      }
      setActivePlaylistTracks(tracks);
    } catch (error) {
      setActivePlaylistTracks([]);
      setPlaylistTrackError(
        error instanceof Error ? error.message : "Could not load songs",
      );
    } finally {
      setIsLoadingPlaylistTracks(false);
    }
  };

  // ─── Matching flow ───────────────────────────────────────────────────────────

  const startMatchFlow = async () => {
    if (!token) return;

    setTrackMatches([]);
    setDownloadProgress(new Map());
    setDownloadErrors(new Map());
    setMatchPhase({ type: "collecting" });
    setCurrentView("matching");

    // 1. Collect all tracks, tagging each with its source playlist
    const seen = new Set<string>();
    const allTracks: {
      selectionId: string;
      track: SpotifyTrack;
      sourcePlaylistId?: string;
    }[] = [];

    const addTrack = (
      selectionId: string,
      track: SpotifyTrack,
      sourcePlaylistId?: string,
    ) => {
      const key = track.id ?? track.uri ?? selectionId;
      if (!seen.has(key)) {
        seen.add(key);
        allTracks.push({ selectionId, track, sourcePlaylistId });
      }
    };

    // Fetch full playlists first (they take priority in dedup)
    for (const playlist of selectedPlaylists) {
      const tracks = await fetchPlaylistTracksAll(playlist.id, token);
      console.log(
        `[TuneSaver] Fetched ${tracks.length} track(s) from playlist "${playlist.name}"`,
      );
      tracks.forEach((t, i) =>
        addTrack(`${playlist.id}-${t.id ?? t.uri ?? i}`, t, playlist.id),
      );
    }

    // Then individually selected tracks
    for (const { selectionId, track } of selectedTracks) {
      addTrack(selectionId, track);
    }

    if (allTracks.length === 0) {
      console.warn(
        "[TuneSaver] No tracks collected — returning to music view. Check Spotify token and playlist selection.",
      );
      setCurrentView("music");
      return;
    }

    // 2. Scan installed maps
    const customLevelsPath = `${settings.beatSaberPath}/Beat Saber_Data/CustomLevels`;
    const installedIds = new Set(
      await window.electron.scanCustomLevels(customLevelsPath),
    );

    // 3. Initialize match state
    const initial: TrackMatch[] = allTracks.map(
      ({ selectionId, track, sourcePlaylistId }) => ({
        selectionId,
        track,
        results: [],
        selectedResultIndex: 0,
        matchScore: 0,
        isInstalled: false,
        searching: true,
        sourcePlaylistId,
        manuallySelected: false,
        rejected: false,
      }),
    );
    setTrackMatches(initial);
    setMatchPhase({ type: "searching", done: 0, total: allTracks.length });

    // 4. BeatSaver search — 5 at a time
    let done = 0;
    await runInBatches(allTracks, 5, async ({ selectionId, track }) => {
      const results = await searchBeatSaver(track);

      const scored = results
        .map((map) => ({
          map,
          score: calculateMatchScore(track, map, settings.preferredDifficulty),
        }))
        .sort((a, b) => b.score - a.score);

      const best = scored[0];
      const bestHash = best?.map.versions?.[0]?.hash?.toLowerCase() ?? "";
      const isInstalled = best
        ? installedIds.has(best.map.id.toLowerCase()) ||
          (bestHash !== "" && installedIds.has(bestHash))
        : false;

      setTrackMatches((prev) =>
        prev.map((tm) =>
          tm.selectionId === selectionId
            ? {
                ...tm,
                results: scored.map((s) => s.map),
                matchScore: best?.score ?? 0,
                isInstalled,
                searching: false,
              }
            : tm,
        ),
      );

      done += 1;
      setMatchPhase({ type: "searching", done, total: allTracks.length });
    });

    setMatchPhase({ type: "results" });
  };

  const rejectTrack = (selectionId: string) => {
    setTrackMatches((prev) =>
      prev.map((tm) =>
        tm.selectionId === selectionId
          ? { ...tm, rejected: !tm.rejected }
          : tm,
      ),
    );
  };

  const selectAlternative = (selectionId: string, index: number) => {
    setTrackMatches((prev) =>
      prev.map((tm) => {
        if (tm.selectionId !== selectionId) return tm;
        const newScore = calculateMatchScore(
          tm.track,
          tm.results[index],
          settings.preferredDifficulty,
        );
        return {
          ...tm,
          selectedResultIndex: index,
          matchScore: newScore,
          manuallySelected: true,
        };
      }),
    );
  };

  const startDownloads = async () => {
    setMatchPhase({ type: "downloading" });

    const toDownload = trackMatches.filter(
      (tm) =>
        !tm.rejected &&
        tm.results.length > 0 &&
        (tm.matchScore >= settings.matchThreshold || tm.manuallySelected) &&
        !tm.isInstalled,
    );

    // Track which selectionIds were successfully downloaded
    const downloadedIds = new Set<string>();

    const results = await Promise.allSettled(
      toDownload.map(async (tm) => {
        const map = tm.results[tm.selectedResultIndex];
        const version = map?.versions?.[0];
        if (!map || !version) {
          const msg = "No download URL available";
          setDownloadErrors((prev) => new Map(prev).set(tm.selectionId, msg));
          return { success: false };
        }

        const result = await window.electron.downloadMap({
          selectionId: tm.selectionId,
          mapId: map.id,
          downloadURL: version.downloadURL,
          songName: map.metadata.songName,
          artistName: map.metadata.songAuthorName,
          beatSaberPath: settings.beatSaberPath,
        });

        if (result.success) {
          downloadedIds.add(tm.selectionId);
        } else {
          setDownloadErrors((prev) =>
            new Map(prev).set(
              tm.selectionId,
              result.error ?? "Download failed",
            ),
          );
        }
        return result;
      }),
    );

    const succeeded = results.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    ).length;
    const failed = toDownload.length - succeeded;

    // Create Beat Saber playlist files for full playlists
    let playlistsCreated = 0;
    try {
      playlistsCreated = await createBeatSaberPlaylists(
        trackMatches,
        selectedPlaylists,
        downloadedIds,
      );
    } catch (err) {
      console.error("[TuneSaver] createBeatSaberPlaylists threw:", err);
    }

    setMatchPhase({ type: "complete", succeeded, failed, playlistsCreated });
  };

  const createBeatSaberPlaylists = async (
    matches: TrackMatch[],
    playlists: SpotifyPlaylist[],
    downloadedIds: Set<string>,
  ): Promise<number> => {
    let created = 0;
    console.log(
      `[TuneSaver] createBeatSaberPlaylists: ${playlists.length} playlist(s), ${downloadedIds.size} downloaded`,
    );

    for (const playlist of playlists) {
      const playlistMatches = matches.filter(
        (tm) => tm.sourcePlaylistId === playlist.id,
      );
      console.log(
        `[TuneSaver] Playlist "${playlist.name}": ${playlistMatches.length} track match(es)`,
      );

      const songs = playlistMatches
        .filter((tm) => {
          if (tm.rejected) return false;
          if (!tm.results.length) return false;
          const aboveThreshold =
            tm.matchScore >= settings.matchThreshold || tm.manuallySelected;
          if (!aboveThreshold) return false;
          const map = tm.results[tm.selectedResultIndex];
          if (!map?.versions?.[0]) return false;
          const available = tm.isInstalled || downloadedIds.has(tm.selectionId);
          if (!available) {
            console.log(
              `[TuneSaver]  skip "${tm.track.name ?? "?"}" — not installed and not downloaded`,
            );
          }
          return available;
        })
        .map((tm) => {
          const map = tm.results[tm.selectedResultIndex];
          return {
            hash: map.versions[0].hash,
            songName: map.metadata.songName,
          };
        });

      console.log(`[TuneSaver]  → ${songs.length} song(s) eligible for bplist`);
      if (songs.length === 0) continue;

      // Fetch playlist cover with a hard timeout so a stalled CDN request
      // cannot block the entire completion transition.
      let imageBase64 = "";
      const imageUrl = playlist.images?.[0]?.url;
      if (imageUrl) {
        try {
          const controller = new AbortController();
          const timerId = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(imageUrl, { signal: controller.signal });
          clearTimeout(timerId);
          const blob = await res.blob();
          imageBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch {
          console.warn(
            `[TuneSaver]  Could not fetch cover for "${playlist.name}", continuing without image`,
          );
        }
      }

      try {
        const result = await window.electron.createBplist({
          title: playlist.name,
          imageBase64,
          songs,
          beatSaberPath: settings.beatSaberPath,
        });
        if (result.success) {
          created++;
          console.log(`[TuneSaver]  ✓ Created bplist for "${playlist.name}"`);
        } else {
          console.error(
            `[TuneSaver]  ✗ Failed bplist for "${playlist.name}": ${result.error}`,
          );
        }
      } catch (err) {
        console.error(`[TuneSaver]  ✗ IPC error for "${playlist.name}":`, err);
      }
    }
    return created;
  };

  const startNew = () => {
    setSelectedPlaylists([]);
    setSelectedTracks([]);
    setTrackMatches([]);
    setDownloadProgress(new Map());
    setDownloadErrors(new Map());
    setMatchPhase({ type: "collecting" });
    setCurrentView("music");
  };

  // Guard the "Find Maps" button — if no install path is set, show the modal
  // instead of kicking off the search flow.
  const handleFindMaps = () => {
    if (!settings.beatSaberPath.trim()) {
      setShowNoPathModal(true);
      return;
    }
    startMatchFlow();
  };

  const openSettings = () => {
    setShowNoPathModal(false);
    setPreviousView(currentView);
    setCurrentView("settings");
  };

  const logout = () => window.location.reload();

  // When coming back from settings, restore the view the user was on before.
  const goBack = () => {
    if (currentView === "settings") {
      setCurrentView(previousView);
    } else {
      setCurrentView("music");
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="app-shell">
      <AppHeader
        canOpenSettings={loggedIn && currentView !== "settings"}
        showBackButton={loggedIn && currentView !== "music"}
        onBack={goBack}
        onSettingsClick={() => {
          if (loggedIn) openSettings();
        }}
      />

      {loggedIn && currentView === "settings" ? (
        <SettingsScreen
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onLogout={logout}
        />
      ) : loggedIn && currentView === "matching" ? (
        <MatchResultsScreen
          phase={matchPhase}
          trackMatches={trackMatches}
          matchThreshold={settings.matchThreshold}
          downloadProgress={downloadProgress}
          downloadErrors={downloadErrors}
          onSelectAlternative={selectAlternative}
          onRejectTrack={rejectTrack}
          onDownloadAll={startDownloads}
          onStartNew={startNew}
          onOpenSettings={openSettings}
        />
      ) : loggedIn && currentView === "playlist" && activePlaylist ? (
        <PlaylistDetailScreen
          playlist={activePlaylist}
          tracks={activePlaylistTracks}
          error={playlistTrackError}
          selectedTrackIds={selectedTracks.map((t) => t.selectionId)}
          isSelected={selectedPlaylists.some((p) => p.id === activePlaylist.id)}
          isLoading={isLoadingPlaylistTracks}
          onToggleTrack={toggleTrackSelection}
          onRemoveFromSelection={removePlaylistSelection}
        />
      ) : loggedIn ? (
        <MusicSelectionScreen
          userData={userData}
          selectedPlaylists={selectedPlaylists}
          selectedTracks={selectedTracks}
          isShowingAllPlaylists={isShowingAllPlaylists}
          isLoadingAllPlaylists={isLoadingAllPlaylists}
          onTogglePlaylist={togglePlaylistSelection}
          onViewPlaylist={fetchPlaylistTracksForView}
          onRemovePlaylist={removePlaylistSelection}
          onRemoveTrack={removeTrackSelection}
          onShowAllPlaylists={showAllPlaylists}
          onFindMaps={handleFindMaps}
        />
      ) : (
        <LoginScreen />
      )}

      {showNoPathModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowNoPathModal(false)}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-icon" aria-hidden="true">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <h2 id="modal-title" className="modal-title">
              Beat Saber path not set
            </h2>
            <p className="modal-body">
              TuneSaver needs to know where Beat Saber is installed before it
              can search for and download maps. Click the{" "}
              <strong>settings icon</strong> or use the button below to set your
              install path.
            </p>
            <div className="modal-actions">
              <button
                className="modal-primary-btn"
                type="button"
                onClick={openSettings}
              >
                Open Settings
              </button>
              <button
                className="modal-secondary-btn"
                type="button"
                onClick={() => setShowNoPathModal(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");
createRoot(rootElement).render(<App />);
