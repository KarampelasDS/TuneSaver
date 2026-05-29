import { FaGithub } from "react-icons/fa";

export default function Navbar() {
  return (
    <div className="navbar">
      <div className="app-logo">
        <img
          src="/logo.svg"
          alt="TuneSaver Logo"
          className="logo-image"
          width="40"
          height="40"
        />
        <span className="app-name">TuneSaver</span>
      </div>
      <div className="navbar-links">
        <a href="/how-it-works">How It Works</a>
        <a href="/features">Features</a>
        <a href="/install-guide">Install Guide</a>
      </div>
      <div className="navbar-icons">
        <FaGithub size={30} id="github-icon" />
      </div>
    </div>
  );
}
