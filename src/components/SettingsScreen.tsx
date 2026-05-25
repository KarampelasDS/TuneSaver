import { FolderOpen, LogOut } from "lucide-react";

type SettingsScreenProps = {
  onLogout: () => void;
};

export function SettingsScreen({ onLogout }: SettingsScreenProps) {
  return (
    <main className="settings-screen">
      <section className="settings-panel" aria-label="Settings">
        <label className="field-group">
          <span>Beat Saber Install Path</span>
          <div className="path-control">
            <input
              defaultValue="C:/Program Files (x86)/Steam/steamapps/common/Beat Saber"
            />
            <button className="browse-button" type="button">
              <FolderOpen size={18} />
              Browse
            </button>
          </div>
        </label>

        <div className="settings-grid">
          <label className="field-group">
            <span>Match Confidence Threshold: 80%</span>
            <input
              className="threshold-slider"
              type="range"
              min="0"
              max="100"
              defaultValue="80"
            />
          </label>

          <label className="field-group">
            <span>Preferred Difficulty</span>
            <select defaultValue="expert-plus">
              <option value="expert-plus">Expert+</option>
              <option value="expert">Expert</option>
              <option value="hard">Hard</option>
              <option value="normal">Normal</option>
              <option value="easy">Easy</option>
            </select>
          </label>
        </div>

        <button className="logout-button" type="button" onClick={onLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </section>
    </main>
  );
}
