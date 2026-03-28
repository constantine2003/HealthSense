import React, { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const Home: React.FC = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [recoveryEmailInput, setRecoveryEmailInput] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState({ type: "", text: "" });

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const handleLogin = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError("");

    if (!emailInput || !passwordInput) {
      setLoginError("Please enter both credentials.");
      return;
    }

    setIsLoading(true);

    try {
      const userInput = emailInput.toLowerCase().trim();
      let loginEmail = "";

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("recovery_email, username")
        .eq("username", userInput)
        .maybeSingle();

      if (profileError) console.warn("Profile Lookup Error:", profileError.message);

      if (profile) {
        loginEmail = profile.recovery_email
          ? profile.recovery_email
          : `${profile.username}@kiosk.local`;
      } else {
        loginEmail = userInput.includes("@")
          ? userInput
          : `${userInput}@kiosk.local`;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: passwordInput,
      });

      if (authError) throw authError;

      console.log("Web Portal Login successful:", data.user?.email);
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Auth Error:", err.message);
      setLoginError("Access denied. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverAccount = async () => {
    setRecoveryMessage({ type: "", text: "" });
    const cleanEmail = recoveryEmailInput.trim();

    try {
      setRecoveryLoading(true);

      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("username")
        .ilike("recovery_email", cleanEmail)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!profile) {
        setRecoveryMessage({
          type: "error",
          text: "No account is linked to this recovery email.",
        });
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setRecoveryMessage({
          type: "error",
          text: "System could not send to this address. Verify your account setup.",
        });
        return;
      }

      setRecoveryMessage({
        type: "success",
        text: "Success! Reset link sent to your personal inbox.",
      });
    } catch (err: any) {
      setRecoveryMessage({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-x-hidden relative">

      {/* ── HEADER ── */}
      <header className="w-full px-4 sm:px-8 lg:px-16 py-4 sm:py-5 flex justify-between items-center z-50 shrink-0 gap-2">
        <div className="flex flex-col shrink-0">
          <span className="text-lg sm:text-2xl font-black text-[#139dc7] tracking-tighter uppercase leading-none">
            HealthSense
          </span>
          {/* FIX: font-semibold instead of font-bold — consistent with Landing */}
          <span className="text-[8px] sm:text-[10px] font-semibold text-[#34A0A4] uppercase tracking-[0.2em] mt-0.5">
            Patient Portal
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white/45 rounded-full border border-white/50 backdrop-blur-md">
          <div className="w-4 h-4 sm:w-5 sm:h-5 bg-[#139dc7] rounded-full flex items-center justify-center text-[8px] sm:text-[10px] text-white font-bold shrink-0">
            ✓
          </div>
          {/* FIX: font-bold instead of font-black, removed opacity-40 on version label */}
          <span className="text-[8px] sm:text-[10px] font-bold text-[#139dc7] uppercase tracking-tight sm:tracking-wider whitespace-nowrap">
            Portal v2.0
          </span>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col items-center justify-center w-full px-6 lg:px-12 mx-auto py-8">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-28 w-full max-w-6xl">

          {/* LEFT: Branding */}
          <div className="text-center lg:text-left flex flex-col items-center lg:items-start gap-2 sm:gap-4 shrink-0">
            {/* FIX: solid color instead of opacity-based */}
            <p className="text-[clamp(16px,3vw,28px)] font-bold text-[#1e7a96] m-0 leading-none">
              Welcome to
            </p>

            <h1 className="text-[clamp(44px,11vw,120px)] font-black leading-[0.85] m-0 bg-linear-to-r from-[#139dc7] to-[#34A0A4] bg-clip-text text-transparent select-none lg:whitespace-nowrap italic pr-[0.1em]">
              HealthSense
            </h1>

            {/* FIX: font-normal + solid #1e7a96 instead of font-light + opacity-70 */}
            <p className="text-[clamp(14px,2vw,19px)] font-normal text-[#1e7a96] leading-relaxed max-w-sm lg:max-w-lg mt-2 sm:mt-4">
              View your personal health checkup results securely, privately, and conveniently online today.
            </p>
          </div>

          {/* RIGHT: Login Card */}
          <div className="w-full max-w-sm sm:max-w-md shrink-0">
            <div className="relative w-full bg-white/35 backdrop-blur-2xl rounded-[36px] border border-white/50 shadow-[0_24px_80px_rgba(20,60,120,0.10)] flex items-center justify-center p-7 sm:p-12 overflow-hidden">

              {/* Performance-friendly glow: radial-gradient instead of blur-[80px] */}
              <div
                className="absolute -top-[10%] -right-[10%] w-48 h-48 pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(19,157,199,0.12) 0%, transparent 70%)" }}
              />

              <form className="w-full flex flex-col gap-4 sm:gap-6 z-10" onSubmit={handleLogin}>

                <div className="text-center space-y-1 sm:space-y-2">
                  <h2 className="text-3xl sm:text-4xl font-black text-[#139dc7] tracking-tighter m-0 pb-1">
                    Login
                  </h2>
                  {/* FIX: solid #1e7a96 instead of text-[#139dc7]/40 */}
                  <p className="text-[10px] sm:text-xs font-bold text-[#1e7a96] uppercase tracking-[0.3em]">
                    Secure Access
                  </p>
                </div>

                {loginError && (
                  <div className="bg-red-500/10 border border-red-400/30 text-red-600 text-[10px] sm:text-xs py-2.5 px-4 rounded-xl text-center font-bold">
                    {loginError}
                  </div>
                )}

                {/* Patient ID */}
                <div className="space-y-1 sm:space-y-2">
                  {/* FIX: font-bold instead of font-black for labels */}
                  <label className="text-[10px] sm:text-xs font-bold text-[#139dc7] ml-1 uppercase tracking-widest">
                    Patient ID / Username
                  </label>
                  <input
                    type="text"
                    placeholder="firstname.lastname"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full h-11 sm:h-14 bg-white/55 border border-white/80 rounded-2xl px-5 text-[#0a4d61] placeholder:text-[#8ab8c8] focus:bg-white focus:shadow-md transition-all text-sm sm:text-base outline-none"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-bold text-[#139dc7] ml-1 uppercase tracking-widest">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full h-11 sm:h-14 bg-white/55 border border-white/80 rounded-2xl pl-5 pr-12 text-[#0a4d61] placeholder:text-[#8ab8c8] focus:bg-white focus:shadow-md transition-all text-sm sm:text-base outline-none"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8ab8c8] hover:text-[#139dc7] transition-colors"
                    >
                      {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full h-12 sm:h-14 rounded-[18px] text-white font-bold text-sm sm:text-base shadow-xl transition-all mt-2 uppercase tracking-widest flex items-center justify-center
                    ${isLoading
                      ? "bg-[#0a4d61] cursor-not-allowed opacity-80"
                      : "bg-[#139dc7] shadow-blue-300/30 hover:bg-[#0a4d61] hover:-translate-y-0.5 active:scale-95"
                    }`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    "Enter Portal"
                  )}
                </button>

                <div className="flex flex-col items-center gap-2">
                  {/* FIX: solid #1e7a96 instead of text-[#139dc7]/60 */}
                  <button
                    type="button"
                    onClick={() => setShowRecoverModal(true)}
                    className="text-[11px] sm:text-xs font-bold text-[#1e7a96] hover:text-[#139dc7] transition-colors"
                  >
                    Recover Account
                  </button>
                  <p className="text-[9px] text-[#8ab8c8] text-center leading-snug">
                    HealthSense Infrastructure v2.0
                  </p>
                </div>
              </form>
            </div>
          </div>

        </div>
      </main>

      {/* ── FOOTER ── */}
      {/* FIX: added trust links + solid color instead of opacity-40 */}
      <footer className="w-full py-10 mt-auto border-t border-[#139dc7]/10">
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

      {/* ── RECOVERY MODAL ── */}
      {showRecoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#001b2e]/55 backdrop-blur-xl">
          <div className="bg-white/95 w-full max-w-md rounded-[36px] shadow-2xl border border-white/60 p-10 relative">

            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-[#139dc7] mb-1.5 uppercase italic tracking-tighter">
                Recover Access
              </h2>
              {/* FIX: solid #1e7a96 instead of text-[#139dc7]/60 */}
              <p className="text-[#1e7a96] text-xs font-bold uppercase tracking-widest">
                Identify your account
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                {/* FIX: solid color label instead of opacity-based */}
                <label className="text-[10px] font-bold uppercase text-[#1e7a96] ml-1 tracking-widest">
                  Recovery Email Address
                </label>
                <input
                  type="email"
                  placeholder="example@email.com"
                  className="w-full h-13 bg-white border border-[#139dc7]/15 rounded-2xl px-5 text-[#0a4d61] outline-none focus:border-[#139dc7] focus:ring-4 focus:ring-[#139dc7]/8 transition-all placeholder:text-[#8ab8c8]"
                  value={recoveryEmailInput}
                  onChange={(e) => setRecoveryEmailInput(e.target.value)}
                />
              </div>

              {recoveryMessage.text && (
                <div
                  className={`text-[11px] font-bold p-4 rounded-2xl border ${
                    recoveryMessage.type === "success"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-red-50 text-red-600 border-red-200"
                  }`}
                >
                  {recoveryMessage.type === "success" ? "✓ " : "⚠ "}{recoveryMessage.text}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-1">
                <button
                  onClick={handleRecoverAccount}
                  disabled={recoveryLoading}
                  className="w-full h-13 rounded-2xl font-bold bg-[#139dc7] text-white hover:bg-[#0a4d61] shadow-md shadow-blue-200/40 transition-all flex items-center justify-center uppercase tracking-widest text-sm"
                >
                  {recoveryLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Send Reset Link"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowRecoverModal(false);
                    setRecoveryMessage({ type: "", text: "" });
                    setRecoveryEmailInput("");
                  }}
                  className="w-full h-11 rounded-2xl font-bold text-[#1e7a96] hover:text-[#139dc7] transition-colors text-xs uppercase tracking-wider"
                >
                  Back to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Home;