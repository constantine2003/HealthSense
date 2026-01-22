import React from "react";
import "../styles/dashboard.css";
import Navbar from "../components/navbar2";
import { useNavigate } from "react-router-dom";

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
              <button
                className="dashboard-btn"
                onClick={() => navigate("/results")}
              >
                View <br></br>Results
              </button>
              
              <button
                className="dashboard-btn"
                onClick={() => navigate("/history")}
              >
                View <br></br>History
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
