export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Set up and connect",
      description:
        "Create a free Spotify developer app, whitelist your account, and paste your Client ID into TuneSaver's config. Then click Connect Spotify - PKCE OAuth handles the rest with no client secret or backend.",
    },
    {
      number: "02",
      title: "Pick your tracks",
      description:
        "Select playlists you own or collaborate on, or cherry-pick individual tracks. TuneSaver searches BeatSaver in batches, normalises track names, and scores each result by title and artist similarity.",
    },
    {
      number: "03",
      title: "Download & play",
      description:
        "Matched maps are extracted into your CustomLevels folder. If you have PlaylistManager installed, full playlists also write a .bplist file with your Spotify cover image so they appear in-game.",
    },
  ];

  return (
    <section className="how-it-works-section" id="how-it-works">
      <div className="section-header">
        <h2>How it works</h2>
        <p className="section-subtitle">
          Three steps from Spotify to Beat Saber.
        </p>
      </div>
      <div className="steps-grid">
        {steps.map((step) => (
          <div key={step.number} className="step-card">
            <span className="step-number">{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
