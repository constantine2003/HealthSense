import React, { useState, useEffect } from "react";
import Navbar from "../components/navbar2.jsx";
import "../styles/profile.css";
import { FiUser, FiMail, FiShield, FiSave } from "react-icons/fi";
import { supabase } from "../supabaseClient";
import { getProfile } from "../auth/getProfile";
import SplashScreen from "../components/splashscreen";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();

  // Splash/loading state
  const [splash, setSplash] = useState(true);

  // Loading and user data
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({
    fullName: "",
    email: "",
    recoveryEmail: "",
  });

  // Fetch user profile
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/"); // redirect if not logged in
          return;
        }

        const profile = await getProfile(user.id);
        console.log("Fetched profile:", profile);

        setUserData({
          fullName: `${profile.first_name} ${profile.last_name}`,
          email: profile.email || user.email || "",
          recoveryEmail: profile.recovery_email || "",
        });

        // Keep splash for 2 seconds
        setTimeout(() => {
          setSplash(false);
          setLoading(false);
        }, 2000);
      } catch (err) {
        console.error("Failed to fetch profile:", err.message);
        navigate("/"); // redirect if error
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not found");

      // Update recovery email
      const { error } = await supabase
        .from("profiles")
        .update({ recovery_email: userData.recoveryEmail })
        .eq("id", user.id);

      if (error) throw error;
      alert("Recovery email updated successfully!");
    } catch (err) {
      alert("Failed to save recovery email: " + (err.message || err));
    }
  };

  const getInitials = (name) => {
    return name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "User";
  };

  if (splash) return <SplashScreen />;

  return (
    <div className="main-container">
      <Navbar />

      <div className="profile-page-content">
        <div className="settings-container">
          <div className="settings-header">
            <div className="avatar-circle">
              {loading ? "..." : getInitials(userData.fullName)}
            </div>
            <div className="header-text">
              <h2>Account Settings</h2>
              <p>Manage your profile details and preferences</p>
            </div>
          </div>

          <div className="settings-card">
            {/* Personal Info */}
            <div className="settings-section">
              <h3 className="section-title">
                <FiUser className="icon" /> Personal Information
              </h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={loading ? "Loading..." : userData.fullName}
                    disabled
                    className="input-disabled"
                  />
                  <span className="helper-text">
                    Name cannot be changed. Contact support to update.
                  </span>
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={loading ? "..." : userData.email}
                    disabled
                    className="input-disabled"
                  />
                </div>
              </div>
            </div>

            {/* <div className="divider"></div> */}

            {/* Security & Preferences */}
            <div className="settings-section">
              <h3 className="section-title">
                <FiShield className="icon" /> Security & Preferences
              </h3>

              <div className="form-group">
                <label>Recovery Email</label>
                <div className="input-with-icon">
                  <FiMail className="input-icon" />
                  <input
                    type="email"
                    name="recoveryEmail"
                    placeholder="Enter a backup email address"
                    value={userData.recoveryEmail}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button className="btn-primary" onClick={handleSave}>
                <FiSave /> Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
