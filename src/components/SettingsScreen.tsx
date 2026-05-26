import { FolderOpen, LogOut, Music, Sliders, User } from "lucide-react";
import type { AppSettings } from "../types";

type SettingsScreenProps = {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onLogout: () => void;
};

export function SettingsScreen({
  settings,
  onSettingsChange,
  onLogout,
}: SettingsScreenProps) {
  const update = (patch: Partial<AppSettings>) =>
    onSettingsChange({ ...settings, ...patch });

  const browse = async () => {
    const dir = await window.electron.selectDirectory();
    if (dir) update({ beatSaberPath: dir });
  };

  return (
    <main className="settings-screen">
      <div className="settings-card">

        <div className="settings-section">
          <div className="settings-section-header">
            <Music size={15} />
            <h2 className="settings-section-title">Game Path</h2>
          </div>
          <label className="field-group">
            <span>Beat Saber Install Path</span>
            <div className="path-control">
              <input
                value={settings.beatSaberPath}
                onChange={(e) => update({ beatSaberPath: e.target.value })}
              />
              <button className="browse-button" type="button" onClick={browse}>
                <FolderOpen size={16} />
                Browse
              </button>
            </div>
          </label>
        </div>

        <div className="settings-section">
          <div className="settings-section-header">
            <Sliders size={15} />
            <h2 className="settings-section-title">Matching</h2>
          </div>
          <div className="settings-fields">
            <label className="field-group">
              <span>
                Match Confidence Threshold:{" "}
                <strong>{settings.matchThreshold}%</strong>
              </span>
              <input
                className="threshold-slider"
                type="range"
                min="0"
                max="100"
                value={settings.matchThreshold}
                onChange={(e) =>
                  update({ matchThreshold: Number(e.target.value) })
                }
              />
              <div className="slider-labels">
                <span>Any match</span>
                <span>Exact only</span>
              </div>
            </label>

            <label className="field-group">
              <span>Preferred Difficulty</span>
              <select
                value={settings.preferredDifficulty}
                onChange={(e) =>
                  update({
                    preferredDifficulty: e.target
                      .value as AppSettings["preferredDifficulty"],
                  })
                }
              >
                <option value="ExpertPlus">Expert+</option>
                <option value="Expert">Expert</option>
                <option value="Hard">Hard</option>
                <option value="Normal">Normal</option>
                <option value="Easy">Easy</option>
              </select>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-header">
            <User size={15} />
            <h2 className="settings-section-title">Account</h2>
          </div>
          <button className="logout-button" type="button" onClick={onLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>

      </div>
    </main>
  );
}
