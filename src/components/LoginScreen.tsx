import { Music } from "lucide-react";

export function LoginScreen() {
  return (
    <main className="login-screen">
      <button
        className="spotify-login-button"
        onClick={() => window.electron.startAuth()}
      >
        <Music size={22} />
        Log in with Spotify
      </button>
    </main>
  );
}
