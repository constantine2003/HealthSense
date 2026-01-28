import React from "react";
import { useNavigate } from "react-router-dom";
import { FaUser } from "react-icons/fa";
import { FiLogOut, FiHome } from "react-icons/fi";
import "../styles/navbar.css";
import { supabase } from "../supabaseClient"; // import Supabase client

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Only navigate to splash, let splash handle logout and redirect
    navigate("/logout-splash");
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <span className="logo">HealthSense</span>
      </div>

      <div className="nav-right">
        <button className="about-btn" onClick={() => navigate("/dashboard") }>
          <FiHome style={{ marginRight: "6px" }} />
          Home
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
