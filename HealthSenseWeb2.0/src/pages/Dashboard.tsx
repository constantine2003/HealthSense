import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaFileMedical, FaHistory, FaChevronRight } from "react-icons/fa";
import { supabase } from "../supabaseClient"; 

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // State for user data
  const [userData, setUserData] = useState<{
    first_name: string;
    middle_name?: string;
    last_name: string;
    language?: "English" | "Tagalog";
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<"English" | "Tagalog">("English");
  // const [hasFetched, setHasFetched] = useState(false); // Add this
  // Translation Object
  const content = {
    English: {
      sync: "Syncing Dashboard",
      auth: "Authenticating HealthSense Infrastructure...",
      profile: "Profile",
      logout: "Logout",
      welcome: "Welcome,",
      subWelcome: "Everything is saved. You can look at your results now.",
      viewLatestTop: "View Latest",
      viewLatestBottom: "Results",
      viewLatestDesc: "Instantly access your most recent diagnostic and laboratory data.",
      accessNow: "Access Now",
      historyTop: "Checkup",
      historyBottom: "History",
      historyDesc: "Review previous consultations, medical trends, and archived files.",
      browse: "Browse Archive",
      footer: "HealthSense Operations v2.0"
    },
    Tagalog: {
      sync: "Sini-sync ang Dashboard",
      auth: "Sinisigurado ang Infrastructure ng HealthSense...",
      profile: "Profile",
      logout: "Mag-logout",
      welcome: "Maligayang pagdating,",
      subWelcome: "Naka-save ang lahat. Maaari mo nang tingnan ang iyong mga resulta.",
      viewLatestTop: "Pinakabagong",
      viewLatestBottom: "na Resulta",
      viewLatestDesc: "Agad na i-access ang iyong pinakabagong diagnostic at laboratory data.",
      accessNow: "I-access Ngayon",
      historyTop: "Kasaysayan",
      historyBottom: "ng Checkup",
      historyDesc: "Suriin ang mga nakaraang konsultasyon at mga naka-archive na file.",
      browse: "I-browse ang Archive",
      footer: "HealthSense Operations v2.0"
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      // 1. Start a timer immediately
      const timer = new Promise((resolve) => setTimeout(resolve, 800));

      try {
        // 2. Start the Supabase fetch
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          navigate("/");
          return;
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("first_name, middle_name, last_name, language")
          .eq("id", session.user.id)
          .single();

        if (profileError) console.error("Profile Error:", profileError.message);

        if (data) {
          setUserData(data);
          if (data.language) setLanguage(data.language as "English" | "Tagalog");
        }
      } catch (err) {
        console.error("System Error:", err);
      } finally {
        // 3. WAIT for the 1.5s timer to finish before hiding the loading screen
        // This ensures the eye-friendly delay happens even if the data is instant
        await timer;
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  // LOGOUT LOGIC
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/"); 
    } catch (error: any) {
      console.error("Error logging out:", error.message);
      navigate("/"); 
    }
  };

  // Helper function to format the name
  const formatDisplayName = () => {
    if (!userData) return "Patient";
    const middleInitial = userData.middle_name 
      ? ` ${userData.middle_name.charAt(0)}.` 
      : "";
    return `${userData.first_name}${middleInitial} ${userData.last_name}`;
  };

  // Helper for the initials
  const getInitials = () => {
    if (!userData) return "??";
    return `${userData.first_name.charAt(0)}${userData.last_name.charAt(0)}`;
  };

  // FULL SCREEN LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eaf4ff] font-['Lexend']">
        <div className="text-center animate-in fade-in duration-500">
          {/* Spinner Group - Always visible immediately */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-[#139dc7]/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-[#139dc7] border-t-transparent rounded-full animate-spin"></div>
          </div>
          
          {/* Static Neutral Text - No more language flipping */}
          <h2 className="text-2xl font-black text-[#139dc7] tracking-tight mb-2">
            Loading Dashboard
          </h2>
          {/* <p className="text-[#139dc7]/60 font-bold uppercase tracking-widest text-[10px] animate-pulse">
            Authenticating HealthSense Infrastructure...
          </p> */}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-x-hidden relative animate-in fade-in duration-700">
      
      {/* HEADER */}
      <header className="w-full px-6 lg:px-16 py-6 flex justify-between items-center z-50 shrink-0">
        {/* LOGO SECTION - Now scales down on smaller screens */}
        <div className="flex flex-col shrink-0">
          <span className="text-lg sm:text-2xl font-black text-[#139dc7] tracking-tighter uppercase transition-all">
            HealthSense
          </span>
          <span className="text-[8px] sm:text-[10px] font-bold text-[#34A0A4] uppercase tracking-[0.2em] -mt-1 transition-all">
            Patient Portal
          </span>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Profile Button - Responsive padding and font */}
          <button 
            onClick={() => navigate('/profile')} 
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 bg-white/20 backdrop-blur-md border border-[#139dc7]/30 rounded-lg sm:rounded-xl text-[#139dc7] hover:bg-[#139dc7] hover:text-white transition-all active:scale-95 group"
          >
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#139dc7] group-hover:bg-white flex items-center justify-center text-[8px] sm:text-[10px] text-white group-hover:text-[#139dc7] font-bold border border-white/50 transition-colors shrink-0">
              {getInitials()}
            </div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-tight sm:tracking-widest">
              {content[language].profile}
            </span>
          </button>

          {/* Logout Button - Responsive padding and font */}
          <button 
            onClick={handleLogout} 
            className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-white/20 backdrop-blur-md border border-[#139dc7]/30 rounded-lg sm:rounded-xl text-[#139dc7] text-[10px] sm:text-xs font-black uppercase tracking-tight sm:tracking-widest hover:bg-[#139dc7] hover:text-white transition-all active:scale-95"
          >
            {content[language].logout}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 w-full max-w-360 mx-auto px-6 lg:px-16 py-8">
        
        {/* WELCOME AREA */}
        <section className="mb-10 text-center lg:text-left">
          <h1 className="text-[clamp(32px,5vw,56px)] font-bold text-[#139dc7] m-0 leading-tight">
            {content[language].welcome}{" "}
            <span className="inline-block italic text-transparent bg-clip-text bg-linear-to-r from-[#139dc7] to-[#34A0A4] pr-[0.3em] -mr-[0.3em]">
              {formatDisplayName()}
            </span>
          </h1>
          <p className="text-[#139dc7] opacity-70 text-lg">
            {content[language].subWelcome}
          </p>
        </section>

        {/* PRIMARY ACTIONS */}
        <div className="grid grid-cols-2 gap-4 sm:gap-8 mb-10">
          {/* VIEW LATEST */}
          <button 
            onClick={() => navigate('/results')} 
            className="group relative bg-white/70 backdrop-blur-xl p-6 sm:p-10 rounded-[30px] sm:rounded-[40px] border border-white shadow-[0_20px_50_rgba(0,0,0,0.05)] transition-all hover:-translate-y-2 hover:bg-white/90 flex flex-col items-start text-left overflow-hidden min-h-62.5 sm:min-h-80 active:scale-95"
          >
              <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
                  <FaFileMedical className="text-[#139dc7] text-6xl sm:text-[120px]" />
              </div>
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#139dc7] rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 mb-4 sm:mb-8 group-hover:rotate-6 transition-transform">
                  <FaFileMedical className="text-xl sm:text-3xl" />
              </div>
              <h2 className="text-xl sm:text-4xl font-black text-[#0a4d61] mb-2 sm:mb-3 leading-tight">
                {content[language].viewLatestTop} 
                <br/> 
                {content[language].viewLatestBottom}
              </h2>
              <p className="hidden md:block text-[#139dc7]/70 text-base lg:text-lg max-w-75 leading-relaxed font-medium">
                {content[language].viewLatestDesc}
              </p>
              <div className="mt-auto flex items-center gap-2 font-black text-[#139dc7] uppercase text-[10px] sm:text-sm tracking-widest group-hover:gap-4 transition-all">
                {content[language].accessNow} <FaChevronRight />
              </div>
          </button>

          {/* CHECKUP HISTORY */}
          <button 
            onClick={() => navigate('/history')}
            className="group relative bg-linear-to-br from-[#139dc7] to-[#34A0A4] p-6 sm:p-10 rounded-[30px] sm:rounded-[40px] shadow-2xl shadow-[#139dc7]/30 transition-all hover:-translate-y-2 flex flex-col items-start text-left overflow-hidden min-h-62.5 sm:min-h-80 w-full active:scale-95"
          >
            <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-20 group-hover:scale-110 transition-transform">
                <FaHistory className="text-white text-6xl sm:text-[120px]" />
            </div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg mb-4 sm:mb-8 group-hover:-rotate-6 transition-transform border border-white/30">
                <FaHistory className="text-xl sm:text-3xl" />
            </div>
            <h2 className="text-xl sm:text-4xl font-bold text-white mb-2 sm:mb-3 leading-tight">
              {content[language].historyTop} 
              <br/> 
              {content[language].historyBottom}
            </h2>
            <p className="hidden md:block text-white/80 text-base lg:text-lg max-w-75 leading-relaxed">
              {content[language].historyDesc}
            </p>
            <div className="mt-auto flex items-center gap-2 font-bold text-white text-[10px] sm:text-sm group-hover:gap-4 transition-all uppercase tracking-widest">
              {content[language].browse} <FaChevronRight />
            </div>
          </button>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="w-full py-8 text-center mt-auto">
        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#139dc7] opacity-40">
          {content[language].footer}
        </span>
      </footer>
    </div>
  );
};

export default Dashboard;