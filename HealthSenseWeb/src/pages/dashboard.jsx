import React, { useState, useEffect } from "react";
import "../styles/dashboard.css";
import Navbar from "../components/navbar2";
import { useNavigate } from "react-router-dom";
import { FiClipboard, FiClock } from "react-icons/fi";
import SplashScreen from "../components/splashscreen";
import { supabase } from "../supabaseClient";
import { getProfile } from "../auth/getProfile";

const Dashboard = () => {
  const navigate = useNavigate();

  // Splash screen state (for initial load)
  const [splash, setSplash] = useState(true);

  // User full name state
  const [fullName, setFullName] = useState("");

  // Check if user is logged in and fetch profile
  useEffect(() => {
    const initialize = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      try {
        const profile = await getProfile(user.id);
        setFullName(`${profile.first_name} ${profile.last_name}`);
      } catch (err) {
        console.error("Failed to fetch profile:", err.message);
      }

      // Keep splash for 2 seconds even after fetching data
      setTimeout(() => {
        setSplash(false);
      }, 2000);
    };

    initialize();
  }, [navigate]);

  // Show splash screen on initial load
  if (splash) return <SplashScreen />;

  return (
    <div className="main-container">
      <Navbar />
      <div className="dashboard-content">
        <div className="dashboard-box">
          <div className="dashboard-content-inner">
            <div className="dashboard-content-wrapper">
              <p className="welcome-user">
                {fullName ? `Welcome ${fullName}!!!` : "Welcome!"}
              </p>
              <p className="description-text">
                "Access your medical checkup results and history securely."
              </p>

              <div className="dashboard-buttons">
                <button
                  className="dashboard-btn"
                  onClick={() => navigate("/results")}
                >
                  <FiClipboard size={100} color="#0077B6" className="btn-icon" />
                  <div className="btn-text-container">
                    <span className="btn-label">View</span>
                    <span className="btn-title">Results</span>
                  </div>
                </button>

                <button
                  className="dashboard-btn"
                  onClick={() => navigate("/history")}
                >
                  <FiClock size={100} color="#0077B6" className="btn-icon" />
                  <div className="btn-text-container">
                    <span className="btn-label">View</span>
                    <span className="btn-title">History</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
