import { Loader2 } from "lucide-react";
import type { SelectedTrack, SpotifyPlaylist, UserData } from "../types";
import { PlaylistGrid } from "./PlaylistGrid";
import { SelectedPlaylists } from "./SelectedPlaylists";

type MusicSelectionScreenProps = {
  userData: UserData | null;
  selectedPlaylists: SpotifyPlaylist[];
  selectedTracks: SelectedTrack[];
  isShowingAllPlaylists: boolean;
  isLoadingAllPlaylists: boolean;
  onTogglePlaylist: (playlist: SpotifyPlaylist) => void;
  onViewPlaylist: (playlist: SpotifyPlaylist) => void;
  onRemovePlaylist: (playlist: SpotifyPlaylist) => void;
  onRemoveTrack: (selectionId: string) => void;
  onShowAllPlaylists: () => void;
  onFindMaps: () => void;
};

export function MusicSelectionScreen({
  userData,
  selectedPlaylists,
  selectedTracks,
  isShowingAllPlaylists,
  isLoadingAllPlaylists,
  onTogglePlaylist,
  onViewPlaylist,
  onRemovePlaylist,
  onRemoveTrack,
  onShowAllPlaylists,
  onFindMaps,
}: MusicSelectionScreenProps) {
  return (
    <main className="music-screen">
      <aside className="playlist-sidebar" aria-label="Playlists">
        <section className="sidebar-heading">
          <h2>Playlists</h2>
          <p>Owned or collaborative</p>
        </section>
        {userData?.playlists ? (
          <PlaylistGrid
            playlists={userData.playlists}
            selectedPlaylistIds={selectedPlaylists.map(
              (playlist) => playlist.id,
            )}
            isShowingAllPlaylists={isShowingAllPlaylists}
            isLoadingAllPlaylists={isLoadingAllPlaylists}
            onTogglePlaylist={onTogglePlaylist}
            onViewPlaylist={onViewPlaylist}
            onShowAllPlaylists={onShowAllPlaylists}
          />
        ) : (
          <div className="loading-state">
            <Loader2 size={22} />
            Loading playlists
          </div>
        )}
      </aside>
      <SelectedPlaylists
        playlists={selectedPlaylists}
        tracks={selectedTracks}
        onRemove={onRemovePlaylist}
        onRemoveTrack={onRemoveTrack}
        onFindMaps={onFindMaps}
      />
    </main>
  );
}
