import axios from "axios";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { BASE_URL } from "../../constants";
import {
  ArrowLeft,
  Mic,
  Sparkles,
  Calendar,
  Clock,
  FileText,
  Loader2,
} from "lucide-react";
import "./MeetingHistory.css";

const MeetingHistory = () => {
  const [meetingData, setMeetingData] = useState(null);
  const { meetingId } = useParams();

  const fetchMeetingDetails = async (id) => {
    try {
      const result = await axios.get(`${BASE_URL}/meeting/${id}`, {
        withCredentials: true,
      });
      setMeetingData(result.data.data);
    } catch (err) {
      console.error("Error fetching details:", err);
    }
  };

  useEffect(() => {
    fetchMeetingDetails(meetingId);
  }, [meetingId]);

  if (!meetingData) {
    return (
      <div className="mh-loading-screen">
        <div className="mh-loader-content">
          <Loader2 className="mh-spinner" size={40} />
          <p>Generating your summary...</p>
        </div>
      </div>
    );
  }

  const fullTranscript = meetingData.text?.join(" ");
  const fullKeyPoints = meetingData.keyPoints?.join("\n\n");

  return (
    <div className="mh-page">
      <div className="mh-grid-bg" />

      {/* Navigation Header */}
      <nav className="mh-navbar">
        <Link to="/meeting" className="mh-back-link">
          <ArrowLeft size={18} />
          <span>Back to Dashboard</span>
        </Link>

        <div className="mh-title-section">
          <h1 className="mh-main-title">
            {meetingData.title || "Meeting Analysis"}
          </h1>
          <div className="mh-meta-group">
            <Calendar size={14} />
            <span>
              {new Date(meetingData.createdAt).toLocaleString([], {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>
        </div>
      </nav>

      <main className="mh-content-layout">
        {/* Left Side: Merged Transcript */}
        <section className="mh-glass-panel">
          <header className="mh-panel-header">
            <div className="mh-icon-box mh-mic-icon">
              <Mic size={18} />
            </div>
            <h2 className="mh-panel-title">Full Transcript</h2>
          </header>
          <div className="mh-scroll-area scroll-custom">
            <p className="mh-transcript-text">{fullTranscript}</p>
          </div>
        </section>

        {/* Right Side: KeyPoints Markdown */}
        <section className="mh-glass-panel">
          <header className="mh-panel-header">
            <div className="mh-icon-box mh-sparkle-icon">
              <Sparkles size={18} />
            </div>
            <h2 className="mh-panel-title">AI Insights & Summary</h2>
          </header>
          <div className="mh-scroll-area scroll-custom">
            <div className="mh-markdown-container">
              <ReactMarkdown>{fullKeyPoints}</ReactMarkdown>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default MeetingHistory;
