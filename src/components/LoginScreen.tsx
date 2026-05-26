import { Music, Search, Download, ListMusic } from "lucide-react";

const STEPS = [
  {
    icon: <Search size={20} />,
    title: "Match",
    desc: "Every track in your Spotify playlists is searched on BeatSaver and scored by title and artist similarity.",
  },
  {
    icon: <Download size={20} />,
    title: "Download",
    desc: "Approved maps are extracted directly into your Beat Saber CustomLevels folder — no manual ZIP handling.",
  },
  {
    icon: <ListMusic size={20} />,
    title: "Playlist",
    desc: "Full playlists are exported as .bplist files with the Spotify cover art, ready for PlaylistManager in-game.",
  },
];

export function LoginScreen() {
  return (
    <main className="login-screen">
      <div className="login-hero">
        <div className="login-brand-icon" aria-hidden="true">
          <Music size={36} strokeWidth={2.5} />
        </div>
        <h1 className="login-title">TuneSaver</h1>
        <p className="login-subtitle">
          Turn your Spotify library into a Beat Saber custom map collection.
          <br />
          Select playlists, review matches, download — done.
        </p>
      </div>

      <div className="login-steps">
        {STEPS.map((s) => (
          <div className="login-step" key={s.title}>
            <div className="login-step-icon">{s.icon}</div>
            <div className="login-step-copy">
              <span className="login-step-title">{s.title}</span>
              <span className="login-step-desc">{s.desc}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        className="spotify-login-button"
        type="button"
        onClick={() => window.electron.startAuth()}
      >
        <Music size={20} />
        Connect Spotify
      </button>

      <p className="login-note">
        Opens Spotify in your browser · no password stored
      </p>
    </main>
  );
}
