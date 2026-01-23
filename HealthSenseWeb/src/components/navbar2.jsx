import React from "react";
import { useNavigate } from "react-router-dom";
import { FaUser } from "react-icons/fa";
import { FiLogOut } from "react-icons/fi";
import "../styles/navbar.css";

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
  // Clear session immediately
  localStorage.removeItem("userToken");

  // Navigate to the logout splash
  navigate("/logout-splash");
};

  return (
    <nav className="navbar">
      <div className="nav-left">
        <span className="logo">HealthSense</span>
      </div>

      <div className="nav-right">
        <button className="about-btn">
          <FaUser style={{ marginRight: "6px" }} />
          Profile
        </button>
        <button className="about-btn" onClick={handleLogout}>
          <FiLogOut style={{ marginRight: "6px" }} />
          Log-Out
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
