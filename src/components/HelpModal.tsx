import { X } from "lucide-react";

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="help-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="help-modal-header">
          <h2
            id="help-modal-title"
            className="modal-title"
            style={{ textAlign: "left" }}
          >
            How TuneSaver works
          </h2>
          <button
            className="icon-button"
            type="button"
            aria-label="Close"
            title="Close"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="help-modal-body">
          <p className="help-intro">
            TuneSaver matches your Spotify playlists to Beat Saber custom maps
            and downloads them automatically into your game.
          </p>

          <div className="help-steps">
            <div className="help-step">
              <div className="help-step-num">1</div>
              <div className="help-step-copy">
                <span className="help-step-title">Create a Spotify app</span>
                <span className="help-step-desc">
                  Go to{" "}
                  <button
                    className="tip-settings-link"
                    type="button"
                    onClick={() =>
                      window.electron.openExternal(
                        "https://developer.spotify.com/dashboard",
                      )
                    }
                  >
                    developer.spotify.com/dashboard
                  </button>
                  , create an app, and add{" "}
                  <code className="help-code">tunesaver://callback</code> as a
                  Redirect URI. Copy the 32-character Client ID — you'll paste
                  it into TuneSaver on first launch.
                </span>
                <span className="help-step-note">
                  Spotify developer apps are limited to 5 whitelisted users. Add
                  your own Spotify account under Settings → User Management or
                  you won't be able to log in.
                </span>
              </div>
            </div>

            <div className="help-step">
              <div className="help-step-num">2</div>
              <div className="help-step-copy">
                <span className="help-step-title">
                  Set your Beat Saber path
                </span>
                <span className="help-step-desc">
                  Open Settings (gear icon) and browse to your Beat Saber
                  install folder. TuneSaver uses this to scan already-installed
                  maps and to extract new downloads into{" "}
                  <code className="help-code">CustomLevels</code>.
                </span>
              </div>
            </div>

            <div className="help-step">
              <div className="help-step-num">3</div>
              <div className="help-step-copy">
                <span className="help-step-title">Connect Spotify</span>
                <span className="help-step-desc">
                  Click <strong>Connect Spotify</strong> on the login screen.
                  Your browser opens Spotify's auth page — approve it and you're
                  redirected back automatically.
                </span>
              </div>
            </div>

            <div className="help-step">
              <div className="help-step-num">4</div>
              <div className="help-step-copy">
                <span className="help-step-title">Select music</span>
                <span className="help-step-desc">
                  Check one or more playlists in the sidebar to queue all their
                  tracks, or open a playlist and tick individual songs. You can
                  mix both. Only playlists you own or collaborate on are shown —
                  Spotify's API restricts access to others.
                </span>
              </div>
            </div>

            <div className="help-step">
              <div className="help-step-num">5</div>
              <div className="help-step-copy">
                <span className="help-step-title">Find Beat Saber maps</span>
                <span className="help-step-desc">
                  Click <strong>Find Beat Saber Maps</strong>. TuneSaver
                  searches BeatSaver for each track, normalising the title and
                  trying progressively simpler queries until it finds a
                  confident match. Searches run 2 at a time with pauses to avoid
                  rate limits.
                </span>
              </div>
            </div>

            <div className="help-step">
              <div className="help-step-num">6</div>
              <div className="help-step-copy">
                <span className="help-step-title">Review results</span>
                <span className="help-step-desc">
                  Each card shows the Spotify track on the left and the matched
                  map on the right with a confidence score. Open{" "}
                  <strong>Alternatives</strong> to swap in a different map, or{" "}
                  <strong>Candidates</strong> on a no-match card to manually
                  pick one. Use the <strong>✕</strong> button to skip songs you
                  don't want.
                </span>
              </div>
            </div>

            <div className="help-step">
              <div className="help-step-num">7</div>
              <div className="help-step-copy">
                <span className="help-step-title">Download</span>
                <span className="help-step-desc">
                  Click <strong>Download N Maps</strong>. Each ZIP is fetched
                  from BeatSaver's CDN and extracted into{" "}
                  <code className="help-code">CustomLevels</code>. For full
                  playlists a <code className="help-code">.bplist</code> file is
                  also written so the collection appears in-game with the
                  original Spotify cover art. Re-running a download adds any
                  previously-skipped songs to the existing playlist file.
                </span>
              </div>
            </div>
          </div>

          <div className="help-footer-note">
            <strong>Required mods:</strong> BSIPA (mod loader), SongCore (loads
            custom maps), PlaylistManager (shows .bplist playlists in-game). All
            available through{" "}
            <button
              className="tip-settings-link"
              type="button"
              onClick={() =>
                window.electron.openExternal("https://www.bsmanager.io/")
              }
            >
              BSManager
            </button>
            .
          </div>
        </div>
      </div>
    </div>
  );
}
