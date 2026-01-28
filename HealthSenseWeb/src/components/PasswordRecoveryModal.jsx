import React, { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FiX, FiMail, FiLock, FiCheckCircle } from "react-icons/fi";
import { supabase } from "../supabaseClient";
import "../styles/recovery.css";
const PasswordRecoveryModal = ({ isOpen, onClose }) => {
  const [recoveryStage, setRecoveryStage] = useState(1); // 1: Identity, 2: OTP, 3: Reset
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    // Reset internal state before closing
    setRecoveryStage(1);
    setRecoveryEmail("");
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    onClose();
  };

  const handleRequestOtp = async () => {
    setIsProcessing(true);
    setError("");
    const email = recoveryEmail.includes("@") ? recoveryEmail : `${recoveryEmail}@kiosk.local`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setError(error.message);
    } else {
      setRecoveryEmail(email);
      setRecoveryStage(2);
    }
    setIsProcessing(false);
  };

  const handleVerifyOtp = async () => {
    setIsProcessing(true);
    setError("");
    const { error } = await supabase.auth.verifyOtp({
      email: recoveryEmail,
      token: otpCode,
      type: 'recovery',
    });

    if (error) {
      setError("Invalid or expired code.");
    } else {
      setRecoveryStage(3);
    }
    setIsProcessing(false);
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsProcessing(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setError(error.message);
    } else {
      alert("Password updated successfully!");
      handleClose();
    }
    setIsProcessing(false);
  };

  return (
    <div className="hs-recovery-overlay">
      <div className="hs-recovery-modal">
        <div className="hs-recovery-header">
          <h3>Reset Password</h3>
          <button onClick={handleClose} className="hs-recovery-close"><FiX /></button>
        </div>

        <div className="hs-recovery-body">
          {error && <div className="hs-recovery-error">{error}</div>}

          {recoveryStage === 1 && (
            <div className="hs-recovery-step">
              <p>Enter your email/username to receive a code.</p>
              <div className="hs-recovery-input-wrapper">
                <FiMail className="hs-recovery-icon" />
                <input 
                  type="text" 
                  placeholder="Email or Username"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                />
              </div>
              <button className="hs-recovery-btn-primary" onClick={handleRequestOtp} disabled={isProcessing}>
                {isProcessing ? "Sending..." : "Send Code"}
              </button>
            </div>
          )}

          {recoveryStage === 2 && (
            <div className="hs-recovery-step">
              <p>Code sent to <strong>{recoveryEmail}</strong></p>
              <div className="hs-recovery-input-wrapper">
                <FiCheckCircle className="hs-recovery-icon" />
                <input 
                  type="text" 
                  placeholder="6-digit code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                />
              </div>
              <button className="hs-recovery-btn-primary" onClick={handleVerifyOtp} disabled={isProcessing}>
                {isProcessing ? "Verifying..." : "Verify Code"}
              </button>
            </div>
          )}

          {recoveryStage === 3 && (
            <div className="hs-recovery-step">
              <p>Set your new password below.</p>
              <div className="hs-recovery-input-wrapper">
                <FiLock className="hs-recovery-icon" />
                <input 
                  type={showPass ? "text" : "password"} 
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button className="hs-recovery-eye" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <div className="hs-recovery-input-wrapper">
                <FiLock className="hs-recovery-icon" />
                <input 
                  type={showPass ? "text" : "password"} 
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button className="hs-recovery-btn-primary" onClick={handleUpdatePassword} disabled={isProcessing}>
                {isProcessing ? "Update Password" : "Update Password"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordRecoveryModal;