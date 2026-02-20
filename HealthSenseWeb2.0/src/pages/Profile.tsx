import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserShield, FaLanguage, FaLock, FaArrowLeft, FaCheckCircle } from "react-icons/fa";

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [language, setLanguage] = useState<"English" | "Tagalog">("English");
  const [saveStatus, setSaveStatus] = useState<boolean>(false);

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  const handleSave = () => {
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 3000);
  };

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
        
        <div className="flex items-center gap-2 px-3 py-1 bg-white/40 rounded-full border border-white/40 backdrop-blur-md">
          <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-[10px] font-bold text-[#139dc7] uppercase tracking-wider">
            {isOnline ? 'System Online' : 'System Offline'}
          </span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-225 mx-auto px-6 lg:px-12 pb-12 flex flex-col justify-center">
        
        {/* PROFILE HERO */}
        <section className="flex flex-col items-center lg:items-start mb-10 gap-4">
           <div className="w-24 h-24 rounded-4xl bg-[#139dc7] flex items-center justify-center text-white text-4xl font-bold shadow-2xl border-4 border-white">
              JA
           </div>
           <div className="text-center lg:text-left">
              <h1 className="text-4xl font-bold text-[#139dc7] m-0">Account Settings</h1>
              <p className="text-[#139dc7]/60">Manage your profile details and preferences</p>
           </div>
        </section>

        <div className="grid grid-cols-1 gap-8">
          
          {/* PERSONAL INFORMATION (READ ONLY) */}
          <section className="relative bg-white/20 backdrop-blur-2xl rounded-4xl border border-white/30 p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6 text-[#139dc7]">
                <FaUserShield size={20} />
                <h2 className="text-xl font-bold">Personal Information</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                    { label: "Full Name", value: "Joy Arenas" },
                    { label: "Birthdate", value: "May 12, 1998" },
                    { label: "Age", value: "28" },
                    { label: "Sex", value: "Female" }
                ].map((item, i) => (
                    <div key={i} className="space-y-1">
                        <label className="text-[11px] font-bold text-[#139dc7]/50 uppercase tracking-widest">{item.label}</label>
                        <p className="text-lg font-semibold text-[#139dc7] bg-white/10 p-3 rounded-xl border border-white/10 uppercase">{item.value}</p>
                    </div>
                ))}
            </div>
            <p className="mt-6 text-xs italic text-[#139dc7]/60 bg-blue-500/5 p-3 rounded-lg border border-blue-500/10">
                Personal information cannot be changed. Contact support to update.
            </p>
          </section>

          {/* SECURITY & PREFERENCES (EDITABLE) */}
          <section className="bg-white/20 backdrop-blur-2xl rounded-4xl border border-white/30 p-8 shadow-xl">
             <div className="flex items-center gap-3 mb-8 text-[#139dc7]">
                <FaLanguage size={20} />
                <h2 className="text-xl font-bold">Security & Preferences</h2>
            </div>

            <div className="space-y-8">
                {/* RECOVERY EMAIL */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-[#139dc7]">Recovery Email</label>
                    <input 
                        type="email" 
                        placeholder="joy.arenas@email.com"
                        className="w-full h-14 bg-white/10 border-2 border-[#139dc7]/20 rounded-2xl px-5 text-[#139dc7] placeholder:text-[#139dc7]/30 outline-none focus:border-[#139dc7] transition-all"
                    />
                </div>

                {/* LANGUAGE PREFERENCE */}
                <div className="space-y-3">
                    <label className="text-sm font-bold text-[#139dc7]">Language Preference</label>
                    <div className="flex gap-4">
                        {["English", "Tagalog"].map((lang) => (
                            <button
                                key={lang}
                                onClick={() => setLanguage(lang as any)}
                                className={`flex-1 py-3 rounded-2xl font-bold transition-all border-2 ${
                                    language === lang 
                                    ? "bg-[#139dc7] border-[#139dc7] text-white shadow-lg" 
                                    : "bg-white/10 border-[#139dc7]/20 text-[#139dc7] hover:bg-white/20"
                                }`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>
                </div>

                {/* CHANGE PASSWORD */}
                <button className="flex items-center gap-2 text-[#139dc7] font-black uppercase text-xs tracking-widest hover:underline pt-2">
                    <FaLock /> Change Password
                </button>
            </div>
          </section>

          {/* SAVE BUTTON */}
          <button 
            onClick={handleSave}
            disabled={saveStatus}
            className={`w-full h-16 rounded-3xl font-bold text-xl shadow-2xl transition-all flex items-center justify-center gap-3 ${
                saveStatus 
                ? "bg-green-500 text-white" 
                : "bg-linear-to-r from-[#139dc7] to-[#34A0A4] text-white hover:-translate-y-1 active:scale-95"
            }`}
          >
            {saveStatus ? <><FaCheckCircle /> Changes Saved</> : "Save Changes"}
          </button>
        </div>
      </main>

      <footer className="w-full py-8 text-center mt-auto">
        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#139dc7] opacity-40">
          HealthSense Infrastructure v2.0
        </span>
      </footer>
    </div>
  );
};

export default Profile;