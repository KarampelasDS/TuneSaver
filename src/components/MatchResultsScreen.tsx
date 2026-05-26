import { useState } from "react";
import {
  Loader2,
  Download,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import type { BeatSaverMap, MatchPhase, SpotifyTrack, TrackMatch } from "../types";

type MatchResultsScreenProps = {
  phase: MatchPhase;
  trackMatches: TrackMatch[];
  matchThreshold: number;
  downloadProgress: Map<string, number>;
  downloadErrors: Map<string, string>;
  onSelectAlternative: (selectionId: string, index: number) => void;
  onDownloadAll: () => void;
  onStartNew: () => void;
};

function formatDuration(ms: number) {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function scoreBadgeClass(score: number) {
  if (score >= 85) return "score-badge score-high";
  if (score >= 70) return "score-badge score-mid";
  return "score-badge score-low";
}

const DIFF_LABELS: Record<string, string> = {
  ExpertPlus: "Expert+",
  Expert: "Expert",
  Hard: "Hard",
  Normal: "Normal",
  Easy: "Easy",
};

function uniqueDiffs(map: BeatSaverMap) {
  const seen = new Set<string>();
  return (map.versions?.[0]?.diffs ?? [])
    .map((d) => d.difficulty)
    .filter((d) => !seen.has(d) && seen.add(d));
}

function SpotifyTrackPanel({ track }: { track: SpotifyTrack }) {
  const imageUrl = track.album?.images?.[0]?.url;
  const artist = track.artists?.map((a) => a.name).join(", ") ?? "Unknown artist";
  const duration = track.duration_ms ? formatDuration(track.duration_ms) : null;

  return (
    <div className="match-spotify-panel">
      <span className="match-panel-label">SPOTIFY TRACK</span>
      <div className="match-track-info">
        {imageUrl ? (
          <img className="match-art" src={imageUrl} alt="" />
        ) : (
          <div className="match-art match-art-empty" />
        )}
        <div className="match-track-copy">
          <span className="match-track-name">{track.name ?? "Untitled"}</span>
          <span className="match-track-artist">{artist}</span>
          {(track.album?.name || duration) && (
            <span className="match-track-meta">
              {track.album?.name}
              {track.album?.name && duration ? " • " : ""}
              {duration}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function BeatSaverMapPanel({
  tm,
  matchThreshold,
  phase,
  downloadProgress,
  downloadError,
  onSelectAlternative,
}: {
  tm: TrackMatch;
  matchThreshold: number;
  phase: MatchPhase;
  downloadProgress: number | undefined;
  downloadError: string | undefined;
  onSelectAlternative: (index: number) => void;
}) {
  const [altOpen, setAltOpen] = useState(false);

  const map = tm.results[tm.selectedResultIndex] ?? null;
  // A manually selected alternative is always shown, regardless of score
  const belowThreshold =
    !map || (!tm.manuallySelected && tm.matchScore < matchThreshold);

  if (belowThreshold) {
    return (
      <div className="match-bs-panel match-no-result-panel">
        <span className="match-panel-label">BEAT SABER MAP</span>
        <div className="match-no-result-body">
          <XCircle size={36} className="no-result-icon" />
          <span className="no-result-title">No map found</span>
          <span className="no-result-sub">Try searching BeatSaver manually</span>
        </div>
      </div>
    );
  }

  const coverUrl = map.versions?.[0]?.coverURL;
  const diffs = uniqueDiffs(map);
  const isDownloading = phase.type === "downloading";
  const isComplete = phase.type === "complete";
  const progress = downloadProgress ?? 0;
  const downloaded = isComplete && !downloadError && !tm.isInstalled;
  const failed = isComplete && !!downloadError;

  // Alternatives: all results except the currently selected one
  const altCount = tm.results.length - 1;

  return (
    <div className="match-bs-panel">
      <span className="match-panel-label">BEAT SABER MAP</span>
      <span className={scoreBadgeClass(tm.matchScore)}>{tm.matchScore}% Match</span>

      <div className="match-map-info">
        {coverUrl ? (
          <img className="match-art" src={coverUrl} alt="" />
        ) : (
          <div className="match-art match-art-empty" />
        )}
        <div className="match-map-copy">
          <div className="match-map-name-row">
            <span className="match-map-name">{map.name}</span>
            <button
              className="bs-link-btn"
              type="button"
              title="View on BeatSaver"
              onClick={() =>
                window.electron.openExternal(
                  `https://beatsaver.com/maps/${map.id}`,
                )
              }
            >
              <ExternalLink size={13} />
            </button>
          </div>
          <span className="match-map-mapper">
            Mapped by {map.metadata.levelAuthorName}
          </span>
          <div className="match-diffs">
            {diffs.map((d) => (
              <span key={d} className="diff-tag">
                {DIFF_LABELS[d] ?? d}
              </span>
            ))}
          </div>
          {tm.isInstalled && (
            <div className="match-badges">
              <span className="map-badge badge-installed">Already Installed</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar (downloading phase) */}
      {isDownloading && !tm.isInstalled && (
        <div className="match-progress-wrap">
          <div className="match-progress-row">
            <Loader2 size={13} className="spinning" />
            <span>Downloading…</span>
            <span className="match-progress-pct">{progress}%</span>
          </div>
          <div className="match-progress-bar-track">
            <div
              className="match-progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Completion status */}
      {downloaded && (
        <div className="match-downloaded">
          <CheckCircle2 size={15} />
          Downloaded
        </div>
      )}
      {failed && (
        <div className="match-error-label">
          <AlertCircle size={15} />
          {downloadError}
        </div>
      )}

      {/* Alternatives accordion (results phase only) */}
      {phase.type === "results" && altCount > 0 && (
        <div className="match-alt-section">
          <button
            className="match-alt-btn"
            type="button"
            onClick={() => setAltOpen((v) => !v)}
          >
            {altCount} {altCount === 1 ? "Alternative" : "Alternatives"}
            {altOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {altOpen && (
            <div className="match-alt-list">
              {tm.results.map((alt, index) => {
                if (index === tm.selectedResultIndex) return null;
                const altDiffs = uniqueDiffs(alt);
                const altCover = alt.versions?.[0]?.coverURL;
                return (
                  <button
                    key={alt.id}
                    className="match-alt-item"
                    type="button"
                    onClick={() => {
                      onSelectAlternative(index);
                      setAltOpen(false);
                    }}
                  >
                    {altCover ? (
                      <img className="alt-art" src={altCover} alt="" />
                    ) : (
                      <div className="alt-art alt-art-empty" />
                    )}
                    <div className="alt-copy">
                      <span className="alt-name">{alt.name}</span>
                      <span className="alt-mapper">
                        {alt.metadata.levelAuthorName}
                      </span>
                      <div className="alt-diffs">
                        {altDiffs.map((d) => (
                          <span key={d} className="diff-tag diff-tag-sm">
                            {DIFF_LABELS[d] ?? d}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MatchResultsScreen({
  phase,
  trackMatches,
  matchThreshold,
  downloadProgress,
  downloadErrors,
  onSelectAlternative,
  onDownloadAll,
  onStartNew,
}: MatchResultsScreenProps) {
  if (phase.type === "collecting" || phase.type === "searching") {
    return (
      <main className="match-results-screen">
        <div className="match-loading-state">
          <Loader2 size={32} className="spinning" />
          {phase.type === "collecting" && (
            <p>Collecting tracks from playlists…</p>
          )}
          {phase.type === "searching" && (
            <p>
              Searching BeatSaver… {phase.done} / {phase.total}
            </p>
          )}
        </div>
      </main>
    );
  }

  const matched = trackMatches.filter(
    (tm) =>
      tm.results.length > 0 &&
      (tm.matchScore >= matchThreshold || tm.manuallySelected),
  );
  const approved = matched.filter((tm) => !tm.isInstalled);

  let headingTitle = "Match Results";
  let headingSub = `Found ${matched.length} match${matched.length !== 1 ? "es" : ""} • ${approved.length} approved`;

  if (phase.type === "downloading") {
    headingTitle = "Downloading";
    headingSub = "Downloading approved maps…";
  } else if (phase.type === "complete") {
    headingTitle = "Download Complete";
    const mapPart =
      phase.succeeded === 0
        ? "No maps downloaded"
        : `${phase.succeeded} map${phase.succeeded !== 1 ? "s" : ""} downloaded${phase.failed > 0 ? `, ${phase.failed} failed` : ""}`;
    const playlistPart =
      phase.playlistsCreated > 0
        ? ` • ${phase.playlistsCreated} Beat Saber playlist${phase.playlistsCreated !== 1 ? "s" : ""} created`
        : "";
    headingSub = mapPart + playlistPart;
  }

  return (
    <main className="match-results-screen">
      <div className="match-results-header">
        <div>
          <h1>{headingTitle}</h1>
          <p>{headingSub}</p>
        </div>
        {phase.type === "complete" && (
          <button className="start-new-btn" type="button" onClick={onStartNew}>
            Start New
          </button>
        )}
      </div>

      <div className="match-results-list">
        {trackMatches.map((tm) => (
          <div className="match-card" key={tm.selectionId}>
            <SpotifyTrackPanel track={tm.track} />
            <BeatSaverMapPanel
              tm={tm}
              matchThreshold={matchThreshold}
              phase={phase}
              downloadProgress={downloadProgress.get(tm.selectionId)}
              downloadError={downloadErrors.get(tm.selectionId)}
              onSelectAlternative={(index) =>
                onSelectAlternative(tm.selectionId, index)
              }
            />
          </div>
        ))}
      </div>

      {phase.type === "results" && approved.length > 0 && (
        <div className="match-download-bar">
          <button
            className="download-all-btn"
            type="button"
            onClick={onDownloadAll}
          >
            <Download size={16} />
            Download {approved.length} Map{approved.length !== 1 ? "s" : ""}
          </button>
        </div>
      )}
    </main>
  );
}
