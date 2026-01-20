import React from "react";
import "../styles/dashboard.css";
import Navbar from "../components/navbar.jsx";

const Dashboard = () => {
  return (
    <div className="main-container">
      <Navbar />
      <div className="dashboard-content">
        <div className="dashboard-body">
          <h1 className="dashboard-title">Hello World</h1>
          <p className="dashboard-subtitle">Welcome to your Dashboard</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
