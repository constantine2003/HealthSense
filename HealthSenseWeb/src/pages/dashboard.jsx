import React, { useState } from "react";
import "../styles/dashboard.css";
import Navbar from "../components/navbar2";
import { useNavigate } from "react-router-dom";
import { FiClipboard, FiClock } from 'react-icons/fi';
import SplashScreen from "../components/splashscreen"; // your animated splash

const Dashboard = () => {
  const user = "Daniel M. Montesclaros";
  const navigate = useNavigate();

  // State to show splash and target route
  const [splash, setSplash] = useState({ show: false, target: "" });

  const handleClick = (targetRoute) => {
    setSplash({ show: true, target: targetRoute });
    setTimeout(() => {
      navigate(targetRoute);
    }, 2000); // show splash for 2 seconds
  };

  // If splash is active, render it
  if (splash.show) return <SplashScreen />;

  return (
    <div className="main-container">
      <Navbar />
      <div className="dashboard-content">
        <div className="dashboard-body">
          <div className="dashboard-box">
            <p className="welcome-user">Welcome {user}!!!</p>
            <p className="description-text">
              "Access your medical checkup results and history securely."
            </p>

            <div className="dashboard-buttons">
              <button
                className="dashboard-btn"
                onClick={() => handleClick("/results")}
              >
                <FiClipboard size={100} color="#0077B6" className="btn-icon" />
                <div className="btn-text-container">
                  <span className="btn-label">View</span>
                  <span className="btn-title">Results</span>
                </div>
              </button>

              <button
                className="dashboard-btn"
                onClick={() => handleClick("/history")}
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
  );
};

export default Dashboard;
