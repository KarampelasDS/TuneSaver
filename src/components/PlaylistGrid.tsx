import { ListMusic } from "lucide-react";
import type { SpotifyPlaylist } from "../types";
import { PlaylistCard } from "./PlaylistCard";

type PlaylistGridProps = {
  playlists: SpotifyPlaylist[];
  selectedPlaylistIds: string[];
  isShowingAllPlaylists: boolean;
  isLoadingAllPlaylists: boolean;
  onTogglePlaylist: (playlist: SpotifyPlaylist) => void;
  onViewPlaylist: (playlist: SpotifyPlaylist) => void;
  onShowAllPlaylists: () => void;
};

export function PlaylistGrid({
  playlists,
  selectedPlaylistIds,
  isShowingAllPlaylists,
  isLoadingAllPlaylists,
  onTogglePlaylist,
  onViewPlaylist,
  onShowAllPlaylists,
}: PlaylistGridProps) {
  return (
    <section className="playlists-section">
      <h2>Your Playlists</h2>
      {playlists.length > 0 ? (
        <div className="playlist-grid">
          {playlists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              isSelected={selectedPlaylistIds.includes(playlist.id)}
              onToggle={onTogglePlaylist}
              onView={onViewPlaylist}
            />
          ))}
        </div>
      ) : (
        <div className="empty-playlists">
          <ListMusic size={24} />
          No playlists found
        </div>
      )}
      {playlists.length > 0 && !isShowingAllPlaylists && (
        <button
          className="show-all-button"
          type="button"
          onClick={onShowAllPlaylists}
          disabled={isLoadingAllPlaylists}
        >
          {isLoadingAllPlaylists ? "Loading playlists" : "Show all playlists"}
        </button>
      )}
    </section>
  );
}
