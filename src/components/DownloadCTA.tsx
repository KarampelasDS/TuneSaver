import { FaDownload } from "react-icons/fa";
import { Link } from "react-router-dom";

export default function DownloadCTA() {
  return (
    <section className="download-cta-section">
      <div className="download-cta-inner">
        <div className="download-cta-text">
          <h2>Ready to sync?</h2>
          <p>
            Windows only. Free and open source - runs entirely on your machine.
            Requires Spotify Premium and a free Spotify developer app.{" "}
            <Link to="/install-guide">Read the setup guide</Link> before
            running.
          </p>
        </div>
        <div className="download-cta-buttons">
          <a
            href="https://github.com/karampelasDS/tunesaver/releases/latest"
            className="cta-button"
          >
            <FaDownload /> Download for Windows
          </a>
        </div>
      </div>
    </section>
  );
}
