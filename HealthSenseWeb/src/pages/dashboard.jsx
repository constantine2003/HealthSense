import React from "react";
import "../styles/dashboard.css";
import Navbar from "../components/navbar2";

const Dashboard = () => {
  const user = "John Doe"; // define a user for now

  return (
    <div className="main-container">
      <Navbar />
      <div className="dashboard-content">
        <div className="dashboard-body">
          {/* Center Box */}
          <div className="dashboard-box">
            <p className="welcome-user">Welcome {user}!!</p>
            
            {/* Button Row */}
            <div className="dashboard-buttons">
              <button className="dashboard-btn">View Last Results</button>
              <button className="dashboard-btn">View Checkup History</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
