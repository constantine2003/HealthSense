import React, { useState } from "react";
import "../styles/profile.css";

const ChangePasswordModal = ({ isOpen, onClose, onSubmit, loading }) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    onSubmit({ oldPassword, newPassword, setError });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Change Password</h3>
          <button className="close-modal-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="password-wrapper">
              <input
                type="password"
                placeholder="Current Password"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="password-wrapper">
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="password-wrapper">
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {error && <div style={{ color: "#d32f2f", fontSize: 14 }}>{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Saving..." : "Change Password"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
