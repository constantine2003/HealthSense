import React, { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../styles/home.css";
import Navbar from "../components/navbar.jsx";
import { useNavigate } from "react-router-dom";
import { login } from "../auth/login"; 

const Home = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async () => {
    // Append @kiosk.local if not included
    const email = emailInput.includes("@") ? emailInput : `${emailInput}@kiosk.local`;
    const password = passwordInput;

    try {
      const user = await login(email, password);
      console.log("Logged in:", user);

      // Navigate immediately to dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error("Login failed:", err.message);
      alert("Login failed: " + err.message);
    }
  };

  return (
    <div className="main-container">
      <Navbar />
      <div className="page-content">
        <div className="left-div">
          <p className="welcome-text">Welcome to</p>
          <p className="logo-text">HealthSense</p>
          <p className="ddescription-text">
            View your health checkup results securely and conveniently online
          </p>
        </div>

        <div className="right-div">
          <div className="login-card">
            <div className="login-content">
              <h2 className="login-title">Welcome</h2>
              <p className="login-subtitle">
                Log in using your account to proceed
              </p>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="text"
                  placeholder="firstname.lastname"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="password-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                  />
                  <button
                    className="eye-btn"
                    type="button"
                    onClick={togglePasswordVisibility}
                    style={{ color: "#585756" }}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <button className="login-btn" onClick={handleLogin}>
                Log in
              </button>

              <a href="#" className="forgot-password">
                Forgot Password?
              </a>

              <p className="terms-text">
                By signing up, you agree to the <span className="terms-highlight">Terms of Service</span> and <span className="terms-highlight">Data Processing Agreement</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;