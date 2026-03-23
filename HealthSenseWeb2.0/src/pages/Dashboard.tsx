import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaFileMedical, FaHistory, FaChevronRight, FaSignOutAlt } from "react-icons/fa";
import { supabase } from "../supabaseClient";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [userData, setUserData] = useState<{
    first_name: string;
    middle_name?: string;
    last_name: string;
    language?: "English" | "Tagalog";
    units?: string;
    large_text?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<"English" | "Tagalog">("English");
  const [hovered, setHovered] = useState<"results" | "history" | null>(null);

  const content = {
    English: {
      profile: "Profile", logout: "Logout",
      welcome: "Welcome back,", sub: "Your health data is ready to review.",
      resultsLabel: "Latest Results", resultsDesc: "View your most recent checkup diagnostics and vitals report.",
      resultsAction: "Open Report",
      historyLabel: "Checkup History", historyDesc: "Browse your past checkups, trends, and archived records.",
      historyAction: "View Archive",
      footer: "HealthSense Operations v2.0",
      tagline: "Patient Portal",
    },
    Tagalog: {
      profile: "Profile", logout: "Mag-logout",
      welcome: "Maligayang pagdating,", sub: "Handa na ang iyong mga health data para suriin.",
      resultsLabel: "Pinakabagong Resulta", resultsDesc: "Tingnan ang iyong pinakabagong diagnostic at vital signs.",
      resultsAction: "Buksan ang Ulat",
      historyLabel: "Kasaysayan ng Checkup", historyDesc: "I-browse ang mga nakaraang checkup at archived records.",
      historyAction: "Tingnan ang Archive",
      footer: "HealthSense Operations v2.0",
      tagline: "Patient Portal",
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const timer = new Promise((resolve) => setTimeout(resolve, 800));
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { navigate("/"); return; }
        const { data, error } = await supabase
          .from("profiles").select("first_name, middle_name, last_name, language, units, large_text")
          .eq("id", session.user.id).single();
        if (error) console.error(error.message);
        if (data) {
          setUserData(data);
          if (data.language) setLanguage(data.language as "English" | "Tagalog");
        }
      } catch (err) { console.error(err); }
      finally { await timer; setLoading(false); }
    };
    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    navigate("/");
  };

  const formatName = () => {
    if (!userData) return "Patient";
    const mi = userData.middle_name ? ` ${userData.middle_name.charAt(0)}.` : "";
    return `${userData.first_name}${mi} ${userData.last_name}`;
  };

  const getInitials = () => {
    if (!userData) return "??";
    return `${userData.first_name.charAt(0)}${userData.last_name.charAt(0)}`;
  };

  const lang = content[language];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eaf4ff] font-['Lexend']">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-[#139dc7]/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-[#139dc7] border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-xl font-black text-[#139dc7] tracking-tight">Loading Dashboard</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[linear-gradient(135deg,#eaf4ff_0%,#cbe5ff_50%,#b0d0ff_100%)] font-['Lexend'] overflow-x-hidden">

      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-125 h-125 rounded-full bg-[#139dc7]/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 w-100 h-100 rounded-full bg-[#34A0A4]/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-75 rounded-full bg-[#9fc5f8]/20 blur-3xl" />
      </div>

      {/* HEADER */}
      <header className="relative z-10 w-full px-6 lg:px-16 pt-7 pb-4 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#139dc7] flex items-center justify-center shadow-lg shadow-[#139dc7]/30">
            <div className="w-4 h-4 rounded-sm bg-white/90" style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }} />
          </div>
          <div>
            <div className="text-[15px] font-black text-[#139dc7] tracking-tight leading-none uppercase">HealthSense</div>
            <div className="text-[8px] font-bold text-[#34A0A4] uppercase tracking-[0.25em] leading-none mt-0.5">{lang.tagline}</div>
          </div>
        </div>

        {/* Nav actions */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/profile")}
            className="flex items-center gap-2 px-3 py-2 bg-white/50 backdrop-blur-md border border-white/70 rounded-2xl text-[#139dc7] hover:bg-white hover:shadow-md transition-all active:scale-95 group">
            <div className="w-6 h-6 rounded-full bg-[#139dc7] flex items-center justify-center text-[9px] text-white font-black shrink-0">
              {getInitials()}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">{lang.profile}</span>
          </button>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/50 backdrop-blur-md border border-white/70 rounded-2xl text-[#139dc7] hover:bg-white hover:shadow-md transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest">
            <FaSignOutAlt size={11} />
            <span className="hidden sm:block">{lang.logout}</span>
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-6 lg:px-8 pt-10 pb-16 flex flex-col">

        {/* Welcome block */}
        <div className="mb-12">
          <p className="text-[11px] font-black text-[#139dc7]/50 uppercase tracking-[0.3em] mb-2">{lang.welcome}</p>
          <h1 className="text-[clamp(28px,5vw,52px)] font-black text-[#0a4d61] leading-tight tracking-tight">
            {formatName()}
          </h1>
          <p className="text-[#139dc7]/60 font-medium mt-2 text-sm sm:text-base">{lang.sub}</p>

          {/* Thin decorative line */}
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-linear-to-r from-[#139dc7]/30 to-transparent" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#139dc7]/40" />
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-5">

          {/* ── Results Card ── */}
          <button
            onClick={() => navigate("/results")}
            onMouseEnter={() => setHovered("results")}
            onMouseLeave={() => setHovered(null)}
            className="group relative bg-white/60 backdrop-blur-xl border border-white rounded-3xl sm:rounded-4xl p-5 sm:p-10 text-left overflow-hidden transition-all duration-300 hover:bg-white hover:shadow-2xl hover:shadow-[#139dc7]/15 hover:-translate-y-1 active:scale-[0.98] flex flex-col h-56 sm:h-80"
          >
            {/* Background accent */}
            <div className="absolute inset-0 bg-linear-to-br from-[#139dc7]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-4xl" />
                        <div className="absolute inset-0 bg-linear-to-br from-[#139dc7]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-4xl" />
            
            {/* Large ghost icon */}
            <div className="absolute -bottom-4 -right-4 text-[#139dc7]/5 group-hover:text-[#139dc7]/10 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6">
              <FaFileMedical size={140} />
            </div>

            {/* Icon */}
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-[#139dc7] flex items-center justify-center text-white shadow-xl shadow-[#139dc7]/30 mb-4 sm:mb-6 group-hover:shadow-[#139dc7]/50 transition-all duration-300 group-hover:scale-110">
              <FaFileMedical className="text-base sm:text-xl" />
            </div>

            {/* Text */}
            <div className="relative flex-1">
              <div className="text-[9px] font-black text-[#139dc7]/40 uppercase tracking-[0.3em] mb-1.5">Quick Access</div>
              <h2 className="text-lg sm:text-3xl font-black text-[#0a4d61] leading-tight mb-2 sm:mb-3">{lang.resultsLabel}</h2>
              <p className="text-[#139dc7]/60 text-sm leading-relaxed font-medium max-w-xs hidden sm:block">{lang.resultsDesc}</p>
            </div>

            {/* CTA */}
            <div className="relative mt-4 sm:mt-8 flex items-center gap-2 text-[#139dc7] font-black text-[9px] sm:text-xs uppercase tracking-widest group-hover:gap-4 transition-all duration-200">
              {lang.resultsAction}
              <div className="w-6 h-6 rounded-full bg-[#139dc7]/10 group-hover:bg-[#139dc7] flex items-center justify-center transition-all duration-200">
                <FaChevronRight size={9} className="text-[#139dc7] group-hover:text-white transition-colors" />
              </div>
            </div>
          </button>

          {/* ── History Card ── */}
          <button
            onClick={() => navigate("/history")}
            onMouseEnter={() => setHovered("history")}
            onMouseLeave={() => setHovered(null)}
            className="group relative overflow-hidden rounded-3xl sm:rounded-4xl p-5 sm:p-10 text-left transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] flex flex-col h-56 sm:h-80"
            style={{
              background: "linear-gradient(135deg, #139dc7 0%, #0a7fa0 50%, #0a4d61 100%)",
              boxShadow: hovered === "history" ? "0 25px 60px rgba(19,157,199,0.40)" : "0 10px 40px rgba(19,157,199,0.25)"
            }}
          >
            {/* Geometric accent shapes */}
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-12 -translate-x-8 group-hover:scale-125 transition-transform duration-500" />

            {/* Large ghost icon */}
            <div className="absolute -bottom-4 -right-4 text-white/10 group-hover:text-white/15 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
              <FaHistory size={140} />
            </div>

            {/* Icon */}
            <div className="relative w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white shadow-lg mb-4 sm:mb-6 group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110">
              <FaHistory className="text-base sm:text-xl" />
            </div>

            {/* Text */}
            <div className="relative flex-1">
              <div className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] mb-1.5">Archive</div>
              <h2 className="text-lg sm:text-3xl font-black text-white leading-tight mb-2 sm:mb-3">{lang.historyLabel}</h2>
              <p className="text-white/60 text-sm leading-relaxed font-medium max-w-xs hidden sm:block">{lang.historyDesc}</p>
            </div>

            {/* CTA */}
            <div className="relative mt-4 sm:mt-8 flex items-center gap-2 text-white font-black text-[9px] sm:text-xs uppercase tracking-widest group-hover:gap-4 transition-all duration-200">
              {lang.historyAction}
              <div className="w-6 h-6 rounded-full bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition-all duration-200">
                <FaChevronRight size={9} className="text-white" />
              </div>
            </div>
          </button>
        </div>

        {/* Stats strip */}
        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          {/* Language */}
          <div className="bg-white/30 backdrop-blur-sm border border-white/50 rounded-2xl px-4 py-3 text-center">
            <div className="text-[8px] font-black text-[#139dc7]/40 uppercase tracking-widest">Language</div>
            <div className="text-sm font-black text-[#0a4d61] mt-0.5">{language === "English" ? "EN" : "TL"}</div>
            <div className="text-[8px] text-[#139dc7]/50 font-medium mt-0.5">{language}</div>
          </div>
          {/* Units */}
          <div className="bg-white/30 backdrop-blur-sm border border-white/50 rounded-2xl px-4 py-3 text-center">
            <div className="text-[8px] font-black text-[#139dc7]/40 uppercase tracking-widest">Units</div>
            <div className="text-sm font-black text-[#0a4d61] mt-0.5">
              {userData?.units?.toLowerCase() === "imperial" ? "lb / in" : "kg / m"}
            </div>
            <div className="text-[8px] text-[#139dc7]/50 font-medium mt-0.5">
              {userData?.units?.toLowerCase() === "imperial" ? "Imperial" : "Metric"}
            </div>
          </div>
          {/* Large Text */}
          <div className="bg-white/30 backdrop-blur-sm border border-white/50 rounded-2xl px-4 py-3 text-center">
            <div className="text-[8px] font-black text-[#139dc7]/40 uppercase tracking-widest">Large Text</div>
            <div className={`text-sm font-black mt-0.5 ${userData?.large_text ? "text-[#0a4d61]" : "text-[#0a4d61]"}`}>
              {userData?.large_text ? "ON" : "OFF"}
            </div>
            <div className="text-[8px] text-[#139dc7]/50 font-medium mt-0.5">Accessibility</div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full py-6 text-center">
        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#139dc7]/30">
          {lang.footer}
        </span>
      </footer>
    </div>
  );
};

export default Dashboard;