import { Eye, Heart, Music } from "lucide-react";
import type { SpotifyPlaylist } from "../types";

type PlaylistCardProps = {
  playlist: SpotifyPlaylist;
  isSelected: boolean;
  onToggle: (playlist: SpotifyPlaylist) => void;
  onView: (playlist: SpotifyPlaylist) => void;
};

type PlaylistArtworkProps = {
  playlist: SpotifyPlaylist;
};

export function PlaylistArtwork({ playlist }: PlaylistArtworkProps) {
  const imageUrl = playlist.images?.[0]?.url;
  const isLikedSongs = playlist.name.toLowerCase() === "liked songs";

  if (imageUrl) {
    return <img className="playlist-art" src={imageUrl} alt="" />;
  }

  return (
    <div
      className={
        isLikedSongs ? "playlist-art liked-art" : "playlist-art empty-art"
      }
    >
      {isLikedSongs ? (
        <Heart size={22} fill="currentColor" />
      ) : (
        <Music size={22} />
      )}
    </div>
  );
}

export function PlaylistCard({
  playlist,
  isSelected,
  onToggle,
  onView,
}: PlaylistCardProps) {
  const trackCount = playlist.items?.total ?? 0;

  return (
    <div className={isSelected ? "playlist-card selected" : "playlist-card"}>
      <button
        className="playlist-select-button"
        type="button"
        onClick={() => onToggle(playlist)}
      >
        <PlaylistArtwork playlist={playlist} />
        <span className="playlist-copy">
          <span className="playlist-name">{playlist.name}</span>
          <span className="playlist-count">{trackCount} tracks</span>
        </span>
      </button>
      <button
        className="playlist-view-button"
        type="button"
        aria-label={`View ${playlist.name}`}
        onClick={() => onView(playlist)}
        title={`View ${playlist.name}`}
      >
        <Eye size={18} />
      </button>
    </div>
  );
}
