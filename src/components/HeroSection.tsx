import { FaExternalLinkAlt, FaDownload } from "react-icons/fa";

export default function HeroSection() {
  return (
    <div className="hero-section">
      <h1 className="hero-title">
        Sync your favourite playlists <br /> with Beat Saber
      </h1>
      <p className="hero-description">
        TuneSaver automates the process of finding and installing <br />
        Beat Saber maps that match your spotify tracks.
      </p>
      <div className="hero-buttons">
        <a href="/install-guide" className="cta-button">
          <FaDownload /> Download for Windows
        </a>
        <a
          href="https://github.com/karampelasDS/tunesaver"
          className="github-button"
        >
          Source Code on GitHub{" "}
          <FaExternalLinkAlt size={12} style={{ marginLeft: "5px" }} />
        </a>
      </div>
    </div>
  );
}
