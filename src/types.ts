export type SpotifyPlaylist = {
  id: string;
  name: string;
  collaborative?: boolean;
  images?: { url: string }[];
  owner?: { id: string };
  tracks?: { total: number };
};

export type SpotifyTrack = {
  id?: string | null;
  name?: string;
  uri?: string;
  duration_ms?: number;
  album?: {
    name: string;
    images?: { url: string }[];
  };
  artists?: { name: string }[];
};

export type SelectedTrack = {
  selectionId: string;
  track: SpotifyTrack;
};

export type UserData = {
  playlists: SpotifyPlaylist[];
};

export type PlaylistsResponse = {
  items?: SpotifyPlaylist[];
  next?: string | null;
};

export type SpotifyUserProfile = {
  id: string;
};

export type PlaylistTracksResponse = {
  items?: { item?: SpotifyTrack | null; track?: SpotifyTrack | null }[];
  next?: string | null;
};
