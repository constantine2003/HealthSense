import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // 1. Add this import
import { FaFileMedical, FaHistory, FaBell, FaUserCircle, FaCalendarCheck, FaChevronRight } from "react-icons/fa";

const Dashboard: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const navigate = useNavigate(); // 2. Initialize the hook here
  // Connection Monitor (Same as Login for consistency)
  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-x-hidden relative">
      
      {/* HEADER: Matches Login UI */}
      <header className="w-full px-8 lg:px-16 py-6 flex justify-between items-center z-50">
        <div className="flex flex-col shrink-0">
          <span className="text-2xl font-bold text-[#139dc7] tracking-tighter uppercase">HealthSense</span>
          <span className="text-[10px] font-bold text-[#34A0A4] uppercase tracking-[0.2em] -mt-1">Patient Portal</span>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-6">
          {/* SYSTEM STATUS (Hidden on very small screens, but visible on your kiosk) */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/40 rounded-full border border-white/40 backdrop-blur-md shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-[10px] font-bold text-[#139dc7] uppercase tracking-wider">
              {isOnline ? 'System Online' : 'System Offline'}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* NOTIFICATIONS */}
            <button className="relative text-[#139dc7] hover:scale-110 transition-transform p-2">
              <FaBell size={22} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#eaf4ff]"></span>
            </button>

            {/* PROFILE BUTTON */}
            <button 
              onClick={() => navigate('/profile')} 
              className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-white/30 transition-all border border-transparent hover:border-white/40"
            >
              <div className="w-10 h-10 rounded-full bg-[#139dc7] flex items-center justify-center text-white font-bold border-2 border-white shadow-sm shrink-0">
                JA
              </div>
              <span className="hidden lg:block text-sm font-bold text-[#139dc7]">Profile</span>
            </button>

            {/* LOGOUT BUTTON - Styled as a semi-transparent glass button */}
            <button 
              onClick={() => navigate('/')} 
              className="ml-2 px-4 py-2 bg-white/20 backdrop-blur-md border border-[#139dc7]/30 rounded-xl text-[#139dc7] text-xs font-black uppercase tracking-widest hover:bg-[#139dc7] hover:text-white transition-all active:scale-95"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 lg:px-16 py-8">
        
        {/* WELCOME AREA */}
        <section className="mb-10 text-center lg:text-left">
          <h1 className="text-[clamp(32px,5vw,56px)] font-bold text-[#139dc7] m-0 leading-tight">
            Welcome,{" "}
            <span className="inline-block italic text-transparent bg-clip-text bg-gradient-to-r from-[#139dc7] to-[#34A0A4] pr-[0.3em] -mr-[0.3em]">
              Joy Arenas
            </span>
          </h1>
          <p className="text-[#139dc7] opacity-70 text-lg">Your health data is synchronized and ready for review.</p>
        </section>

        {/* QUICK STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          {[
            { label: 'Next Appointment', val: 'Oct 24, 2026', icon: <FaCalendarCheck />, color: 'from-white/60 to-white/30' },
            { label: 'Archived Records', val: '12 Reports', icon: <FaFileMedical />, color: 'from-white/60 to-white/30' },
            { label: 'Platform Status', val: 'V2.0 Active', icon: <FaHistory />, color: 'from-white/60 to-white/30' },
          ].map((stat, i) => (
            <div key={i} className={`bg-gradient-to-br ${stat.color} backdrop-blur-md p-6 rounded-[24px] border border-white/40 shadow-xl shadow-[#139dc7]/5 flex items-center gap-5 transition-transform hover:scale-[1.02]`}>
              <div className="text-[#139dc7] text-3xl opacity-80">{stat.icon}</div>
              <div>
                <p className="text-[10px] font-black text-[#139dc7]/50 uppercase tracking-widest m-0">{stat.label}</p>
                <p className="text-xl font-bold text-[#139dc7] m-0">{stat.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* PRIMARY ACTIONS: HUGE GLASS BUTTONS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          
          {/* VIEW LATEST */}
          <button className="group relative bg-white/30 backdrop-blur-xl p-10 rounded-[40px] border border-white/50 shadow-2xl shadow-blue-900/10 transition-all hover:-translate-y-2 hover:bg-white/40 flex flex-col items-start text-left overflow-hidden min-h-[320px]">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <FaFileMedical size={120} className="text-[#139dc7]" />
            </div>
            <div className="w-16 h-16 bg-[#139dc7] rounded-2xl flex items-center justify-center text-white shadow-lg mb-8 group-hover:rotate-6 transition-transform">
                <FaFileMedical size={32} />
            </div>
            <h2 className="text-4xl font-bold text-[#139dc7] mb-3">View Latest Results</h2>
            <p className="text-[#139dc7]/70 text-lg max-w-[300px] leading-relaxed">Instantly access your most recent diagnostic and laboratory data.</p>
            <div className="mt-auto flex items-center gap-2 font-bold text-[#139dc7] group-hover:gap-4 transition-all">
                Access Now <FaChevronRight />
            </div>
          </button>

          <button 
            onClick={() => navigate('/history')} // Added navigation logic
            className="group relative bg-gradient-to-br from-[#139dc7] to-[#34A0A4] p-10 rounded-[40px] shadow-2xl shadow-[#139dc7]/30 transition-all hover:-translate-y-2 flex flex-col items-start text-left overflow-hidden min-h-[320px] w-full"
          >
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform">
                <FaHistory size={120} className="text-white" />
            </div>
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-lg mb-8 group-hover:-rotate-6 transition-transform border border-white/30">
                <FaHistory size={32} />
            </div>
            <h2 className="text-4xl font-bold text-white mb-3">Checkup History</h2>
            <p className="text-white/80 text-lg max-w-[300px] leading-relaxed">
              Review previous consultations, medical trends, and archived files.
            </p>
            <div className="mt-auto flex items-center gap-2 font-bold text-white group-hover:gap-4 transition-all">
                Browse Archive <FaChevronRight />
            </div>
          </button>
        </div>

      </main>

      {/* FOOTER: Matches Login UI */}
      <footer className="w-full py-8 text-center mt-auto">
        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#139dc7] opacity-40">
          HealthSense Infrastructure v2.0
        </span>
      </footer>
    </div>
  );
};

export default Dashboard;