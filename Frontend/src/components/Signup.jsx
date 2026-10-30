import axios from "axios";
import { useEffect, useState } from "react";
import useAuthStore from "../store/useAuthStore";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { BASE_URL } from "../../constants";
import { User, Mail, Lock, UserPlus, ArrowRight } from "lucide-react";
import "./Signup.css";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [btnHover, setBtnHover] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const handleSignup = async () => {
    try {
      const { data } = await axios.post(
        BASE_URL + "/auth/signup",
        { name, email, password },
        { withCredentials: true },
      );

      setUser(data.data);
      navigate(from, { replace: true });
    } catch (error) {
      console.error(error.response?.data || error.message);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-grid-bg" />
      <div className="signup-orb" />

      <div className="signup-container">
        <header className="signup-header">
          <div className="signup-icon-wrapper">
            <UserPlus size={28} className="signup-header-icon" />
          </div>
          <h1 className="signup-heading">
            Create your <span className="accent-text">account</span>
          </h1>
          <p className="signup-subtext">
            Start transforming your meetings into smart insights.
          </p>
        </header>

        <div className="signup-card">
          <div className="input-group">
            <User size={18} className="input-icon" />
            <input
              type="text"
              placeholder="Your full name"
              className="signup-input"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input
              type="email"
              placeholder="Email address"
              className="signup-input"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              type="password"
              placeholder="Create password"
              className="signup-input"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            className={`signup-button ${btnHover ? "is-active" : ""}`}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            onClick={handleSignup}
          >
            <span>Sign Up</span>
            <ArrowRight size={18} className="btn-arrow" />
          </button>

          <p className="signup-footer-text">
            Already have an account?{" "}
            <Link to="/login" className="signup-link">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
