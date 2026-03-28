import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

interface StaticPageLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  children: React.ReactNode;
}

/** Shared shell for Privacy Policy, Terms of Use, Contact, and Help Center.
 *  Matches the HealthSense visual identity without duplicating code. */
export default function StaticPageLayout({
  title,
  subtitle,
  lastUpdated,
  children,
}: StaticPageLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex flex-col bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-x-hidden">

      {/* Header */}
      <header className="w-full px-6 sm:px-10 lg:px-16 py-4 sm:py-5 flex justify-between items-center shrink-0 bg-white/40 backdrop-blur-xl border-b border-white/30">
        <div className="flex flex-col shrink-0">
          <span
            className="text-lg sm:text-xl font-black text-[#139dc7] tracking-tighter uppercase leading-none cursor-pointer"
            onClick={() => navigate("/")}
          >
            HealthSense
          </span>
          <span className="text-[8px] sm:text-[10px] font-semibold text-[#34A0A4] uppercase tracking-[0.2em] mt-0.5">
            Patient Portal
          </span>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-white/50 border border-white/70 text-[#139dc7] font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-white transition-all active:scale-95"
        >
          <FaArrowLeft size={11} />
          Back
        </button>
      </header>

      {/* Hero */}
      <div className="w-full py-14 px-6 text-center border-b border-[#139dc7]/10 bg-white/20">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#1e7a96] mb-3">{subtitle}</p>
        <h1 className="text-[clamp(28px,5vw,52px)] font-black text-[#0a4d61] tracking-tighter italic mb-2">{title}</h1>
        <p className="text-xs text-[#1e7a96] font-normal">Last updated: {lastUpdated}</p>
      </div>

      {/* Content */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 sm:px-8 py-14">
        <div className="flex flex-col gap-10">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-10 border-t border-[#139dc7]/10">
        <div className="max-w-7xl mx-auto px-8 flex flex-col sm:flex-row items-center justify-between gap-5">
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