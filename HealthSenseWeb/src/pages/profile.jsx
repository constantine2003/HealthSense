import React, { useState, useEffect } from "react";
import Navbar from "../components/navbar2.jsx";
import "../styles/profile.css";
import { FiUser, FiMail, FiShield, FiMoon, FiSun, FiSave, FiLogOut, FiTrash2 } from "react-icons/fi";
import { supabase } from "../supabaseClient";
import { getProfile } from "../auth/getProfile";

const Profile = () => {
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState({
        fullName: "",
        email: "",
        recoveryEmail: "",
        isDarkMode: false
    });

    // Fetch real user data from Supabase (same logic as dashboard.jsx)
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                // Get current user
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError || !user) throw userError || new Error("No user found");

                // Fetch profile info using getProfile (should return { first_name, last_name, email })
                const profile = await getProfile(user.id);

                setUserData(prev => ({
                    ...prev,
                    fullName: `${profile.first_name} ${profile.last_name}`,
                    email: profile.email || user.email || "",
                }));
                setLoading(false);
            } catch (error) {
                console.error("Error loading profile", error);
                setLoading(false);
            }
        };
        fetchUserData();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setUserData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const handleSave = () => {
        alert(`Saved! Recovery Email: ${userData.recoveryEmail}, Dark Mode: ${userData.isDarkMode}`);
        // Add Supabase update logic here
    };

    // Get initials for Avatar
    const getInitials = (name) => {
        return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : "User";
    };

    return (
        <div className={`main-container ${userData.isDarkMode ? 'dark-theme' : ''}`}>
            <Navbar />
            
            <div className="profile-page-content">
                <div className="settings-container">
                    
                    {/* Header Section */}
                    <div className="settings-header">
                        <div className="avatar-circle">
                            {loading ? "..." : getInitials(userData.fullName)}
                        </div>
                        <div className="header-text">
                            <h2>Account Settings</h2>
                            <p>Manage your profile details and preferences</p>
                        </div>
                    </div>

                    {/* Main Form Section */}
                    <div className="settings-card">
                        
                        {/* Section: Personal Info */}
                        <div className="settings-section">
                            <h3 className="section-title"><FiUser className="icon" /> Personal Information</h3>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input 
                                        type="text" 
                                        name="fullName" 
                                        value={loading ? "Loading..." : userData.fullName} 
                                        disabled // READ ONLY
                                        className="input-disabled"
                                    />
                                    <span className="helper-text">Name cannot be changed. Contact support to update.</span>
                                </div>

                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input 
                                        type="email" 
                                        value={loading ? "..." : userData.email} 
                                        disabled // READ ONLY
                                        className="input-disabled"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="divider"></div>

                        {/* Section: Security & Preferences */}
                        <div className="settings-section">
                            <h3 className="section-title"><FiShield className="icon" /> Security & Preferences</h3>
                            
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

                            <div className="toggle-row">
                                <div className="toggle-info">
                                    <span className="toggle-label"><FiMoon className="icon" /> Dark Mode</span>
                                    <span className="toggle-desc">Switch between light and dark themes</span>
                                </div>
                                <label className="switch">
                                    <input 
                                        type="checkbox" 
                                        name="isDarkMode"
                                        checked={userData.isDarkMode} 
                                        onChange={handleChange}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="action-buttons">
                            <button className="btn-secondary">Change Password</button>
                            <button className="btn-primary" onClick={handleSave}>
                                <FiSave /> Save Changes
                            </button>
                        </div>
                    </div>

                    {/* Danger Zone 
                     <div className="danger-zone">
                        <div className="danger-text">
                            <h4>Delete Account</h4>
                            <p>Permanently remove your account and all data.</p>
                        </div>
                        <button className="btn-danger"><FiTrash2 /> Delete</button>
                    </div> */}

                </div>
            </div>
        </div>
    );
};

export default Profile;