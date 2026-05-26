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

export type BeatSaverDiff = {
  difficulty: "ExpertPlus" | "Expert" | "Hard" | "Normal" | "Easy";
  characteristic: string;
};

export type BeatSaverVersion = {
  hash: string;
  downloadURL: string;
  coverURL: string;
  diffs: BeatSaverDiff[];
};

export type BeatSaverMap = {
  id: string;
  name: string;
  metadata: {
    songName: string;
    songAuthorName: string;
    levelAuthorName: string;
    duration: number;
    bpm: number;
  };
  versions: BeatSaverVersion[];
};

export type BeatSaverSearchResponse = {
  docs: BeatSaverMap[];
};

export type TrackMatch = {
  selectionId: string;
  track: SpotifyTrack;
  results: BeatSaverMap[];
  selectedResultIndex: number;
  matchScore: number;
  isInstalled: boolean;
  searching: boolean;
  sourcePlaylistId?: string;
  manuallySelected: boolean;
};

export type AppSettings = {
  beatSaberPath: string;
  matchThreshold: number;
  preferredDifficulty: "ExpertPlus" | "Expert" | "Hard" | "Normal" | "Easy";
};

export type MatchPhase =
  | { type: "collecting" }
  | { type: "searching"; done: number; total: number }
  | { type: "results" }
  | { type: "downloading" }
  | { type: "complete"; succeeded: number; failed: number; playlistsCreated: number };
