import React from "react";
import { useNavigate } from "react-router-dom";
import { FaUser } from "react-icons/fa";
import { FiLogOut } from "react-icons/fi";
import "../styles/navbar.css";
import { supabase } from "../supabaseClient"; // import Supabase client

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Sign out using Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Optional: clear any local storage if used
      localStorage.removeItem("userToken");

      // Navigate to login page or a splash
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err.message);
      alert("Failed to log out. Try again.");
    }
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
