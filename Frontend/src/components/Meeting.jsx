import { useEffect, useState } from "react";
import useAuthStore from "../store/useAuthStore";
import useSocketStore from "../store/useSocketStore";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { BASE_URL } from "../../constants";
import {
  Plus,
  FileText,
  X,
  Mic,
  Play,
  ChevronRight,
  Zap,
  Clock,
  LayoutDashboard,
} from "lucide-react";
import "./Meeting.css";

const Meeting = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const { initSocket, emitStart, isRecording, meetingId } = useSocketStore();
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    if (user?._id) {
      initSocket(user._id, navigate);
    }

    const fetchMeetings = async () => {
      try {
        const data = await axios.get(BASE_URL + "/meeting/allMeetings", {
          withCredentials: true,
        });
        setMeetings(data.data.data);
      } catch (err) {
        console.error("Error fetching meetings:", err);
      }
    };
    fetchMeetings();
  }, [user?._id, initSocket, navigate]);

  const handleDelete = (e, id) => {};

  return (
    <div className="mt-page">
      <div className="mt-grid-bg" />

      <div className="mt-layout">
        {/* Sidebar */}
        <aside className="mt-sidebar">
          <div className="mt-sidebar-header">
            <div className="mt-logo-box">
              <span className="nv-logo-text">
                Meetz<span className="nv-accent">yy</span>
              </span>
            </div>
          </div>

          <div className="mt-sidebar-content custom-scroll">
            <div className="mt-nav-section">
              <p className="mt-nav-label">History</p>
              <div className="mt-meeting-list">
                {meetings.length > 0 ? (
                  meetings.map((curr, i) => (
                    <Link
                      to={`/meeting/${curr._id}`}
                      key={i}
                      className="mt-item-link"
                    >
                      <div className="mt-item-content">
                        <FileText size={16} className="mt-item-type-icon" />
                        <span className="mt-item-title">
                          {curr.title || "Untitled Meeting"}
                        </span>
                        <button
                          className="mt-item-delete"
                          onClick={(e) => handleDelete(e, curr._id)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="mt-empty-sidebar">
                    <Clock size={24} />
                    <p>No recent sessions</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-sidebar-footer">
            <div className="mt-user-pill">
              <div className="mt-avatar">{user?.name?.charAt(0) || "U"}</div>
              <span className="mt-username">{user?.name || "User"}</span>
            </div>
          </div>
        </aside>

        {/* Main Center */}
        <main className="mt-main">
          <div className="mt-hero-card">
            <div className={`mt-mic-glow ${isRecording ? "is-live" : ""}`}>
              <Mic size={40} strokeWidth={1.5} />
            </div>

            <h1 className="mt-hero-title">Meeting Room</h1>
            <p className="mt-hero-desc">
              {isRecording
                ? "Your AI is currently listening and transcribing. Join the live view to see insights."
                : "Ready to record? Meetzyy will capture audio and generate smart MOMs instantly."}
            </p>

            {!isRecording ? (
              <button
                className="mt-action-btn mt-primary"
                onClick={() => emitStart(user._id)}
              >
                <Play size={18} fill="currentColor" />
                <span>Start Session</span>
              </button>
            ) : (
              <button
                className="mt-action-btn mt-live"
                onClick={() => navigate(`/meeting/newmeeting/${meetingId}`)}
              >
                <span>Enter Live Room</span>
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Meeting;
