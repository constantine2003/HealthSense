import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaUserShield, FaLanguage, FaLock, FaArrowLeft, 
  FaCheckCircle, FaSpinner, FaExclamationTriangle,
  FaEye, FaEyeSlash // Add these
} from "react-icons/fa";
import { supabase } from "../supabaseClient";

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<boolean>(false);
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  // Profile States
  const [profile, setProfile] = useState<{
    first_name: string;
    middle_name: string;
    last_name: string;
    birthday: string;
    sex: string;
  } | null>(null);

  // Editable States
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [language, setLanguage] = useState<"English" | "Tagalog">("English");

  // Modal States
  const [showPassModal, setShowPassModal] = useState(false);
  const [passData, setPassData] = useState({ old: "", new: "", confirm: "" });
  const [passError, setPassError] = useState("");
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, middle_name, last_name, birthday, sex, recovery_email, language")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (data) {
          setProfile(data);
          setRecoveryEmail(data.recovery_email || "");
          setLanguage(data.language || "English");
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();

    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, [navigate]);

  const calculateAge = (birthday: string) => {
    if (!birthday) return "N/A";
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          recovery_email: recoveryEmail,
          language: language
        })
        .eq("id", user.id);

      if (error) throw error;

      setSaveStatus(true);
      setTimeout(() => setSaveStatus(false), 3000);
    } catch (err) {
      console.error("Error updating profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPassError("");
    
    // 1. Basic Validations
    if (!passData.old || !passData.new || !passData.confirm) {
      setPassError("All fields are required.");
      return;
    }
    if (passData.new !== passData.confirm) {
      setPassError("New passwords do not match.");
      return;
    }
    if (passData.new.length < 6) {
      setPassError("Password must be at least 6 characters.");
      return;
    }

    try {
      setPassLoading(true);

      // 2. VERIFY OLD PASSWORD
      // We get the user's email first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("User email not found.");

      // Attempt to sign in with the OLD password to verify it's correct
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passData.old,
      });

      if (signInError) {
        setPassError("The current password you entered is incorrect.");
        setPassLoading(false);
        return; 
      }

      // 3. IF OLD PASS IS CORRECT, UPDATE TO NEW PASS
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: passData.new 
      });

      if (updateError) throw updateError;

      // Success Handling
      setSaveStatus(true);
      setShowPassModal(false);
      setPassData({ old: "", new: "", confirm: "" });
      setTimeout(() => setSaveStatus(false), 3000);
      
    } catch (err: any) {
      setPassError(err.message || "An unexpected error occurred.");
    } finally {
      setPassLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eaf4ff]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#139dc7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#139dc7] font-bold animate-pulse">Loading Account Settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-x-hidden relative">
      
      {/* HEADER */}
      <header className="w-full px-8 lg:px-16 py-6 flex justify-between items-center z-50">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-[#139dc7] font-bold hover:gap-4 transition-all"
        >
          <FaArrowLeft /> Back to Dashboard
        </button>
        
        {/* <div className="flex items-center gap-2 px-3 py-1 bg-white/40 rounded-full border border-white/40 backdrop-blur-md">
          <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-[10px] font-bold text-[#139dc7] uppercase tracking-wider">
            {isOnline ? 'System Online' : 'System Offline'}
          </span>
        </div> */}
      </header>

      <main className="flex-1 w-full max-w-225 mx-auto px-6 lg:px-12 pb-12 flex flex-col justify-center">
        <section className="flex flex-col items-center lg:items-start mb-10 gap-4">
          <div className="text-center lg:text-left">
            <h1 className="text-5xl font-black text-[#139dc7] m-0 tracking-tight italic">Account Settings</h1>
            <p className="text-[11px] font-black text-[#139dc7]/40 uppercase tracking-[0.3em] mt-2">Manage your profile details and preferences</p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8">
          
          {/* PERSONAL INFORMATION - Using the high-contrast White/70 card style */}
          <section className="relative bg-white/70 backdrop-blur-xl rounded-4xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 transition-all hover:shadow-[0_20px_40px_rgba(19,157,199,0.1)]">
            <div className="flex items-center gap-4 mb-8 text-[#0a4d61]">
              <div className="w-12 h-12 bg-[#139dc7]/10 rounded-2xl flex items-center justify-center text-[#139dc7]">
                <FaUserShield size={24} />
              </div>
              <h2 className="text-2xl font-extrabold">Personal Information</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {[
                { label: "Full Name", value: `${profile?.first_name} ${profile?.middle_name ? profile.middle_name + ' ' : ''}${profile?.last_name}` },
                { label: "Birthdate", value: profile?.birthday ? new Date(profile.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "N/A" },
                { label: "Age", value: profile ? calculateAge(profile.birthday) : "--" },
                { label: "Sex", value: profile?.sex || "N/A" }
              ].map((item, i) => (
                <div key={i} className="bg-white/50 border border-white p-5 rounded-2xl shadow-sm hover:bg-white transition-colors group">
                  <label className="text-[10px] font-black text-[#139dc7] uppercase mb-2 tracking-tight opacity-50 block">{item.label}</label>
                  <p className="text-lg font-bold text-[#0a4d61] leading-none uppercase">{item.value}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-8 flex items-center gap-3 text-[11px] font-bold italic text-[#139dc7]/60 bg-[#139dc7]/5 p-4 rounded-2xl border border-[#139dc7]/10">
              <span className="w-2 h-2 bg-[#139dc7] rounded-full animate-pulse" />
              Personal information is locked for security. Contact medical support to update records.
            </div>
          </section>

          {/* SECURITY & PREFERENCES */}
          <section className="bg-white/70 backdrop-blur-xl rounded-4xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 transition-all hover:shadow-[0_20px_40px_rgba(19,157,199,0.1)]">
            <div className="flex items-center gap-4 mb-10 text-[#0a4d61]">
              <div className="w-12 h-12 bg-[#139dc7]/10 rounded-2xl flex items-center justify-center text-[#139dc7]">
                <FaLanguage size={24} />
              </div>
              <h2 className="text-2xl font-extrabold">Security & Preferences</h2>
            </div>

            <div className="space-y-10">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-[#139dc7] uppercase ml-2 tracking-widest">Recovery Email</label>
                <input 
                  type="email" 
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="yourname@email.com"
                  className="w-full h-16 bg-white/50 border border-white rounded-3xl px-8 text-[#0a4d61] font-bold text-lg outline-none focus:bg-white focus:shadow-xl focus:border-[#139dc7]/30 transition-all placeholder:text-gray-300"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[11px] font-black text-[#139dc7] uppercase ml-2 tracking-widest">Language Preference</label>
                <div className="flex gap-4">
                  {["English", "Tagalog"].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang as any)}
                      className={`flex-1 h-14 rounded-2xl font-black uppercase tracking-widest transition-all text-xs border-2 ${
                        language === lang 
                        ? "bg-[#139dc7] border-[#139dc7] text-white shadow-lg shadow-[#139dc7]/30" 
                        : "bg-white/50 border-white text-[#139dc7] hover:bg-white shadow-sm"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setShowPassModal(true)}
                className="group flex items-center gap-3 text-[#139dc7] font-black uppercase text-[10px] tracking-[0.2em] hover:text-[#0a4d61] transition-all pt-2"
              >
                <div className="w-8 h-8 rounded-full bg-[#139dc7]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FaLock size={12} />
                </div>
                Change Access Password
              </button>
            </div>
          </section>

          {/* SAVE BUTTON */}
          <button 
            onClick={handleSave}
            disabled={saveStatus || saving}
            className={`w-full h-18 rounded-[28px] font-black text-sm uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-4 ${
              saveStatus 
              ? "bg-green-500 text-white" 
              : "bg-[#139dc7] text-white hover:bg-[#0a4d61] hover:-translate-y-1 active:scale-95 shadow-[#139dc7]/30 disabled:opacity-50"
            }`}
          >
            {saving ? (
              <FaSpinner className="animate-spin" size={20} />
            ) : saveStatus ? (
              <><FaCheckCircle size={20} /> Changes Saved</>
            ) : (
              "Synchronize Profile"
            )}
          </button>
        </div>
      </main>

      {/* CHANGE PASSWORD MODAL */}
      {showPassModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#001b2e]/40 backdrop-blur-xl transition-all">
          <div className="bg-white/95 w-full max-w-md rounded-[40px] shadow-2xl border border-white/50 p-10 relative animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black text-[#0a4d61] mb-2">Update Password</h2>
            <p className="text-[#139dc7]/60 text-sm mb-8 font-medium">Ensure your account stays secure.</p>

            <div className="space-y-4">
              {/* Current Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[#139dc7]/40 ml-2">Current Password</label>
                <div className="relative">
                  <input 
                    type={showOldPass ? "text" : "password"}
                    className="w-full h-12 bg-white border border-[#139dc7]/10 rounded-2xl px-5 pr-12 text-[#0a4d61] outline-none focus:border-[#139dc7] transition-all"
                    value={passData.old}
                    onChange={(e) => setPassData({...passData, old: e.target.value})}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#139dc7]/40 hover:text-[#139dc7] transition-colors"
                  >
                    {showOldPass ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[#139dc7]/40 ml-2">New Password</label>
                <div className="relative">
                  <input 
                    type={showNewPass ? "text" : "password"}
                    className="w-full h-12 bg-white border border-[#139dc7]/10 rounded-2xl px-5 pr-12 text-[#0a4d61] outline-none focus:border-[#139dc7] transition-all"
                    value={passData.new}
                    onChange={(e) => setPassData({...passData, new: e.target.value})}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#139dc7]/40 hover:text-[#139dc7] transition-colors"
                  >
                    {showNewPass ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[#139dc7]/40 ml-2">Confirm New Password</label>
                <div className="relative">
                  <input 
                    type={showConfirmPass ? "text" : "password"}
                    className="w-full h-12 bg-white border border-[#139dc7]/10 rounded-2xl px-5 pr-12 text-[#0a4d61] outline-none focus:border-[#139dc7] transition-all"
                    value={passData.confirm}
                    onChange={(e) => setPassData({...passData, confirm: e.target.value})}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#139dc7]/40 hover:text-[#139dc7] transition-colors"
                  >
                    {showConfirmPass ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                  </button>
                </div>
              </div>

              {passError && (
                <div className="bg-red-50 text-red-500 text-[11px] font-bold p-3 rounded-xl border border-red-100 flex items-center gap-2 animate-pulse">
                  <FaExclamationTriangle /> {passError}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => { 
                    setShowPassModal(false); 
                    setPassError("");
                    // Reset eye toggles when closing
                    setShowOldPass(false);
                    setShowNewPass(false);
                    setShowConfirmPass(false);
                  }}
                  className="flex-1 h-14 rounded-2xl font-bold text-[#139dc7] border border-[#139dc7]/20 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleChangePassword}
                  disabled={passLoading}
                  className="flex-1 h-14 rounded-2xl font-bold bg-[#139dc7] text-white hover:bg-[#0a4d61] shadow-lg shadow-blue-200 transition-all flex items-center justify-center"
                >
                  {passLoading ? <FaSpinner className="animate-spin" /> : "Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="w-full py-8 text-center mt-auto">
        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#139dc7] opacity-40">
          HealthSense Infrastructure v2.0
        </span>
      </footer>
    </div>
  );
};

export default Profile;