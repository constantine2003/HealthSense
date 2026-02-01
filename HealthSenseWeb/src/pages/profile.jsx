import React, { useState, useEffect } from "react";
import Navbar from "../components/navbar3.jsx";
import "../styles/profile.css";
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
    language: "English",
  });

  // Language state for localization
  const [language, setLanguage] = useState("english");

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
          language: profile.language || "English",
        });
        // Set language state for localization
        if (profile.language) {
          const lang = profile.language.toLowerCase();
          if (lang === "tagalog" || lang === "tl") {
            setLanguage("tagalog");
          } else {
            setLanguage("english");
          }
        } else {
          setLanguage("english");
        }
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
        .update({
          recovery_email: userData.recoveryEmail,
          language: userData.language // Ensure this column exists in your Supabase 'profiles' table
        })
        .eq("id", user.id);

      if (error) throw error;
      setSaveStatus({ message: "Settings updated successfully!", type: "success" });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setSaveStatus({ message: "Failed to save: " + (err.message || err), type: "error" });
    }
  };

  // Handle Password Save (with Supabase verification) and inline status
  const [passwordStatus, setPasswordStatus] = useState({ message: "", type: "", field: "" }); // type: 'success' | 'error', field: 'old' | 'confirm' | ''
  const handleSavePassword = async () => {
    setPasswordStatus({ message: "", type: "", field: "" });
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordStatus({ 
        message: language === "tagalog" ? "Hindi magkatugma ang mga bagong password!" : "New passwords do not match!", 
        type: "error", 
        field: "confirm" 
      });
      return;
    }
    if (passwords.newPassword.length < 6) {
      setPasswordStatus({ 
        message: language === "tagalog" ? "Ang password ay dapat hindi bababa sa 6 na karakter." : "Password must be at least 6 characters.", 
        type: "error", 
        field: "confirm" 
      });
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
        setPasswordStatus({ 
          message: language === "tagalog" ? "Mali ang lumang password." : "Old password is incorrect.", 
          type: "error", 
          field: "old" 
        });
        return;
      }
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwords.newPassword,
      });
      if (updateError) throw updateError;
      setPasswordStatus({ 
        message: language === "tagalog" ? "Matagumpay na nabago ang password!" : "Password changed successfully!", 
        type: "success", 
        field: "confirm" 
      });
      setTimeout(() => {
        closeModal();
        window.location.reload();
      }, 1200);
    } catch (err) {
      setPasswordStatus({ 
        message: (language === "tagalog" ? "Nabigong palitan ang password: " : "Failed to change password: ") + (err.message || err), 
        type: "error", 
        field: "confirm" 
      });
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
              <h2>{language === "tagalog" ? "Mga Setting ng Account" : "Account Settings"}</h2>
              <p>{language === "tagalog" ? "I-manage ang iyong detalye ng profile at mga kagustuhan" : "Manage your profile details and preferences"}</p>
            </div>
          </div>

          <div className="settings-card">
            {/* Personal Info */}
            <div className="settings-section">
              <h3 className="section-title">
                <FiUser className="icon" /> {language === "tagalog" ? "Personal na Impormasyon" : "Personal Information"}
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

                {/* <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={loading ? "..." : userData.email}
                    disabled
                    className="input-disabled"
                  />
                  <span className="helper-text">
                    Email cannot be changed.
                  </span>
                </div> */}
                <div className="form-group">
                  <label>{language === "tagalog" ? "Araw ng Kapanganakan" : "Birthdate"}</label>
                  <input
                    type="text"
                    value={loading ? "..." : (userData.birthday ? formatBirthday(userData.birthday) : "")}
                    disabled
                    className="input-disabled"
                  />
                </div>
                <div className="form-group">
                  <label>{language === "tagalog" ? "Edad" : "Age"}</label>
                  <input
                    type="text"
                    value={loading ? "..." : (userData.birthday ? calculateAge(userData.birthday) : "")}
                    disabled
                    className="input-disabled"
                  />
                </div>
                <div className="form-group">
                  <label>{language === "tagalog" ? "Kasarian" : "Sex"}</label>
                  <input
                    type="text"
                    value={loading ? "..." : userData.sex}
                    disabled
                    className="input-disabled"
                  />
                  <span className="helper-text">
                    {language === "tagalog"
                      ? "Hindi maaaring baguhin ang personal na impormasyon. Makipag-ugnayan sa support para mag-update."
                      : "Personal information cannot be changed. Contact support to update."}
                  </span>
                </div>
              </div>
            </div>

            {/* Security & Preferences */}
            <div className="settings-section">
              <h3 className="section-title">
                <FiShield className="icon" /> {language === "tagalog" ? "Seguridad at mga Kagustuhan" : "Security & Preferences"}
              </h3>

              <div className="form-group">
                <label>{language === "tagalog" ? "Backup Email" : "Recovery Email"}</label>
                <div className="input-with-icon">
                  <FiMail className="input-icon" />
                  <input
                    type="email"
                    name="recoveryEmail"
                    placeholder={language === "tagalog" ? "Maglagay ng backup na email address" : "Enter a backup email address"}
                    value={userData.recoveryEmail}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label>{language === "tagalog" ? "Wika" : "Language Preference"}</label>
                <select
                  name="language"
                  value={userData.language}
                  onChange={handleChange}
                  className="language-dropdown custom-select"
                  style={{ width: '100%', padding: '10px 16px', borderRadius: 12, border: '1px solid #ddd', fontSize: 15, background: '#f7fbff', color: '#333', fontFamily: 'Lexend, sans-serif', marginTop: 4, backgroundPosition: 'right 14px center', backgroundRepeat: 'no-repeat', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23999\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")' }}
                >
                  <option value="English" className="language-dropdown-item">English</option>
                  <option value="Tagalog" className="language-dropdown-item">Tagalog</option>
                </select>
                
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
                {language === "tagalog" ? "Palitan ang Password" : "Change Password"}
              </button>
              <button className="btn-primary" onClick={handleSave}>
                <FiSave /> {language === "tagalog" ? "I-save ang mga Pagbabago" : "Save Changes"}
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
              <h3>{language === "tagalog" ? "Palitan ang Password" : "Change Password"}</h3>
              <button className="close-modal-btn" onClick={closeModal}>
                <FiX />
              </button>
            </div>
            
            <div className="modal-body">
              {/* Old Password */}
              <div className="form-group">
                <label>{language === "tagalog" ? "Lumang Password" : "Old Password"}</label>
                <div className="password-wrapper">
                  <input
                    type={showPass.old ? "text" : "password"}
                    name="oldPassword"
                    placeholder={language === "tagalog" ? "Ilagay ang kasalukuyang password" : "Enter current password"}
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
                <label>{language === "tagalog" ? "Bagong Password" : "New Password"}</label>
                <div className="password-wrapper">
                  <input
                    type={showPass.new ? "text" : "password"}
                    name="newPassword"
                    placeholder={language === "tagalog" ? "Ilagay ang bagong password" : "Enter new password"}
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
                <label>{language === "tagalog" ? "Kumpirmahin ang Bagong Password" : "Confirm New Password"}</label>
                <div className="password-wrapper">
                  <input
                    type={showPass.confirm ? "text" : "password"}
                    name="confirmPassword"
                    placeholder={language === "tagalog" ? "Ilagay muli ang bagong password" : "Re-enter new password"}
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
                {language === "tagalog" ? "Kanselahin" : "Cancel"}
              </button>
              <button className="btn-primary" onClick={handleSavePassword}>
                {language === "tagalog" ? "I-save ang Password" : "Save Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;