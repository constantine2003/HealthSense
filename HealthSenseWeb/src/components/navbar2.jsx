import React, { useState } from "react";
import "../styles/navbar.css";
import { useNavigate } from "react-router-dom";
import { FaUser } from "react-icons/fa"; // FontAwesome
import { FiLogOut } from "react-icons/fi"; // Feather Icons
import SplashScreen from "../components/splashscreen"; // adjust path

function Navbar() {
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(false);

  const handleLogout = () => {
    // Show splash overlay
    setShowSplash(true);

    // Clear session if needed
    // localStorage.removeItem("userToken");

    // Navigate to Home after splash duration
    setTimeout(() => {
      setShowSplash(false);
      navigate("/"); // go to Home page
    }, 1500); // match splash animation timing
  };

  return (
    <>
      {/* Full-page SplashScreen overlay */}
      {showSplash && (
        <div
          style={{
            position: "fixed",
            inset: 0,          // top:0; bottom:0; left:0; right:0
            zIndex: 9999,      // always on top
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#B6CCFE",
          }}
        >
          <SplashScreen />
        </div>
      )}

      {/* Navbar */}
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
    </>
  );
}

export default Navbar;
