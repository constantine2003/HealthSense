import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { supabase } from "../supabaseClient";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPass.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPass !== confirmPass) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;

      setIsSuccess(true);
      setTimeout(() => navigate("/"), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }; 

  useEffect(() => {
    // Supabase automatically handles the session recovery via the URL fragment
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
        console.log("Password recovery mode active");
        } else if (!session && event !== "INITIAL_SESSION") {
        // If they try to visit this page without a valid reset link
        navigate("/");
        }
    });
    }, [navigate]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] p-6">
      <div className="bg-white/30 backdrop-blur-2xl rounded-[40px] border border-white/50 shadow-2xl p-10 w-full max-w-md animate-in zoom-in-95 duration-300">
        
        {isSuccess ? (
          <div className="text-center space-y-4 py-10">
            <FaCheckCircle size={60} className="text-green-500 mx-auto animate-bounce" />
            <h2 className="text-2xl font-black text-[#0a4d61]">Password Updated!</h2>
            <p className="text-[#139dc7]/60">Returning to login screen...</p>
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-black text-[#139dc7] tracking-tighter uppercase italic">Set New Password</h2>
              <p className="text-[10px] font-bold text-[#139dc7]/40 uppercase tracking-widest mt-2">Secure your HealthSense account</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input 
                  type={showPass ? "text" : "password"}
                  placeholder="New Password"
                  className="w-full h-14 bg-white/50 border border-white rounded-2xl px-6 outline-none focus:bg-white transition-all"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <input 
                type={showPass ? "text" : "password"}
                placeholder="Confirm New Password"
                className="w-full h-14 bg-white/50 border border-white rounded-2xl px-6 outline-none focus:bg-white transition-all"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 text-xs font-bold p-4 rounded-xl border border-red-100 flex items-center gap-2">
                <FaExclamationTriangle /> {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full h-16 bg-[#139dc7] text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-[#0a4d61] transition-all disabled:opacity-50"
            >
              {loading ? "Updating..." : "Confirm Change"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;