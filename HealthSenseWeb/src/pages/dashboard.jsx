import React, { useState, useEffect } from "react";
import "../styles/dashboard.css";
import Navbar from "../components/navbar2";
import { useNavigate } from "react-router-dom";
import SplashScreen from "../components/splashscreen";
import { getProfile } from "../auth/getProfile";
import { useAuth } from "../hooks/useAuth";

// --- Custom Fresh Dashboard SVGs ---

const ClipboardIcon = ({ size = 100, color = "#0077B6" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.5" /* Slightly thinner stroke for large scale icons looks more premium */
    strokeLinecap="round"
    strokeLinejoin="round"
    className="btn-icon"
  >
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M9 12h6" />
    <path d="M9 16h6" />
  </svg>
);

const HistoryIcon = ({ size = 100, color = "#0077B6" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="btn-icon"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
    <path d="M3.3 7a10 10 0 1 0 1.8-2.6L3 7" /> 
    <polyline points="3 2 3 7 8 7" />
  </svg>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [splash, setSplash] = useState(true);
  const [fullName, setFullName] = useState("");
  const [language, setLanguage] = useState("english");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/");
      return;
    }

    const fetchProfile = async () => {
      try {
        const profile = await getProfile(user.id);
        setFullName(`${profile.first_name} ${profile.last_name}`);
        if (profile.language) {
          const lang = profile.language.toLowerCase();
          setLanguage(lang === "tagalog" || lang === "tl" ? "tagalog" : "english");
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err.message);
      }
      setTimeout(() => setSplash(false), 2000);
    };

    fetchProfile();
  }, [authLoading, user, navigate]);

  if (authLoading || splash) return <SplashScreen />;

  return (
    <div className="main-container">
      <Navbar />
      <div className="dashboard-content">
        <div className="dashboard-box">
          <div className="dashboard-content-inner">
            <div className="dashboard-content-wrapper">
              <p className="welcome-user">
                {language === "tagalog" ? "Maligayang pagdating," : "Welcome,"} {fullName}
              </p>
              <p className="description-text">
                {language === "tagalog"
                  ? "I-access ang iyong mga resulta at kasaysayan ng medikal na pagsusuri nang ligtas."
                  : "Access your medical checkup results and history securely."}
              </p>

              <div className="dashboard-buttons">
                <button className="dashboard-btn" onClick={() => navigate("/results")}>
                  <ClipboardIcon />
                  <div className="btn-text-container">
                    <span className="btn-label">{language === "tagalog" ? "Tingnan" : "View"}</span>
                    <span className="btn-title">{language === "tagalog" ? "Mga Resulta" : "Results"}</span>
                  </div>
                </button>

                <button className="dashboard-btn" onClick={() => navigate("/history")}>
                  <HistoryIcon />
                  <div className="btn-text-container">
                    <span className="btn-label">{language === "tagalog" ? "Tingnan" : "View"}</span>
                    <span className="btn-title">{language === "tagalog" ? "Kasaysayan" : "History"}</span>
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