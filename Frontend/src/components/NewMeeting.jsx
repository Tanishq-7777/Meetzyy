import React, { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import useSocketStore from "../store/useSocketStore";
import {
  Mic,
  Sparkles,
  Square,
  Activity,
  Radio,
  Clock,
  Zap,
} from "lucide-react";
import "./NewMeeting.css";

const NewMeeting = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  const transcripts = useSocketStore((state) => state.transcripts);
  const keyPoints = useSocketStore((state) => state.keyPoints);
  const stopMeeting = useSocketStore((state) => state.stopMeeting);

  const transcriptEndRef = useRef(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  const handleStop = () => {
    const confirmed = window.confirm("End session and save recording?");
    if (confirmed) {
      stopMeeting();
      navigate("/meeting");
    }
  };

  return (
    <div className="nm-page">
      <div className="nm-grid-bg" />

      <header className="nm-header">
        <div className="nm-header-left">
          <div className="nm-status-badge">
            <span className="nm-status-dot" />
            <Radio size={14} />
            <span>LIVE</span>
          </div>
          <div className="nm-divider-v" />
          <div className="nm-session-meta">
            <Zap size={14} className="nm-zap-icon" />
            <span>ID: {meetingId.slice(-6)}</span>
          </div>
        </div>

        <div className="nm-header-right">
          <div className="nm-timer-pill">
            <Clock size={14} />
            <span>Recording...</span>
          </div>
        </div>
      </header>

      <div className="nm-main-container">
        {/* Left Side: Transcript */}
        <section className="nm-panel">
          <div className="nm-panel-header">
            <div className="nm-icon-wrapper">
              <Mic size={18} />
            </div>
            <h3>Transcript</h3>
            <div className="nm-audio-viz">
              <div className="nm-bar" />
              <div className="nm-bar" />
              <div className="nm-bar" />
            </div>
          </div>
          <div className="nm-panel-body custom-scroll">
            <div className="nm-transcript-content">
              {transcripts.length > 0 ? (
                transcripts.map((text, i) => (
                  <span key={i} className="nm-text-chunk">
                    {text}{" "}
                  </span>
                ))
              ) : (
                <div className="nm-empty-state">
                  <Activity size={32} className="nm-pulse-icon" />
                  <p>Listening...</p>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </section>

        {/* Right Side: Key Points */}
        <section className="nm-panel">
          <div className="nm-panel-header">
            <div className="nm-icon-wrapper nm-sparkle-bg">
              <Sparkles size={18} />
            </div>
            <h3>Insights</h3>
          </div>
          <div className="nm-panel-body custom-scroll">
            {keyPoints.length > 0 ? (
              keyPoints.map((point, index) => (
                <div key={index} className="nm-insight-card">
                  <ReactMarkdown>{point}</ReactMarkdown>
                </div>
              ))
            ) : (
              <div className="nm-empty-state">
                <Sparkles size={32} className="nm-float-icon" />
                <p>Analyzing...</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="nm-floating-controls">
        <button className="nm-stop-button" onClick={handleStop}>
          <div className="nm-stop-square">
            <Square size={14} fill="currentColor" />
          </div>
          <span className="nm-stop-text">Stop Session</span>
        </button>
      </div>
    </div>
  );
};

export default NewMeeting;
