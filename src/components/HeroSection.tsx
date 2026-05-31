import { FaDownload, FaExternalLinkAlt } from "react-icons/fa";
import { Link } from "react-router-dom";

export default function HeroSection() {
  return (
    <div className="hero-section">
      <h1 className="hero-title">
        Match your Spotify playlists <br />
        <span className="hero-title-accent">with Beat Saber custom maps</span>
      </h1>
      <p className="hero-description">
        TuneSaver searches BeatSaver for tracks from your own Spotify playlists,
        scores the results, <br /> and downloads maps straight into your
        CustomLevels folder.
      </p>
      <div className="hero-setup-note">
        Requires a Spotify Premium account, a free Spotify developer app, and
        Beat Saber with BSIPA, SongCore, and PlaylistManager installed.{" "}
        <Link to="/install-guide">Install guide →</Link>
      </div>
      <div className="hero-buttons">
        <a
          href="https://github.com/karampelasDS/tunesaver/releases/latest"
          className="cta-button"
        >
          <FaDownload /> Download for Windows
        </a>
        <a
          href="https://github.com/karampelasDS/tunesaver"
          className="github-button"
        >
          View source on GitHub <FaExternalLinkAlt size={12} />
        </a>
      </div>
      <div className="hero-image">
        <img
          src="Conversion_Screen.png"
          alt="TuneSaver Hero"
          className="hero-img"
        />
      </div>
    </div>
  );
}
