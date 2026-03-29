import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  FaAndroid, FaShieldAlt, FaHeartbeat, FaUserMd,
  FaChevronDown, FaArrowRight, FaQrcode, FaSignInAlt, FaChartLine,
} from "react-icons/fa";

const APK_URL = "https://expo.dev/accounts/daniel.montesclaros/projects/HealthSenseMobile/builds/bbccb6f7-d8b4-4d53-b561-f56f94798c58";

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    // Entrance animation trigger
    const t = setTimeout(() => setVisible(true), 60);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(t);
    };
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-x-hidden relative selection:bg-[#139dc7] selection:text-white text-[#0a4d61]">

      {/* ── HEADER ── */}
      <header className={`fixed top-0 w-full px-4 sm:px-8 lg:px-16 py-4 sm:py-5 flex justify-between items-center z-50 transition-all duration-500 ${scrolled ? "bg-white/65 backdrop-blur-2xl border-b border-white/30 shadow-sm" : "bg-transparent"}`}>
        <div className="flex flex-col shrink-0">
          <span className="text-lg sm:text-2xl font-black text-[#139dc7] tracking-tighter uppercase leading-none">
            HealthSense
          </span>
          <span className="text-[8px] sm:text-[10px] font-semibold text-[#34A0A4] uppercase tracking-[0.2em] mt-0.5">
            Patient Portal
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/45 rounded-full border border-white/50 backdrop-blur-md">
            <div className="w-4 h-4 bg-[#139dc7] rounded-full flex items-center justify-center text-[8px] text-white font-bold">✓</div>
            <span className="text-[10px] font-bold text-[#139dc7] uppercase tracking-wider whitespace-nowrap">
              Portal v2.0
            </span>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="px-5 sm:px-6 py-2 bg-[#139dc7] text-white font-bold text-[10px] sm:text-xs uppercase tracking-widest rounded-xl hover:bg-[#0a4d61] shadow-md shadow-blue-300/30 transition-all active:scale-95"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section
        className={`relative min-h-screen flex flex-col items-center justify-center px-6 pt-32 pb-20 text-center transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}
      >
        {/* Performance-friendly orb: CSS radial-gradient instead of blur-[140px] */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-175 h-175 -z-10 pointer-events-none hidden sm:block"
          style={{ background: "radial-gradient(circle, rgba(19,157,199,0.13) 0%, transparent 68%)" }}
        />

        <div className="inline-flex items-center gap-2.5 px-5 py-2 bg-white/45 border border-white/80 rounded-full mb-10 backdrop-blur-xl shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#139dc7] animate-pulse" />
          <span className="text-[11px] font-bold text-[#139dc7] uppercase tracking-[0.2em]">Clinical Health Monitoring</span>
        </div>

        <h1 className="text-[clamp(48px,11vw,120px)] font-black leading-[0.85] tracking-tighter mb-8 max-w-5xl select-none">
          <span className="inline-block italic bg-linear-to-r from-[#139dc7] to-[#34A0A4] bg-clip-text text-transparent pr-[0.15em]">
            HealthSense
          </span>
          <br />
          {/* <span className="text-[#0a4d61] font-black">Reimagined.</span> */}
        </h1>

        {/* FIX: replaced text-[#139dc7]/80 opacity with solid readable color #1e7a96 */}
        <p className="text-[clamp(15px,2.1vw,21px)] text-[#1e7a96] font-normal leading-relaxed max-w-3xl mb-14">
          The bridge between your kiosk checkup and your daily wellness.{" "}
          <br className="hidden md:block" />
          Simple enough for everyone, powerful enough for doctors.
        </p>

        <div className="flex flex-col sm:flex-row gap-5 items-center justify-center mb-24">
          <a         
          href={APK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 px-10 py-5 bg-[#139dc7] text-white font-bold text-sm uppercase tracking-widest rounded-[20px] shadow-xl shadow-blue-300/35 hover:bg-[#0a4d61] hover:-translate-y-1.5 transition-all active:scale-95"
        >
          <FaAndroid size={20} />
          Get Android App
          </a>
          <button
            onClick={() => navigate("/login")}
            className="group flex items-center gap-3 px-10 py-5 bg-white/55 backdrop-blur-2xl border border-white/80 text-[#139dc7] font-bold text-sm uppercase tracking-widest rounded-[20px] hover:bg-white hover:shadow-xl hover:-translate-y-1.5 transition-all active:scale-95"
          >
            Open Web Portal
            <FaArrowRight size={14} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-2 text-[#139dc7]/50 animate-bounce cursor-pointer">
          <span className="text-[9px] font-bold uppercase tracking-[0.4em]">Explore Platform</span>
          <FaChevronDown size={12} />
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="max-w-7xl mx-auto px-8 py-16 w-full">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.3em] text-[#139dc7]/60 mb-12">
          How it works
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { icon: <FaQrcode />, title: "1. Visit Kiosk", desc: "Use a HealthSense kiosk to check your vitals in seconds." },
            { icon: <FaSignInAlt />, title: "2. Secure Login", desc: "Sign in using your Patient ID or recovery email." },
            { icon: <FaChartLine />, title: "3. See Results", desc: "View your trends, AI analysis, and health history." },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center group">
              <div className="w-18 h-18 bg-white/60 rounded-2xl flex items-center justify-center text-[#139dc7] text-2xl mb-5 shadow-sm border border-white group-hover:bg-[#139dc7] group-hover:text-white transition-all duration-400">
                {step.icon}
              </div>
              {/* FIX: solid dark color, not opacity-based */}
              <h3 className="text-base font-bold text-[#0a4d61] uppercase tracking-tight mb-2 italic">{step.title}</h3>
              {/* FIX: solid #1e7a96 instead of text-[#139dc7]/60 */}
              <p className="text-[#1e7a96] font-normal text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BENTO FEATURES ── */}
      {/* FIX: removed fixed auto-rows-[340px] — cards use min-h so they breathe on all screen sizes */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-24 w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">

          {/* Main card */}
          <div className="md:col-span-8 min-h-80 bg-white/50 backdrop-blur-2xl border border-white/80 rounded-[42px] p-8 md:p-12 hover:bg-white/80 transition-all group overflow-hidden relative shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="relative z-10 flex flex-col justify-between h-full md:w-1/2 gap-6">
              <div className="w-14 h-14 bg-[#139dc7] text-white rounded-2xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <FaHeartbeat size={28} />
              </div>
              <div>
                <h3 className="text-3xl font-black text-[#139dc7] mb-3 tracking-tighter italic leading-tight">
                  Your Vitals,<br />On the Go
                </h3>
                {/* FIX: solid #1e7a96 instead of text-[#139dc7]/70 */}
                <p className="text-[#1e7a96] font-normal text-base leading-relaxed">
                  Our Android app provides real-time alerts and beautiful health charts right in your pocket.
                </p>
              </div>
            </div>

            {/* Phone mockup */}
            <div className="relative shrink-0 mt-4 md:mt-0 md:absolute md:-right-2 lg:right-8 transform rotate-3 group-hover:rotate-0 group-hover:-translate-y-4 transition-all duration-700">
              <div className="w-52.5 h-100 bg-[#0a4d61] rounded-[2.8rem] border-[6px] border-[#1a1a1a] shadow-2xl overflow-hidden relative">
                <div className="absolute inset-0 bg-[#f4faff] p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center mb-1">
                    <div className="w-8 h-1.5 bg-[#139dc7]/20 rounded-full" />
                    <div className="w-3 h-3 rounded-full bg-[#34A0A4]/20" />
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-blue-50">
                    <p className="text-[9px] font-bold text-[#139dc7] uppercase tracking-widest">Heart Rate</p>
                    <p className="text-2xl font-black text-[#0a4d61]">72 <span className="text-xs text-[#1e7a96] font-normal">BPM</span></p>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-blue-50 flex-1 flex flex-col">
                    <p className="text-[9px] font-bold text-[#139dc7] uppercase tracking-widest mb-3">Weekly Trend</p>
                    <div className="flex-1 flex items-end gap-1.5 pb-1">
                      {[30, 50, 80, 60, 40, 70, 55].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t-sm"
                          style={{ height: `${h}%`, background: i === 2 ? "#139dc7" : `rgba(19,157,199,${0.18 + i * 0.09})` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-blue-50">
                    <p className="text-[9px] font-bold text-[#139dc7] uppercase tracking-widest">Blood Pressure</p>
                    <p className="text-lg font-black text-[#0a4d61]">118/76 <span className="text-[9px] text-[#34A0A4] font-normal">mmHg</span></p>
                  </div>
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-4 bg-[#1a1a1a] rounded-b-xl" />
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="md:col-span-4 min-h-70 bg-[#0a4d61] rounded-[42px] p-10 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1.5 transition-all group">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-[#34A0A4]">
              <FaShieldAlt size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2 tracking-tight italic leading-snug">Safe & Private</h3>
              {/* FIX: white/40 → white/75 — passes contrast on dark bg */}
              <p className="text-white/75 text-sm font-normal leading-relaxed">
                Medical-grade encryption keeps your personal data invisible to everyone but you.
              </p>
            </div>
          </div>

          {/* Share Results */}
          <div className="md:col-span-4 min-h-65 bg-white/50 backdrop-blur-2xl border border-white/80 rounded-[42px] p-10 flex flex-col justify-between hover:bg-white/80 transition-all group shadow-md">
            <div className="w-12 h-12 bg-[#139dc7]/10 text-[#139dc7] rounded-xl flex items-center justify-center group-hover:bg-[#139dc7] group-hover:text-white transition-all">
              <FaUserMd size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#139dc7] mb-2 tracking-tight italic leading-snug">Share Results</h3>
              {/* FIX: solid #1e7a96 instead of text-[#139dc7]/50 */}
              <p className="text-[#1e7a96] text-sm font-normal leading-relaxed">
                Download health reports as a simple PDF to show your doctor during your next visit.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="md:col-span-8 min-h-65 bg-linear-to-br from-[#139dc7] to-[#34A0A4] rounded-[42px] p-10 md:p-12 flex flex-col justify-center items-center text-center text-white shadow-xl relative overflow-hidden">
            {/* Reduced to a simple opacity circle — no blur for perf */}
            <div className="absolute top-0 right-0 w-56 h-56 bg-white/8 rounded-full -mr-16 -mt-16 pointer-events-none" />
            <h3 className="text-3xl md:text-4xl font-black mb-7 tracking-tighter italic relative z-10 leading-tight">
              Ready to check your vitals?
            </h3>
            <button
              onClick={() => navigate("/login")}
              className="px-10 py-4 bg-white text-[#139dc7] font-bold uppercase tracking-widest text-sm rounded-[18px] hover:scale-105 transition-all shadow-lg active:scale-95 relative z-10"
            >
              Enter Patient Portal
            </button>
          </div>

        </div>
      </section>

      {/* ── FOOTER ── */}
      {/* FIX: added trust links — essential for a medical/health platform */}
      <footer className="w-full py-12 mt-auto border-t border-[#139dc7]/10">
        <div className="max-w-7xl mx-auto px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <span className="text-sm font-black uppercase tracking-widest text-[#139dc7]">HealthSense</span>
            <p className="text-[10px] text-[#1e7a96] uppercase tracking-widest font-normal">
              © 2026 HealthSense Operations v2.0
            </p>
          </div>
          <nav className="flex items-center gap-5 flex-wrap justify-center">
            {[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms of Use", href: "/terms" },
              { label: "Contact Support", href: "/support" },
              { label: "Help Center", href: "/help" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[11px] font-medium text-[#1e7a96] uppercase tracking-wider hover:text-[#139dc7] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>

    </div>
  );
}