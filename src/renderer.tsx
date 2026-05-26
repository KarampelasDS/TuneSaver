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
  beatSaberPath: "C:/Program Files (x86)/Steam/steamapps/common/Beat Saber",
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

function calculateMatchScore(
  track: SpotifyTrack,
  map: BeatSaverMap,
  preferredDifficulty: string,
): number {
  const nameScore = stringSimilarity(track.name ?? "", map.metadata.songName);
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
  try {
    const q = encodeURIComponent(
      `${track.name ?? ""} ${track.artists?.[0]?.name ?? ""}`.trim(),
    );
    const res = await fetch(`https://api.beatsaver.com/search/text/0?q=${q}`);
    if (!res.ok) return [];
    const data: BeatSaverSearchResponse = await res.json();
    return (data.docs ?? []).slice(0, 5);
  } catch {
    return [];
  }
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

  // Settings
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

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

  const logout = () => window.location.reload();
  const goBack = () => setCurrentView("music");

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="app-shell">
      <AppHeader
        canOpenSettings={loggedIn}
        showBackButton={loggedIn && currentView !== "music"}
        onBack={goBack}
        onSettingsClick={() => {
          if (loggedIn) setCurrentView("settings");
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
          onDownloadAll={startDownloads}
          onStartNew={startNew}
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
          onFindMaps={startMatchFlow}
        />
      ) : (
        <LoginScreen />
      )}
    </div>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");
createRoot(rootElement).render(<App />);
