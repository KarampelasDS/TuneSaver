import { ArrowLeft, Music, Settings } from "lucide-react";

type AppHeaderProps = {
  canOpenSettings: boolean;
  showBackButton: boolean;
  onBack: () => void;
  onSettingsClick: () => void;
};

export function AppHeader({
  canOpenSettings,
  showBackButton,
  onBack,
  onSettingsClick,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="header-left">
        {showBackButton && (
          <button
            className="icon-button"
            type="button"
            aria-label="Back"
            title="Go back"
            onClick={onBack}
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="brand">
          <div className="brand-icon" aria-hidden="true">
            <Music size={22} strokeWidth={2.5} />
          </div>
          <span>TuneSaver</span>
        </div>
      </div>
      <button
        className="icon-button"
        type="button"
        aria-label="Settings"
        title="Settings"
        onClick={onSettingsClick}
        disabled={!canOpenSettings}
      >
        <Settings size={20} />
      </button>
    </header>
  );
}
