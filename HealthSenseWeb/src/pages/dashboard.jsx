import React, { useState, useEffect } from "react";
import "../styles/dashboard.css";
import Navbar from "../components/navbar2";
import { useNavigate } from "react-router-dom";
import { FiClipboard, FiClock } from "react-icons/fi";
import SplashScreen from "../components/splashscreen";
import { getProfile } from "../auth/getProfile";
import { useAuth } from "../hooks/useAuth";

const Dashboard = () => {
  const navigate = useNavigate();

  // Get user and loading state from auth hook
  const { user, loading: authLoading } = useAuth();

  // Local splash screen while fetching profile
  const [splash, setSplash] = useState(true);

  // User full name state
  const [fullName, setFullName] = useState("");

  // Fetch profile once the user is available
  useEffect(() => {
    if (authLoading) return; // wait for auth to resolve
    if (!user) {
      navigate("/"); // redirect if not logged in
      return;
    }

    const fetchProfile = async () => {
      try {
        const profile = await getProfile(user.id);
        setFullName(`${profile.first_name} ${profile.last_name}`);
      } catch (err) {
        console.error("Failed to fetch profile:", err.message);
      }

      // Keep splash visible for 2 seconds even after profile is fetched
      setTimeout(() => setSplash(false), 2000);
    };

    fetchProfile();
  }, [authLoading, user, navigate]);

  // Show splash screen while auth or local splash is active
  if (authLoading || splash) return <SplashScreen />;

  return (
    <div className="main-container">
      <Navbar />
      <div className="dashboard-content">
        <div className="dashboard-box">
          <div className="dashboard-content-inner">
            <div className="dashboard-content-wrapper">
              <p className="welcome-user">Welcome</p>
              {fullName && (
                <p className="welcome-username">{fullName}</p>
              )}
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
