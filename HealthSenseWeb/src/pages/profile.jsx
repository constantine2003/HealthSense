// Format birthday from YYYY-MM-DD to 'Month Day Year' (e.g., December 23 2002)

import React, { useState, useEffect } from "react";
import Navbar from "../components/navbar3.jsx";
import "../styles/profile.css";
// Added FaEye, FaEyeSlash for password toggle, FiX for close button
import { FiUser, FiMail, FiShield, FiSave, FiX } from "react-icons/fi";
import { FaEye, FaEyeSlash } from "react-icons/fa"; 
import { supabase } from "../supabaseClient";
import { getProfile } from "../auth/getProfile";
import SplashScreen from "../components/splashscreen";
import { useNavigate } from "react-router-dom";

function formatBirthday(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date)) return dateString;
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
}

function calculateAge(dateString) {
  if (!dateString) return "";
  const birthDate = new Date(dateString);
  if (isNaN(birthDate)) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
const Profile = () => {
  const navigate = useNavigate();
  const [splash, setSplash] = useState(true);
  const [loading, setLoading] = useState(true);
  
  // Profile Data State
  const [userData, setUserData] = useState({
    fullName: "",
    email: "",
    recoveryEmail: "",
    birthday: "",
    sex: "",
  });

  // --- MODAL STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [passwords, setPasswords] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  // State to toggle visibility for individual fields
  const [showPass, setShowPass] = useState({
    old: false,
    new: false,
    confirm: false,
  });

  // Fetch user profile
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/"); 
          return;
        }

        const profile = await getProfile(user.id);
        setUserData({
          fullName: `${profile.first_name} ${profile.last_name}`,
          email: profile.email || user.email || "",
          recoveryEmail: profile.recovery_email || "",
          birthday: profile.birthday || "",
          sex: profile.sex || "",
        });
        setTimeout(() => {
          setSplash(false);
          setLoading(false);
        }, 2000);
      } catch (err) {
        console.error("Failed to fetch profile:", err.message);
        navigate("/");
      }
    };
    fetchUserData();
  }, [navigate]);

  // Handle Profile Inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Password Inputs
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  // Toggle Eye Visibility
  const togglePassVisibility = (field) => {
    setShowPass((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  // Save Recovery Email with inline status message
  const [saveStatus, setSaveStatus] = useState({ message: "", type: "" }); // type: 'success' | 'error' | ''
  const handleSave = async () => {
    setSaveStatus({ message: "", type: "" });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { error } = await supabase
        .from("profiles")
        .update({ recovery_email: userData.recoveryEmail })
        .eq("id", user.id);

      if (error) throw error;
      setSaveStatus({ message: "Recovery email updated successfully!", type: "success" });
    } catch (err) {
      setSaveStatus({ message: "Failed to save recovery email: " + (err.message || err), type: "error" });
    }
  };

  // Handle Password Save (with Supabase verification) and inline status
  const [passwordStatus, setPasswordStatus] = useState({ message: "", type: "", field: "" }); // type: 'success' | 'error', field: 'old' | 'confirm' | ''
  const handleSavePassword = async () => {
    setPasswordStatus({ message: "", type: "", field: "" });
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordStatus({ message: "New passwords do not match!", type: "error", field: "confirm" });
      return;
    }
    if (passwords.newPassword.length < 6) {
      setPasswordStatus({ message: "Password must be at least 6 characters.", type: "error", field: "confirm" });
      return;
    }
    try {
      // Get current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw sessionError || new Error("No session found");
      const userEmail = session.user.email;
      // Re-authenticate with old password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: passwords.oldPassword,
      });
      if (signInError) {
        setPasswordStatus({ message: "Old password is incorrect.", type: "error", field: "old" });
        return;
      }
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwords.newPassword,
      });
      if (updateError) throw updateError;
      setPasswordStatus({ message: "Password changed successfully!", type: "success", field: "confirm" });
      setTimeout(() => {
        closeModal();
      }, 1200);
    } catch (err) {
      setPasswordStatus({ message: "Failed to change password: " + (err.message || err), type: "error", field: "confirm" });
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" }); // Reset fields
    setShowPass({ old: false, new: false, confirm: false }); // Reset eyes
  };

  const getInitials = (name) => {
    return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "User";
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
                  {/* <span className="helper-text">
                    Name cannot be changed. Contact support to update.
                  </span> */}
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={loading ? "..." : userData.email}
                    disabled
                    className="input-disabled"
                  />
                  {/* <span className="helper-text">
                    Email cannot be changed.
                  </span> */}
                </div>
                <div className="form-group">
                  <label>Birthdate</label>
                  <input
                    type="text"
                    value={loading ? "..." : (userData.birthday ? formatBirthday(userData.birthday) : "")}
                    disabled
                    className="input-disabled"
                  />
                </div>
                <div className="form-group">
                  <label>Age</label>
                  <input
                    type="text"
                    value={loading ? "..." : (userData.birthday ? calculateAge(userData.birthday) : "")}
                    disabled
                    className="input-disabled"
                  />
                </div>
                <div className="form-group">
                  <label>Sex</label>
                  <input
                    type="text"
                    value={loading ? "..." : userData.sex}
                    disabled
                    className="input-disabled"
                  />
                  <span className="helper-text">
                    Personal information cannot be changed. Contact support to update.
                  </span>
                </div>
              </div>
            </div>

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
                {saveStatus.message && (
                  <div className={`save-status-message ${saveStatus.type}`}>
                    {saveStatus.message}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button 
                className="btn-secondary" 
                onClick={() => setIsModalOpen(true)}
              >
                Change Password
              </button>
              <button className="btn-primary" onClick={handleSave}>
                <FiSave /> Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- CHANGE PASSWORD MODAL --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Change Password</h3>
              <button className="close-modal-btn" onClick={closeModal}>
                <FiX />
              </button>
            </div>
            
            <div className="modal-body">
              {/* Old Password */}
              <div className="form-group">
                <label>Old Password</label>
                <div className="password-wrapper">
                  <input
                    type={showPass.old ? "text" : "password"}
                    name="oldPassword"
                    placeholder="Enter current password"
                    value={passwords.oldPassword}
                    onChange={handlePasswordChange}
                  />
                  <button
                    className="eye-btn"
                    type="button"
                    onClick={() => togglePassVisibility("old")}
                  >
                    {showPass.old ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {passwordStatus.message && passwordStatus.field === "old" && (
                  <div className={`save-status-message ${passwordStatus.type}`}>{passwordStatus.message}</div>
                )}
              </div>

              {/* New Password */}
              <div className="form-group">
                <label>New Password</label>
                <div className="password-wrapper">
                  <input
                    type={showPass.new ? "text" : "password"}
                    name="newPassword"
                    placeholder="Enter new password"
                    value={passwords.newPassword}
                    onChange={handlePasswordChange}
                  />
                  <button
                    className="eye-btn"
                    type="button"
                    onClick={() => togglePassVisibility("new")}
                  >
                    {showPass.new ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label>Confirm New Password</label>
                <div className="password-wrapper">
                  <input
                    type={showPass.confirm ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Re-enter new password"
                    value={passwords.confirmPassword}
                    onChange={handlePasswordChange}
                  />
                  <button
                    className="eye-btn"
                    type="button"
                    onClick={() => togglePassVisibility("confirm")}
                  >
                    {showPass.confirm ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {passwordStatus.message && passwordStatus.field === "confirm" && (
                  <div className={`save-status-message ${passwordStatus.type}`}>{passwordStatus.message}</div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSavePassword}>
                Save Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;