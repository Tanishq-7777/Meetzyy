import axios from "axios";
import { useState } from "react";
import useAuthStore from "../store/useAuthStore";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { BASE_URL } from "../../constants";
import { Mail, Lock, LogIn, ArrowRight } from "lucide-react";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [btnHover, setBtnHover] = useState(false);

  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || "/";

  const handleLogin = async () => {
    try {
      const { data } = await axios.post(
        BASE_URL + "/auth/login",
        { email, password },
        { withCredentials: true },
      );
      console.log(data.data);
      setUser(data.data);

      // ✅ redirect back
      navigate(from, { replace: true });
    } catch (error) {
      console.error(error.response?.data || error.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-grid-bg" />
      <div className="login-orb" />

      <div className="login-container">
        <header className="login-header">
          <div className="login-icon-wrapper">
            <LogIn size={28} className="login-header-icon" />
          </div>
          <h1 className="login-heading">Welcome back</h1>
          <p className="login-subtext">
            Login to continue your smart meeting experience.
          </p>
        </header>

        <div className="login-card">
          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input
              type="email"
              placeholder="Email address"
              className="login-input"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              type="password"
              placeholder="Password"
              className="login-input"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            className={`login-button ${btnHover ? "is-active" : ""}`}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            onClick={handleLogin}
          >
            <span>Login</span>
            <ArrowRight size={18} className="btn-arrow" />
          </button>

          <p className="login-footer-text">
            Don’t have an account?{" "}
            <Link to="/signup" className="login-link">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
