import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";

const TYPEWRITER_WORDS = [
  "Minutes of Meeting",
  "Smart Notes",
  "Live Key Points",
  "Action Items",
  "Meeting Summaries",
  "Real-time Insights",
];

const useTypewriter = (
  words,
  typingSpeed = 80,
  deletingSpeed = 45,
  pauseTime = 1800,
) => {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = words[wordIndex];

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          const next = current.slice(0, displayed.length + 1);
          setDisplayed(next);

          if (next === current) {
            setTimeout(() => setIsDeleting(true), pauseTime);
          }
        } else {
          const next = current.slice(0, displayed.length - 1);
          setDisplayed(next);

          if (next === "") {
            setIsDeleting(false);
            setWordIndex((i) => (i + 1) % words.length);
          }
        }
      },
      isDeleting ? deletingSpeed : typingSpeed,
    );

    return () => clearTimeout(timeout);
  }, [displayed, isDeleting, wordIndex, words]);

  return displayed;
};

const HomePage = () => {
  const typed = useTypewriter(TYPEWRITER_WORDS);
  const [btnHover, setBtnHover] = useState(false);

  return (
    <div className="modern-landing">
      {/* Dynamic Background */}
      <div className="bg-canvas">
        <div className="glow-mesh" />
      </div>

      <main className="hero-section">
        <div className="badge-container">
          <span className="ai-badge">v2.0 is live</span>
        </div>

        <h1 className="main-title">
          Meetings, <span className="muted-text">refined into</span>
          <br />
          <div className="typewriter-box">
            <span className="gradient-text">{typed}</span>
            <span className="blinking-cursor">_</span>
          </div>
        </h1>

        <p className="hero-description">
          Mettzyy automates your post-meeting workflow. Real-time capture,
          intelligent summaries, and instant action items.
        </p>

        <div className="cta-group">
          <Link to="/meeting" className="no-underline">
            <button
              className={`action-button ${btnHover ? "is-hovered" : ""}`}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
            >
              Get Started Free
              <svg
                className="arrow-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </Link>
        </div>

        <div className="social-proof">
          <div className="proof-item">
            <span className="proof-val">10x</span>
            <span className="proof-label">Efficiency</span>
          </div>
          <div className="divider" />
          <div className="proof-item">
            <span className="proof-val">Real-time</span>
            <span className="proof-label">Analysis</span>
          </div>
          <div className="divider" />
          <div className="proof-item">
            <span className="proof-val">Zero</span>
            <span className="proof-label">Setup</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
