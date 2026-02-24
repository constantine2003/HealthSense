import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaUserShield, FaShieldAlt, FaLock, FaArrowLeft, 
  FaCheckCircle, FaSpinner, FaExclamationTriangle,
  FaEye, FaEyeSlash // Add these
} from "react-icons/fa";
import { supabase } from "../supabaseClient";

const Profile: React.FC = () => {
  const navigate = useNavigate();
  // const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
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
    username: string;
  } | null>(null);

  // Editable States
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [largeText, setLargeText] = useState<boolean>(false);
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
          .select("first_name, middle_name, last_name, birthday, sex, recovery_email, language, username")
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

    // const updateStatus = () => setIsOnline(navigator.onLine);
    // window.addEventListener("online", updateStatus);
    // window.addEventListener("offline", updateStatus);
    // return () => {
    //   window.removeEventListener("online", updateStatus);
    //   window.removeEventListener("offline", updateStatus);
    // };
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

  const content = {
    English: {
      back: "Back to Dashboard",
      title: "Account Settings",
      desc: "Manage profile & viewing preferences",
      personal: "Personal Information",
      sync: "Synchronize Profile"
    },
    Tagalog: {
      back: "Bumalik sa Dashboard",
      title: "Ayos ng Account",
      desc: "Pamahalaan ang profile at mga kagustuhan",
      personal: "Impormasyon ng Personal",
      sync: "I-sync ang Profile"
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-x-hidden relative">
      
      {/* HEADER */}
      <header className="w-full px-8 lg:px-16 py-6 flex justify-between items-center z-50">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-[#139dc7] font-black uppercase text-[10px] tracking-widest hover:gap-4 transition-all group"
        >
          <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" /> 
          {language === 'Tagalog' ? 'Bumalik sa Dashboard' : 'Back to Dashboard'}
        </button>
        
        {/* <div className="flex items-center gap-2 px-3 py-1 bg-white/40 rounded-full border border-white/40 backdrop-blur-md">
          <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-[10px] font-bold text-[#139dc7] uppercase tracking-wider">
            {isOnline ? 'System Online' : 'System Offline'}
          </span>
        </div> */}
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-12 flex flex-col justify-center min-h-[calc(100vh-80px)] py-0">
        {/* HEADER - Tighter for mobile */}
        <section className="flex flex-col items-center lg:items-start mb-4 lg:mb-4 gap-1">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl sm:text-5xl font-black text-[#139dc7] m-0 tracking-tight italic">Account Settings</h1>
            <p className="text-[9px] sm:text-[11px] font-black text-[#139dc7]/40 uppercase tracking-[0.3em] mt-1">Manage profile & preferences</p>
          </div>
        </section>

        {/* RESPONSIVE GRID: 1 Column on Mobile, 2 Columns on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
          
          {/* LEFT SIDE: PERSONAL INFORMATION (7/12 Width) */}
          <section className="lg:col-span-7 relative bg-white/70 backdrop-blur-xl rounded-4xl lg:rounded-4xl border border-white shadow-sm p-6 lg:p-10 transition-all hover:shadow-md">
            <div className="flex items-center gap-4 mb-6 lg:mb-8 text-[#0a4d61]">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#139dc7]/10 rounded-2xl flex items-center justify-center text-[#139dc7]">
                <FaUserShield size={20} className="lg:text-[24px]" />
              </div>
              <h2 className="text-xl lg:text-2xl font-extrabold">Personal Info</h2>
            </div>
            
            {/* 2-column grid inside the card for mobile too */}
            <div className="grid grid-cols-2 gap-3 lg:gap-6">
              {[
                { label: "Full Name", value: `${profile?.first_name} ${profile?.last_name}`, full: true },
                { label: "Birthdate", value: profile?.birthday ? new Date(profile.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A" },
                { label: "Age", value: profile ? calculateAge(profile.birthday) : "--" },
                { label: "Sex", value: profile?.sex || "N/A" },
                { label: "Patient ID", value: profile?.username || "...", full: true }
              ].map((item, i) => (
                <div key={i} className={`bg-white/50 border border-white p-4 lg:p-5 rounded-2xl hover:bg-white transition-colors ${item.full ? 'col-span-2' : 'col-span-1'}`}>
                  <label className="text-[8px] lg:text-[10px] font-black text-[#139dc7] uppercase mb-1 tracking-tight opacity-50 block">{item.label}</label>
                  <p className="text-sm lg:text-lg font-bold text-[#0a4d61] leading-tight uppercase truncate">{item.value}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex items-center gap-3 text-[10px] font-bold italic text-[#139dc7]/60 bg-[#139dc7]/5 p-4 rounded-2xl border border-[#139dc7]/10">
              <span className="w-2 h-2 bg-[#139dc7] rounded-full animate-pulse" />
              Identity data is locked for security.
            </div>
          </section>

          {/* RIGHT SIDE: PREFERENCES & SAVE (5/12 Width) */}
          <div className="lg:col-span-5 flex flex-col gap-4 lg:gap-6">
            
            {/* PORTAL PREFERENCES */}
            <section className="bg-white/70 backdrop-blur-xl rounded-4xl lg:rounded-4xl border border-white shadow-sm p-5 lg:p-7 flex-1">
              <div className="flex items-center gap-4 mb-4 lg:mb-6 text-[#0a4d61]">
                <div className="w-10 h-10 lg:w-11 lg:h-11 bg-[#139dc7]/10 rounded-2xl flex items-center justify-center text-[#139dc7]">
                  <FaShieldAlt size={20} />
                </div>
                <h2 className="text-xl lg:text-2xl font-extrabold tracking-tight">Preferences</h2>
              </div>

              <div className="space-y-5 lg:space-y-6">
                {/* LARGE TEXT TOGGLE */}
                <div className="flex items-center justify-between p-4 bg-white/40 rounded-2xl border border-white/50">
                  <div className="flex items-center gap-3">
                    <FaEye className="text-[#139dc7]" size={18} />
                    <h3 className="text-xs lg:text-sm font-black text-[#0a4d61] uppercase">Large Text</h3>
                  </div>
                  <button 
                    onClick={() => setLargeText(!largeText)}
                    className={`w-11 h-6 lg:w-13 lg:h-7 rounded-full transition-all relative ${largeText ? 'bg-[#139dc7]' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 lg:w-5 lg:h-5 bg-white rounded-full shadow transition-all ${largeText ? 'left-6 lg:left-7' : 'left-1'}`} />
                  </button>
                </div>

                {/* MEASUREMENT UNITS */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#139dc7] uppercase ml-2 tracking-widest opacity-70">Measurement Units</label>
                  <div className="flex gap-2">
                    {["Metric", "Imperial"].map((unitChoice) => (
                      <button
                        key={unitChoice}
                        onClick={() => setUnits(unitChoice.toLowerCase() as 'metric' | 'imperial')}
                        className={`flex-1 h-10 lg:h-11 rounded-xl font-black uppercase text-[10px] border-2 transition-all ${
                          units === unitChoice.toLowerCase() 
                          ? "bg-[#139dc7] border-[#139dc7] text-white shadow-md" 
                          : "bg-white/50 border-white text-[#139dc7] hover:bg-white"
                        }`}
                      >
                        {unitChoice === "Metric" ? "kg/cm" : "lb/in"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* LANGUAGE CHOICE - Now identical CSS to Measurement Units */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#139dc7] uppercase ml-2 tracking-widest opacity-70">Language</label>
                  <div className="flex gap-2">
                    {["English", "Tagalog"].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setLanguage(lang as any)}
                        className={`flex-1 h-10 lg:h-11 rounded-xl font-black uppercase text-[10px] border-2 transition-all ${
                          language === lang 
                          ? "bg-[#139dc7] border-[#139dc7] text-white shadow-md" 
                          : "bg-white/50 border-white text-[#139dc7] hover:bg-white"
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <button 
                    onClick={() => setShowPassModal(true)}
                    className="group flex items-center gap-2 text-[#139dc7] font-black uppercase text-[9px] tracking-[0.2em] px-4 py-2 rounded-xl transition-all hover:bg-[#139dc7]/5 active:scale-95"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#139dc7]/10 flex items-center justify-center group-hover:bg-[#139dc7] group-hover:text-white transition-colors">
                      <FaLock size={10} />
                    </div>
                    <span className="border-b border-transparent group-hover:border-[#139dc7] transition-all">
                      Update Security Password
                    </span>
                  </button>
                </div>
              </div>
            </section>

            {/* SAVE BUTTON */}
            <button 
              onClick={handleSave}
              disabled={saveStatus || saving}
              className={`w-full h-14 lg:h-16 rounded-3xl lg:rounded-[28px] font-black text-xs lg:text-sm uppercase tracking-[0.3em] shadow-xl transition-all flex items-center justify-center gap-4 ${
                saveStatus 
                ? "bg-green-500 text-white" 
                : "bg-[#139dc7] text-white hover:bg-[#0a4d61] hover:-translate-y-1 active:scale-95 shadow-[#139dc7]/30"
              }`}
            >
              {saving ? (
                <FaSpinner className="animate-spin" size={18} />
              ) : saveStatus ? (
                <><FaCheckCircle size={18} /> Changes Applied</>
              ) : (
                "Synchronize Profile"
              )}
            </button>
          </div>
        </div>
      </main>

      {/* CHANGE PASSWORD MODAL */}
      {showPassModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-[#001b2e]/40 backdrop-blur-xl transition-all">
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