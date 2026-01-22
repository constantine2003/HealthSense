import React from "react";
import "../styles/dashboard.css";
import Navbar from "../components/navbar2";
import { useNavigate } from "react-router-dom";
import { FiClipboard, FiClock } from 'react-icons/fi';

const Dashboard = () => {
  const user = "Daniel M. Montesclaros"; // define a user for now
  const navigate = useNavigate(); 

  return (
    <div className="main-container">
      <Navbar />
      <div className="dashboard-content">
        <div className="dashboard-body">
          {/* Center Box */}
          <div className="dashboard-box">
            <p className="welcome-user">Welcome {user}!!!</p>
            <p className="description-text">Access your medical checkup results and history securely.</p>
            {/* Button Row */}
            <div className="dashboard-buttons">
              <button className="dashboard-btn" onClick={() => navigate("/results")}>
                <FiClipboard  size={100} color="#0077B6" className="btn-icon" />
                <div className="btn-text-container">
                  <span className="btn-label">View</span>
                  <span className="btn-title">Results</span>
                </div>
              </button>
              
              <button className="dashboard-btn" onClick={() => navigate("/history")}>
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
