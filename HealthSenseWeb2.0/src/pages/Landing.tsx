import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FaAndroid, FaShieldAlt, FaHeartbeat, FaUserMd, FaChevronDown, FaArrowRight, FaQrcode, FaSignInAlt, FaChartLine } from "react-icons/fa";

const APK_URL = "/HealthSense_Apk.apk";

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-x-hidden relative selection:bg-[#139dc7] selection:text-white text-[#0a4d61]">
      
      {/* HEADER */}
      <header className={`fixed top-0 w-full px-4 sm:px-8 lg:px-16 py-4 sm:py-6 flex justify-between items-center z-50 transition-all duration-500 ${scrolled ? "bg-white/60 backdrop-blur-2xl border-b border-white/20 shadow-sm" : "bg-transparent"}`}>
        <div className="flex flex-col shrink-0">
          <span className="text-lg sm:text-2xl font-black text-[#139dc7] tracking-tighter uppercase leading-none">
            HealthSense
          </span>
          <span className="text-[8px] sm:text-[10px] font-bold text-[#34A0A4] uppercase tracking-[0.2em] mt-0.5">
            Patient Portal
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/40 rounded-full border border-white/40 backdrop-blur-md shadow-sm">
            <div className="w-4 h-4 bg-[#139dc7] rounded-full flex items-center justify-center text-[8px] text-white font-black shadow-inner">✓</div>
            <span className="text-[10px] font-black text-[#139dc7] uppercase tracking-wider whitespace-nowrap">
              Portal Login <span className="opacity-40 ml-0.5">v2.0</span>
            </span>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-2 bg-[#139dc7] text-white font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl hover:bg-[#0a4d61] shadow-lg shadow-blue-300/40 transition-all active:scale-95"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-32 pb-20 text-center">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#139dc7]/15 rounded-full blur-[140px] -z-10" />
        
        <div className="inline-flex items-center gap-3 px-5 py-2 bg-white/40 border border-white/80 rounded-full mb-10 backdrop-blur-xl shadow-sm">
          <span className="text-[11px] font-bold text-[#139dc7] uppercase tracking-[0.2em]">Clinical Health Monitoring</span>
        </div>

        <h1 className="text-[clamp(48px,11vw,120px)] font-black leading-[0.85] tracking-tighter mb-8 max-w-5xl select-none">
          <span className="inline-block italic bg-gradient-to-r from-[#139dc7] to-[#34A0A4] bg-clip-text text-transparent pr-[0.15em]">
            HealthSense
          </span>
          <br />
          <span className="text-[#139dc7] font-black">
            Reimagined.
          </span>
        </h1>

        <p className="text-[clamp(16px,2.2vw,22px)] text-[#139dc7]/80 font-medium leading-relaxed max-w-3xl mb-14">
          The bridge between your kiosk checkup and your daily wellness. <br className="hidden md:block" /> 
          Simple enough for everyone, powerful enough for doctors.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 items-center justify-center mb-24">
          <a
            href={APK_URL}
            download
            className="group flex items-center gap-4 px-12 py-6 bg-[#139dc7] text-white font-black text-sm uppercase tracking-widest rounded-[22px] shadow-2xl shadow-blue-300/40 hover:bg-[#0a4d61] hover:-translate-y-1.5 transition-all active:scale-95"
          >
            <FaAndroid size={22} />
            Get Android App
          </a>

          <button
            onClick={() => navigate("/login")}
            className="group flex items-center gap-4 px-12 py-6 bg-white/50 backdrop-blur-2xl border border-white/80 text-[#139dc7] font-black text-sm uppercase tracking-widest rounded-[22px] hover:bg-white hover:shadow-xl hover:-translate-y-1.5 transition-all active:scale-95"
          >
            Open Web Portal
            <FaArrowRight size={16} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 text-[#139dc7] opacity-40 animate-bounce cursor-pointer">
          <span className="text-[10px] font-black uppercase tracking-[0.4em]">Explore Platform</span>
          <FaChevronDown size={14} />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-8 py-20 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          {[
            { icon: <FaQrcode />, title: "1. Visit Kiosk", desc: "Use a HealthSense kiosk to check your vitals in seconds." },
            { icon: <FaSignInAlt />, title: "2. Secure Login", desc: "Sign in here using your Patient ID or recovery email." },
            { icon: <FaChartLine />, title: "3. See Results", desc: "View your trends, AI analysis, and health history." }
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center group">
              <div className="w-20 h-20 bg-white/60 rounded-3xl flex items-center justify-center text-[#139dc7] text-3xl mb-6 shadow-sm border border-white group-hover:bg-[#139dc7] group-hover:text-white transition-all duration-500">
                {step.icon}
              </div>
              <h3 className="text-xl font-black text-[#139dc7] uppercase tracking-tighter mb-2 italic">{step.title}</h3>
              <p className="text-[#139dc7]/60 font-medium text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BENTO FEATURES */}
      <section className="max-w-7xl mx-auto px-8 py-32 w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 auto-rows-[340px]">
          
          {/* MAIN FEATURE - NOW WITH PHONE MOCKUP */}
          <div className="md:col-span-8 bg-white/50 backdrop-blur-2xl border-2 border-white/80 rounded-[45px] p-8 md:p-12 hover:bg-white transition-all group overflow-hidden relative shadow-lg flex flex-col md:flex-row items-center justify-between">
            <div className="relative z-10 flex flex-col justify-between h-full md:w-1/2">
              <div className="w-16 h-16 bg-[#139dc7] text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-6">
                <FaHeartbeat size={32} />
              </div>
              <div>
                <h3 className="text-4xl font-black text-[#139dc7] mb-4 tracking-tighter italic leading-none">Your Vitals, <br/>On the Go</h3>
                <p className="text-[#139dc7]/70 font-medium text-lg leading-relaxed">
                  Our Android app provides real-time alerts and beautiful health charts right in your pocket.
                </p>
              </div>
            </div>

            {/* PHONE MOCKUP */}
            <div className="relative shrink-0 mt-8 md:mt-0 md:absolute md:-right-4 lg:right-10 transform rotate-3 group-hover:rotate-0 group-hover:-translate-y-4 transition-all duration-700">
              <div className="w-[220px] h-[420px] bg-[#0a4d61] rounded-[3rem] border-[7px] border-[#1a1a1a] shadow-2xl overflow-hidden relative">
                {/* Screen Content */}
                <div className="absolute inset-0 bg-[#f4faff] p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="w-10 h-2 bg-[#139dc7]/20 rounded-full" />
                    <div className="w-4 h-4 rounded-full bg-[#34A0A4]/20" />
                  </div>
                  {/* Mockup Vitals Card */}
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-50">
                    <p className="text-[10px] font-bold text-[#139dc7] uppercase tracking-widest">Heart Rate</p>
                    <p className="text-3xl font-black text-[#0a4d61]">72 <span className="text-xs opacity-50 font-medium">BPM</span></p>
                  </div>
                  {/* Mockup Graph */}
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-50 flex-1 flex flex-col">
                    <p className="text-[10px] font-bold text-[#139dc7] uppercase tracking-widest mb-4">Weekly Trend</p>
                    <div className="flex-1 flex items-end gap-1.5 pb-2">
                      <div className="w-full bg-[#139dc7]/20 h-[30%] rounded-t-md" />
                      <div className="w-full bg-[#139dc7]/40 h-[50%] rounded-t-md" />
                      <div className="w-full bg-[#139dc7] h-[80%] rounded-t-md" />
                      <div className="w-full bg-[#34A0A4] h-[60%] rounded-t-md" />
                      <div className="w-full bg-[#139dc7]/60 h-[40%] rounded-t-md" />
                    </div>
                  </div>
                </div>
                {/* Speaker Grill */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-5 bg-[#1a1a1a] rounded-b-xl" />
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="md:col-span-4 bg-[#0a4d61] rounded-[45px] p-12 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-2 transition-all group">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-[#34A0A4]">
              <FaShieldAlt size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-3 tracking-tight italic leading-tight">Safe & Private</h3>
              <p className="text-white/40 text-sm font-medium leading-relaxed">
                Medical-grade encryption keeps your personal data invisible to everyone but you.
              </p>
            </div>
          </div>

          {/* Export */}
          <div className="md:col-span-4 bg-white/50 backdrop-blur-2xl border-2 border-white/80 rounded-[45px] p-12 flex flex-col justify-between hover:bg-white transition-all group shadow-lg">
            <div className="w-14 h-14 bg-[#139dc7]/10 text-[#139dc7] rounded-2xl flex items-center justify-center group-hover:bg-[#139dc7] group-hover:text-white transition-all">
              <FaUserMd size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[#139dc7] mb-3 tracking-tight italic leading-tight">Share Results</h3>
              <p className="text-[#139dc7]/50 text-sm font-medium leading-relaxed">
                Download health reports as a simple PDF to show your doctor during your next visit.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="md:col-span-8 bg-gradient-to-br from-[#139dc7] to-[#34A0A4] rounded-[45px] p-12 flex flex-col justify-center items-center text-center text-white group shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
             <h3 className="text-4xl md:text-5xl font-black mb-8 tracking-tighter italic relative z-10">Ready to check your vitals?</h3>
             <button 
              onClick={() => navigate("/login")} 
              className="px-12 py-5 bg-white text-[#139dc7] font-black uppercase tracking-widest text-sm rounded-[22px] hover:scale-105 transition-all shadow-xl active:scale-95 relative z-10"
             >
               Enter Patient Portal
             </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="w-full py-16 text-center mt-auto border-t border-[#139dc7]/10">
        <div className="flex flex-col items-center gap-4">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#139dc7] opacity-40">
            HealthSense Operations v2.0
          </span>
          <p className="text-[9px] text-gray-400 uppercase tracking-widest">
            Developed for HealthSense Infrastructure — 2026
          </p>
        </div>
      </footer>
    </div>
  );
}