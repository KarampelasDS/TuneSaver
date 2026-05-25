import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import {
  AppHeader,
  LoginScreen,
  MusicSelectionScreen,
  PlaylistDetailScreen,
  SettingsScreen,
} from "./components";
import type {
  PlaylistTracksResponse,
  PlaylistsResponse,
  SelectedTrack,
  SpotifyPlaylist,
  SpotifyTrack,
  SpotifyUserProfile,
  UserData,
} from "./types";
import "./index.css";

declare global {
  interface Window {
    electron: {
      startAuth: () => void;
      onAuthSuccess: (callback: (token: string) => void) => void;
    };
  }
}

const rootElement = document.getElementById("root");
const currentUserUrl = "https://api.spotify.com/v1/me";
const allPlaylistsUrl = "https://api.spotify.com/v1/me/playlists";

type AppView = "music" | "settings" | "playlist";

function App() {
  const [token, setToken] = useState<string | null>(
    import.meta.env.VITE_TEMP_TOKEN,
  );
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
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

  const filterReadablePlaylists = (
    playlists: SpotifyPlaylist[],
    userId: string,
  ) =>
    playlists.filter(
      (playlist) => playlist.owner?.id === userId || playlist.collaborative,
    );

  const fetchAllPlaylists = async (accessToken: string) => {
    const playlists: SpotifyPlaylist[] = [];
    let nextUrl: string | null = allPlaylistsUrl;

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data: PlaylistsResponse = await response.json();

      playlists.push(...(data.items ?? []));
      nextUrl = data.next ?? null;
    }

    return playlists;
  };

  useEffect(() => {
    window.electron.onAuthSuccess((token) => {
      console.log("token:", token);
      setToken(token);
      setLoggedIn(true);
      setCurrentView("music");
    });
  }, []);

  useEffect(() => {
    if (token) {
      setLoggedIn(true);
      setIsShowingAllPlaylists(false);
      fetch(currentUserUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((profile: SpotifyUserProfile) => {
          setCurrentUserId(profile.id);

          return fetchAllPlaylists(token).then((playlists) => {
            console.log("Playlists:", playlists);
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

  const showAllPlaylists = () => {
    if (!token || !currentUserId) return;

    setIsLoadingAllPlaylists(true);
    fetchAllPlaylists(token)
      .then((playlists) => {
        console.log("All playlists:", playlists);
        setUserData({
          playlists: filterReadablePlaylists(playlists, currentUserId),
        });
        setIsShowingAllPlaylists(true);
      })
      .finally(() => {
        setIsLoadingAllPlaylists(false);
      });
  };

  const togglePlaylistSelection = (playlist: SpotifyPlaylist) => {
    setSelectedPlaylists((currentPlaylists) => {
      if (
        currentPlaylists.some(
          (currentPlaylist) => currentPlaylist.id === playlist.id,
        )
      ) {
        return currentPlaylists.filter(
          (currentPlaylist) => currentPlaylist.id !== playlist.id,
        );
      }

      return [...currentPlaylists, playlist];
    });
  };

  const removePlaylistSelection = (playlist: SpotifyPlaylist) => {
    setSelectedPlaylists((currentPlaylists) =>
      currentPlaylists.filter(
        (currentPlaylist) => currentPlaylist.id !== playlist.id,
      ),
    );
  };

  const getTrackSelectionId = (track: SpotifyTrack, index: number) =>
    track.id ?? track.uri ?? `${activePlaylist?.id ?? "playlist"}-${track.name}-${index}`;

  const toggleTrackSelection = (track: SpotifyTrack, index: number) => {
    const trackId = getTrackSelectionId(track, index);

    setSelectedTracks((currentTracks) => {
      if (
        currentTracks.some(
          (currentTrack) => currentTrack.selectionId === trackId,
        )
      ) {
        return currentTracks.filter(
          (currentTrack) => currentTrack.selectionId !== trackId,
        );
      }

      return [...currentTracks, { selectionId: trackId, track }];
    });
  };

  const removeTrackSelection = (selectionId: string) => {
    setSelectedTracks((currentTracks) =>
      currentTracks.filter((track) => track.selectionId !== selectionId),
    );
  };

  const fetchPlaylistTracks = async (playlist: SpotifyPlaylist) => {
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
        const response = await fetch(nextUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message ??
              `Spotify returned ${response.status} while loading songs`,
          );
        }

        const data: PlaylistTracksResponse = await response.json();
        console.log("Playlist tracks:", data);

        tracks.push(
          ...(data.items ?? [])
            .map((playlistItem) => playlistItem.item ?? playlistItem.track)
            .filter((track): track is SpotifyTrack => Boolean(track)),
        );
        nextUrl = data.next ?? null;
      }

      setActivePlaylistTracks(tracks);
    } catch (error) {
      console.error("Error loading playlist songs:", error);
      setActivePlaylistTracks([]);
      setPlaylistTrackError(
        error instanceof Error ? error.message : "Could not load songs",
      );
    } finally {
      setIsLoadingPlaylistTracks(false);
    }
  };

  const logout = () => {
    setToken(null);
    setLoggedIn(false);
    setUserData(null);
    setCurrentUserId(null);
    setCurrentView("music");
    setSelectedPlaylists([]);
    setSelectedTracks([]);
    setActivePlaylist(null);
    setActivePlaylistTracks(null);
    setPlaylistTrackError(null);
    setIsShowingAllPlaylists(false);
    setIsLoadingAllPlaylists(false);
    setIsLoadingPlaylistTracks(false);
  };

  const goBack = () => {
    setCurrentView("music");
  };

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
        <SettingsScreen onLogout={logout} />
      ) : loggedIn && currentView === "playlist" && activePlaylist ? (
        <PlaylistDetailScreen
          playlist={activePlaylist}
          tracks={activePlaylistTracks}
          error={playlistTrackError}
          selectedTrackIds={selectedTracks.map((track) => track.selectionId)}
          isSelected={selectedPlaylists.some(
            (playlist) => playlist.id === activePlaylist.id,
          )}
          isLoading={isLoadingPlaylistTracks}
          getTrackSelectionId={getTrackSelectionId}
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
          onViewPlaylist={fetchPlaylistTracks}
          onRemovePlaylist={removePlaylistSelection}
          onRemoveTrack={removeTrackSelection}
          onShowAllPlaylists={showAllPlaylists}
        />
      ) : (
        <LoginScreen />
      )}
    </div>
  );
}

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(<App />);
