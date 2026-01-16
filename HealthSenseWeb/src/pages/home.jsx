import React from "react";
import "../styles/home.css";  // make sure this exists
import Navbar from "../components/navbar.jsx"; // correct relative path

const Home = () => {
  return (
    <div className="main-container">
      <Navbar />
      <div className="page-content">
        <div className="left-div">
          <p className="welcome-text">Welcome to</p>
          <p className="logo-text">HealthSense</p>
          <p className="description-text">
            View your health checkup results securely and conveniently online
          </p>
        </div>

        <div className="right-div">
          <div className="login-card">
            log in div
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
