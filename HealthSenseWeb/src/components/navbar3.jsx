import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/navbar.css";

// --- Custom Fresh SVGs ---

const HomeIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const LogoutIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

// --- Navbar Component ---

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/logout-splash");
  };

  // Modern flex layout for the button content
  const btnInnerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <span className="logo">HealthSense</span>
      </div>

      <div className="nav-right">
        <button className="about-btn" onClick={() => navigate("/dashboard")}>
          <div style={btnInnerStyle}>
            <HomeIcon />
            <span>Home</span>
          </div>
        </button>

        <button className="about-btn" onClick={handleLogout}>
          <div style={btnInnerStyle}>
            <LogoutIcon />
            <span>Log-Out</span>
          </div>
        </button>
      </div>
    </nav>
  );
}

export default Navbar;