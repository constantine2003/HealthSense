import React, { useState, useEffect } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../styles/home.css";
import Navbar from "../components/navbar.jsx";
import { useNavigate } from "react-router-dom";
import { login } from "../auth/login";
import { useAuth } from "../hooks/useAuth";
import PasswordRecoveryModal from "../components/PasswordRecoveryModal";

const Home = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth(); // check session

  const [showPassword, setShowPassword] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  // Redirect immediately if user is already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [loading, user, navigate]);

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const handleLogin = async () => {
    const email = emailInput.includes("@") ? emailInput : `${emailInput}@kiosk.local`;
    const password = passwordInput;

    setLoginError("");
    try {
      const loggedInUser = await login(email, password);
      console.log("Logged in:", loggedInUser);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login failed:", err.message);
      setLoginError(err.message || "Invalid email or password. Please try again");
    }
  };


  if (loading) return null;


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
              <p className="login-subtitle">Log in using your account to proceed</p>
              <div className="form-group">
                {loginError && (
                  <div className="login-error" role="alert">{loginError}</div>
                )}
                <label htmlFor="email-input">Email</label>
                <input
                  id="email-input"
                  className="login-input"
                  type="text"
                  placeholder="firstname.lastname"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="password-input">Password</label>
                <div className="password-wrapper">
                  <input
                    id="password-input"
                    type={showPassword ? "text" : "password"}
                    className="login-input"
                    placeholder="Password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                  />
                  <button
                    className="eye-btn"
                    type="button"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              <button className="login-btn" onClick={handleLogin}>
                Log in
              </button>
              <a
                href="#"
                className="forgot-password"
                onClick={(e) => {
                  e.preventDefault();
                  setIsModalOpen(true);
                }}
              >
                Forgot Password?
              </a>
              <p className="terms-text">
                By signing up, you agree to the{' '}
                <span className="terms-highlight">Terms of Service</span> and{' '}
                <span className="terms-highlight">Data Processing Agreement</span>
              </p>
            </div>
          </div>
        </div>
        <PasswordRecoveryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        />
      </div>
    </div>
  );
};

export default Home;
