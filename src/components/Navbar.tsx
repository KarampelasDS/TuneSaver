import { FaGithub } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <nav className="navbar">
      <div className="app-logo">
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <img
            src="/logo.svg"
            alt="TuneSaver Logo"
            className="logo-image"
            width="40"
            height="40"
          />
          <span className="app-name">TuneSaver</span>
        </Link>
      </div>
      <div className="navbar-links">
        {isHome ? (
          <>
            <a href="#how-it-works">How It Works</a>
            <a href="#features">Features</a>
          </>
        ) : (
          <>
            <Link to="/#how-it-works">How It Works</Link>
            <Link to="/#features">Features</Link>
          </>
        )}
        <Link to="/install-guide">Install Guide</Link>
      </div>
      <div className="navbar-icons">
        <div className="navbar-mobile-guide">
          <Link to="/install-guide">Install Guide</Link>
        </div>
        <a
          href="https://github.com/karampelasDS/tunesaver"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
        >
          <FaGithub size={26} id="github-icon" />
        </a>
      </div>
    </nav>
  );
}
