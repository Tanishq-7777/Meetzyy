import { useEffect, useState } from "react";
import useAuthStore from "../store/useAuthStore";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { BASE_URL } from "../../constants";
import {
  HelpCircle,
  Crown,
  LogOut,
  LogIn,
  Zap,
  ChevronRight,
} from "lucide-react";
import "./Navbar.css";

const Navbar = () => {
  const user = useAuthStore((store) => store.user);
  const isLoading = useAuthStore((store) => store.isLoading);
  const logout = useAuthStore((store) => store.logout);

  console.log(user);

  const handleLogout = async () => {
    try {
      await axios.post(
        BASE_URL + "/auth/logout",
        {},
        { withCredentials: true },
      );
      logout();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (isLoading) return null;

  return (
    <nav className="nv-navbar">
      <div className="nv-glow-line" />

      {/* Logo Section */}
      <Link to="/" className="nv-logo">
        <div className="nv-logo-icon">
          <Zap size={18} strokeWidth={2.5} fill="currentColor" />
        </div>
        <span className="nv-logo-text">
          Meetz<span className="nv-accent">yy</span>
        </span>
      </Link>

      {/* Navigation Right */}
      <div className="nv-nav-right">
        <a href="#help" className="nv-nav-link">
          <HelpCircle size={16} />
          <span>Help</span>
        </a>

        {user && (
          <Link to="/payment" className="nv-membership-tag">
            <Crown size={14} className="nv-crown" />
            <span>{user?.membershipType || "Free"}</span>
          </Link>
        )}

        {user && (
          <div className="nv-token-box">
            <Zap size={14} className="nv-token-icon" />
            <div className="nv-token-info">
              <span className="nv-token-value">
                {user?.remainingToken ?? 0}
              </span>
            </div>
          </div>
        )}

        <div className="nv-divider" />

        {user ? (
          <button onClick={handleLogout} className="nv-auth-btn nv-logout">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        ) : (
          <Link to="/login" className="nv-no-underline">
            <button className="nv-auth-btn nv-login">
              <span>Login</span>
              <LogIn size={16} />
            </button>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
