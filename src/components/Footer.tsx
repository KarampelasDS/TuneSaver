import { FaGithub } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-logo">
        <img src="/logo.svg" alt="TuneSaver Logo" width="24" height="24" />
        <span>TuneSaver</span>
      </div>
      <p className="footer-tagline">Open source utility for Beat Saber.</p>
      <div className="footer-links">
        <a href="https://github.com/karampelasDS/tunesaver">
          <FaGithub size={18} /> GitHub
        </a>
      </div>
      <p className="footer-copy">© 2026 TuneSaver. Made with ❤️</p>
    </footer>
  );
}
