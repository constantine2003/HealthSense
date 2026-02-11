import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/navbar.css";

// --- Custom Modern SVGs ---

const UserIcon = () => (
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
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
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

  const btnContentStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <span className="logo">HealthSense</span>
      </div>

      <div className="nav-right">
        <button className="about-btn" onClick={() => navigate("/profile")}>
          <div style={btnContentStyle}>
            <UserIcon />
            <span>Account</span>
          </div>
        </button>

        <button className="about-btn" onClick={handleLogout}>
          <div style={btnContentStyle}>
            <LogoutIcon />
            <span>Log-Out</span>
          </div>
        </button>
      </div>
    </nav>
  );
}

export default Navbar;