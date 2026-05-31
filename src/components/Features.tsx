import {
  FaShieldAlt,
  FaBullseye,
  FaListAlt,
  FaCheckCircle,
} from "react-icons/fa";

const features = [
  {
    icon: <FaBullseye size={22} />,
    title: "Smart map matching",
    description:
      "Track names are normalised before searching - parentheticals, feature tags, version suffixes, and doubled letters are stripped. Results are scored by weighted title and artist similarity, with a small bonus for your preferred difficulty.",
  },
  {
    icon: <FaListAlt size={22} />,
    title: "Playlist export",
    description:
      "Full playlists write a .bplist file with your Spotify cover image. Requires PlaylistManager to be installed - without it, maps still download but won't appear as an in-game playlist.",
  },
  {
    icon: <FaCheckCircle size={22} />,
    title: "Already-installed detection",
    description:
      "Before downloading, TuneSaver scans your CustomLevels folder and marks maps you already have. They're skipped automatically - no duplicates, no re-downloads.",
  },
  {
    icon: <FaShieldAlt size={22} />,
    title: "PKCE OAuth - no secrets",
    description:
      "No client secret, no backend, no stored credentials. The auth flow runs entirely in the app; tokens are held in memory for the session and expire after one hour.",
  },
];

export default function Features() {
  return (
    <section className="features-section" id="features">
      <div className="section-header">
        <h2>Core features</h2>
      </div>
      <div className="features-grid">
        {features.map((f) => (
          <div key={f.title} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
