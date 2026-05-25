import { Check, Loader2, Music } from "lucide-react";
import type { SpotifyPlaylist, SpotifyTrack } from "../types";

type PlaylistDetailScreenProps = {
  playlist: SpotifyPlaylist;
  tracks: SpotifyTrack[] | null;
  error: string | null;
  selectedTrackIds: string[];
  isSelected: boolean;
  isLoading: boolean;
  getTrackSelectionId: (track: SpotifyTrack, index: number) => string;
  onToggleTrack: (track: SpotifyTrack, index: number) => void;
  onRemoveFromSelection: (playlist: SpotifyPlaylist) => void;
};

function formatDuration(durationMs: number) {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function PlaylistDetailScreen({
  playlist,
  tracks,
  error,
  selectedTrackIds,
  isSelected,
  isLoading,
  getTrackSelectionId,
  onToggleTrack,
  onRemoveFromSelection,
}: PlaylistDetailScreenProps) {
  const selectedTracksInPlaylist = (tracks ?? []).filter((track, index) =>
    selectedTrackIds.includes(getTrackSelectionId(track, index)),
  ).length;

  return (
    <main className="playlist-detail-screen">
      <section className="playlist-detail-heading">
        <h1>{playlist.name}</h1>
        <p>
          {playlist.tracks?.total ?? tracks?.length ?? 0} tracks
          {tracks && ` - ${selectedTracksInPlaylist} selected`}
        </p>
      </section>

      {isLoading ? (
        <div className="loading-state">
          <Loader2 size={22} />
          Loading songs
        </div>
      ) : error ? (
        <div className="playlist-error">{error}</div>
      ) : tracks?.length === 0 ? (
        <div className="empty-playlists">
          <Music size={24} />
          No songs found
        </div>
      ) : (
        <div className="track-list">
          {(tracks ?? []).map((track, index) => {
            const imageUrl = track.album?.images?.[0]?.url;
            const trackSelectionId = getTrackSelectionId(track, index);
            const isTrackSelected = selectedTrackIds.includes(trackSelectionId);

            return (
              <button
                className={isTrackSelected ? "track-row selected" : "track-row"}
                key={trackSelectionId}
                type="button"
                onClick={() => onToggleTrack(track, index)}
              >
                <span className="track-select-indicator" aria-hidden="true">
                  {isTrackSelected ? <Check size={17} /> : index + 1}
                </span>
                {imageUrl ? (
                  <img className="track-art" src={imageUrl} alt="" />
                ) : (
                  <div className="track-art empty-art">
                    <Music size={22} />
                  </div>
                )}
                <span className="track-copy">
                  <span className="track-name">{track.name ?? "Untitled"}</span>
                  <span className="track-artist">
                    {track.artists?.map((artist) => artist.name).join(", ") ??
                      "Unknown artist"}
                  </span>
                </span>
                <span className="track-album">{track.album?.name ?? ""}</span>
                <span className="track-duration">
                  {formatDuration(track.duration_ms ?? 0)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {isSelected && (
        <button
          className="remove-detail-button"
          type="button"
          onClick={() => onRemoveFromSelection(playlist)}
        >
          Remove from Selection
        </button>
      )}
    </main>
  );
}
