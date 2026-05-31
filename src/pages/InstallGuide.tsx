import {
  FaPuzzlePiece,
  FaKey,
  FaUserPlus,
  FaCog,
  FaPlay,
} from "react-icons/fa";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const steps = [
  {
    number: 1,
    title: "Install the required Beat Saber mods",
    content: (
      <>
        <p>
          TuneSaver writes files that Beat Saber reads through its modding
          layer. Install{" "}
          <a href="https://www.bsmanager.io/" target="_blank" rel="noreferrer">
            BSManager
          </a>{" "}
          first, then use it to install these three mods:
        </p>
        <div className="mod-table">
          <div className="mod-row mod-row--header">
            <span>Mod</span>
            <span>Purpose</span>
          </div>
          <div className="mod-row">
            <span className="mod-name">BSIPA</span>
            <span>
              The mod loader. Required for all other mods to function.
            </span>
          </div>
          <div className="mod-row">
            <span className="mod-name">SongCore</span>
            <span>
              Loads custom levels from CustomLevels at startup. Without it,
              downloaded maps won't appear in-game.
            </span>
          </div>
          <div className="mod-row">
            <span className="mod-name">PlaylistManager</span>
            <span>
              Reads .bplist files from the Playlists folder and shows them as
              in-game playlists. Required for TuneSaver's playlist export.
            </span>
          </div>
        </div>
      </>
    ),
  },
  {
    number: 2,
    title: "Create a Spotify app",
    content: (
      <>
        <p>
          TuneSaver connects to Spotify through your own developer app. Because
          Spotify's development mode limits an app to{" "}
          <strong>5 whitelisted users</strong>, everyone who wants to use it
          must create their own app or be added to someone else's allowlist.
        </p>
        <ol className="install-ol">
          <li>
            Go to{" "}
            <a
              href="https://developer.spotify.com/dashboard"
              target="_blank"
              rel="noreferrer"
            >
              developer.spotify.com/dashboard
            </a>{" "}
            and log in with your <strong>Spotify Premium</strong> account.
          </li>
          <li>
            Click <strong>Create app</strong>. Fill in any name and description.
          </li>
          <li>
            Under <em>Redirect URIs</em>, click <strong>Add</strong> and enter
            exactly:
            <code className="code-block">tunesaver://callback</code>
          </li>
          <li>
            Under <em>APIs used</em>, tick <strong>Web API</strong>. Save the
            app.
          </li>
          <li>
            Copy your <strong>Client ID</strong> - the 32-character string shown
            on the app dashboard.
          </li>
        </ol>
      </>
    ),
  },
  {
    number: 3,
    title: "Whitelist users (including yourself)",
    content: (
      <>
        <p>
          Because your app is in development mode, Spotify only allows
          explicitly whitelisted accounts to authenticate.{" "}
          <strong>
            You must add your own Spotify account or you will not be able to log
            in.
          </strong>
        </p>
        <ol className="install-ol">
          <li>
            In your app's dashboard, go to{" "}
            <strong>Settings → User Management</strong>.
          </li>
          <li>
            Add the Spotify email address for every account that will use
            TuneSaver - starting with your own.
          </li>
        </ol>
        <div className="install-note">
          Up to 5 users can be added. Anyone not on the list will get an
          authentication error when logging in.
        </div>
      </>
    ),
  },
  {
    number: 4,
    title: "Configure the app",
    content: (
      <>
        <p>
          Extract the release ZIP and open{" "}
          <code className="code-inline">TuneSaver.exe</code>. Click the{" "}
          <strong>Settings</strong> icon and fill in:
        </p>
        <ul className="install-ul">
          <li>
            <strong>Spotify Client ID</strong> - paste the 32-character ID from
            Step 2.
          </li>
          <li>
            <strong>Beat Saber path</strong> - the root install folder TuneSaver
            uses to scan CustomLevels and write downloaded maps.
          </li>
        </ul>
        <p>
          Both values are saved to{" "}
          <code className="code-inline">localStorage</code> and loaded
          automatically on every launch.
        </p>
      </>
    ),
  },
  {
    number: 5,
    title: "Run TuneSaver",
    content: (
      <>
        <p>
          Double-click <code className="code-inline">TuneSaver.exe</code>. The
          app opens - click <strong>Connect Spotify</strong> and log in with any
          whitelisted account.
        </p>
        <p>
          Select playlists or individual tracks, click{" "}
          <strong>Find Beat Saber Maps</strong>, review the results, and
          download. Maps land in CustomLevels automatically. Full playlists also
          write a <code className="code-inline">.bplist</code> file that
          PlaylistManager picks up on the next game launch.
        </p>
      </>
    ),
  },
];

export default function InstallGuide() {
  return (
    <>
      <Navbar />
      <main className="install-guide-page">
        <div className="install-guide-header">
          <h1>Install Guide</h1>
          <p>
            Set up TuneSaver in about five minutes. You'll need a Spotify
            Premium account and Beat Saber installed with mods.
          </p>
        </div>
        <div className="install-steps">
          {steps.map((step, i) => (
            <div key={step.number} className="install-step">
              <div className="install-step-left">
                <span className="install-step-number">{step.number}</span>
                {i < steps.length - 1 && <div className="install-step-line" />}
              </div>
              <div className="install-step-right">
                <div className="install-step-header">
                  <div className="install-step-title-group">
                    <span className="install-step-category">
                      {step.icon} {step.category}
                    </span>
                    <span className="install-step-title">{step.title}</span>
                  </div>
                </div>
                <div className="install-step-body">{step.content}</div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
