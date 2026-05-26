import { X } from "lucide-react";
import type { SelectedTrack, SpotifyPlaylist } from "../types";
import { PlaylistArtwork } from "./PlaylistCard";

type SelectedPlaylistsProps = {
  playlists: SpotifyPlaylist[];
  tracks: SelectedTrack[];
  onRemove: (playlist: SpotifyPlaylist) => void;
  onRemoveTrack: (selectionId: string) => void;
  onFindMaps: () => void;
};

export function SelectedPlaylists({
  playlists,
  tracks,
  onRemove,
  onRemoveTrack,
  onFindMaps,
}: SelectedPlaylistsProps) {
  const totalTracks = playlists.reduce(
    (total, playlist) => total + (playlist.tracks?.total ?? 0),
    0,
  );

  return (
    <section className="selection-dashboard">
      <div className="selected-header">
        <div>
          <h1>Selection</h1>
          <p>
            {totalTracks + tracks.length} tracks across {playlists.length}{" "}
            playlists
          </p>
        </div>
        <button
          className="find-maps-button"
          type="button"
          disabled={playlists.length === 0 && tracks.length === 0}
          onClick={onFindMaps}
        >
          Find Beat Saber Maps
        </button>
      </div>

      <div className="selection-columns">
        <section className="selected-panel">
          <h2>Full Playlists</h2>
          {playlists.length > 0 ? (
            <div className="selected-list">
              {playlists.map((playlist) => (
                <div className="selected-row" key={playlist.id}>
                  <PlaylistArtwork playlist={playlist} />
                  <span className="playlist-copy">
                    <span className="playlist-name">{playlist.name}</span>
                    <span className="playlist-count">
                      {playlist.tracks?.total ?? 0} tracks
                    </span>
                  </span>
                  <button
                    className="remove-selected-button"
                    type="button"
                    aria-label={`Remove ${playlist.name}`}
                    onClick={() => onRemove(playlist)}
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="selection-empty">No full playlists selected</div>
          )}
        </section>

        <section className="selected-panel">
          <h2>Separate Tracks</h2>
          {tracks.length > 0 ? (
            <div className="selected-list">
              {tracks.map(({ selectionId, track }) => {
                const imageUrl = track.album?.images?.[0]?.url;

                return (
                  <div className="selected-row" key={selectionId}>
                    {imageUrl ? (
                      <img className="playlist-art" src={imageUrl} alt="" />
                    ) : (
                      <div className="playlist-art empty-art" />
                    )}
                    <span className="playlist-copy">
                      <span className="playlist-name">
                        {track.name ?? "Untitled"}
                      </span>
                      <span className="playlist-count">
                        {track.artists
                          ?.map((artist) => artist.name)
                          .join(", ") ?? "Unknown artist"}
                      </span>
                    </span>
                    <button
                      className="remove-selected-button"
                      type="button"
                      aria-label={`Remove ${track.name ?? "track"}`}
                      onClick={() => onRemoveTrack(selectionId)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="selection-empty">No separate tracks selected</div>
          )}
        </section>
      </div>
    </section>
  );
}
