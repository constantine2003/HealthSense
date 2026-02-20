import React, { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
// Import your existing client here
import { supabase } from "../supabaseClient";

const Home: React.FC = () => {
  const navigate = useNavigate();

  // Logic States
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>(""); 
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  // Modal States
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

      // 1. LOOKUP: Check if the user exists in your profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('recovery_email, username')
        .eq('username', userInput)
        .maybeSingle();

      // Log the error for debugging, but don't stop the flow (allows fallback)
      if (profileError) console.warn("Profile Lookup Error:", profileError.message);

      if (profile) {
        // IF profile exists: use recovery_email if they have one, 
        // otherwise use the kiosk.local fallback
        loginEmail = profile.recovery_email 
          ? profile.recovery_email 
          : `${profile.username}@kiosk.local`;
      } else {
        // IF no profile found by username: maybe they typed their full email or are a .local user?
        loginEmail = userInput.includes("@") 
          ? userInput 
          : `${userInput}@kiosk.local`;
      }

      // 2. AUTHENTICATE: Use the resolved email to sign in
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: passwordInput,
      });

      if (authError) throw authError;

      console.log("Web Portal Login successful:", data.user?.email);
      navigate("/dashboard");

    } catch (err: any) {
      console.error("Auth Error:", err.message);
      // Friendly message for both Patients and Professionals
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

      // 1. Double check the profiles table (This uses the SQL Policy you just fixed!)
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("username") 
        .ilike("recovery_email", cleanEmail)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!profile) {
        setRecoveryMessage({ 
          type: "error", 
          text: "No account is linked to this recovery email." 
        });
        return;
      }

      // 2. Trigger the reset to the REAL email address
      // This will work ONLY if 'cleanEmail' is the email in the Supabase Auth list
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        // If this fails, it's usually because the Auth email is actually the @kiosk.local one
        setRecoveryMessage({ 
          type: "error", 
          text: "System could not send to this address. Verify your account setup." 
        });
        return;
      }

      setRecoveryMessage({ 
        type: "success", 
        text: "Success! Reset link sent to your personal inbox." 
      });

    } catch (err: any) {
      setRecoveryMessage({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-x-hidden relative">
      
      {/* HEADER */}
      <header className="w-full px-8 lg:px-16 py-4 sm:py-6 flex justify-between items-center z-50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl font-black text-[#139dc7] tracking-tighter uppercase">HealthSense</span>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/40 rounded-full border border-white/40 backdrop-blur-md shadow-sm">
          <div className="w-5 h-5 bg-[#139dc7] rounded-full flex items-center justify-center text-[10px] text-white font-black shadow-inner">
            ?
          </div>
          <span className="text-[9px] sm:text-[10px] font-black text-[#139dc7] uppercase tracking-wider">
            Portal Login <span className="opacity-40 ml-1">v2.0</span>
          </span>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col items-center justify-center w-full px-6 lg:px-12 mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-32 w-full max-w-400">

          {/* LEFT SECTION: BRANDING */}
          <div className="text-center lg:text-left flex flex-col items-center lg:items-start gap-1 sm:gap-4 shrink-0">
            <p className="text-[clamp(18px,3.5vw,32px)] font-bold text-[#139dc7] m-0 leading-none opacity-90">
              Welcome to
            </p>
            
            <h1 className="text-[clamp(44px,11vw,120px)] font-black leading-[0.85] m-0 bg-linear-to-r from-[#139dc7] to-[#34A0A4] bg-clip-text text-transparent select-none lg:whitespace-nowrap italic lg:not-italic pr-[0.1em]">
              HealthSense
            </h1>
            
            <p className="text-[clamp(14px,2.2vw,20px)] font-light text-[#139dc7] leading-relaxed max-w-85 lg:max-w-137.5 opacity-70 mt-3 sm:mt-5">
              View your personal health checkup results securely, privately, and conveniently online today.
            </p>
          </div>

          {/* RIGHT SECTION: LOGIN CARD */}
          <div className="w-full max-w-105 sm:max-w-125 shrink-0">
            <div className="relative w-full bg-white/30 backdrop-blur-2xl rounded-[40px] border border-white/50 shadow-[0_30px_100px_rgba(20,60,120,0.1)] flex items-center justify-center p-7 sm:p-14 overflow-hidden">
              
              <div className="absolute -top-[10%] -right-[10%] w-50 h-50 bg-[#139dc7]/15 rounded-full blur-[80px]" />

              <form className="w-full flex flex-col gap-4 sm:gap-7 z-10" onSubmit={handleLogin}>
                
                <div className="text-center space-y-1 sm:space-y-3">
                  <h2 className="text-3xl sm:text-5xl font-normal text-[#139dc7] tracking-tight m-0 pb-1 sm:pb-3">
                    Login
                  </h2>
                  <p className="text-[10px] sm:text-xs font-bold text-[#139dc7]/40 uppercase tracking-[0.3em]">
                    Secure Access
                  </p>
                </div>

                {loginError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-600 text-[10px] sm:text-xs py-2 px-3 rounded-xl text-center font-bold">
                    {loginError}
                  </div>
                )}

                {/* Email Input */}
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-black text-[#139dc7] ml-2 uppercase tracking-widest">Patient ID / Username</label>
                  <input 
                    type="text" 
                    placeholder="firstname.lastname"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full h-11 sm:h-16 bg-white/50 border border-white/80 rounded-2xl px-6 text-[#111] placeholder:text-gray-400 focus:bg-white focus:shadow-lg transition-all text-sm sm:text-lg outline-none"
                  />
                </div>

                {/* Password Input */}
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-black text-[#139dc7] ml-2 uppercase tracking-widest">Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full h-11 sm:h-16 bg-white/50 border border-white/80 rounded-2xl pl-6 pr-14 text-[#111] placeholder:text-gray-400 focus:bg-white focus:shadow-lg transition-all text-sm sm:text-lg outline-none"
                    />
                    <button type="button" onClick={togglePasswordVisibility} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#139dc7]">
                      {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className={`w-full h-12 sm:h-16 rounded-[22px] text-white font-black text-base sm:text-xl shadow-2xl transition-all mt-4 sm:mt-6 uppercase tracking-widest flex items-center justify-center
                    ${isLoading 
                      ? "bg-[#0a4d61] cursor-not-allowed opacity-80" 
                      : "bg-[#139dc7] shadow-blue-300/40 hover:bg-[#0a4d61] hover:-translate-y-1 active:scale-95"
                    }`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    "Enter Portal"
                  )}
                </button>

                <div className="flex flex-col items-center gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowRecoverModal(true)}
                    className="text-[11px] sm:text-sm font-bold text-[#139dc7]/60 hover:text-[#139dc7] transition-all"
                  >
                    Recover Account
                  </button>
                  <p className="text-[9px] text-gray-400 text-center leading-snug">
                    HealthSense Infrastructure v2.0
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full py-6 text-center shrink-0">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#139dc7] opacity-40">
          v2.0 // ArchiveStream Master
        </span>
      </footer>

      {/* RECOVERY MODAL */}
      {showRecoverModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-[#001b2e]/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white/95 w-full max-w-md rounded-[40px] shadow-2xl border border-white/50 p-10 relative animate-in zoom-in-95 duration-200">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-[#139dc7] mb-2 uppercase italic tracking-tighter">Recover Access</h2>
              <p className="text-[#139dc7]/60 text-xs font-bold uppercase tracking-widest">Identify your account</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#139dc7]/40 ml-2 tracking-widest">
                  Recovery Email Address
                </label>
                <div className="relative group">
                  <input 
                    type="email"
                    placeholder="example@email.com"
                    className="w-full h-14 bg-white border border-[#139dc7]/10 rounded-2xl px-5 pr-12 text-[#0a4d61] outline-none focus:border-[#139dc7] focus:ring-4 focus:ring-[#139dc7]/5 transition-all shadow-inner placeholder:text-[#139dc7]/20"
                    /* FIXED NAMES BELOW */
                    value={recoveryEmailInput}
                    onChange={(e) => setRecoveryEmailInput(e.target.value)}
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[#139dc7]/20 group-focus-within:text-[#139dc7] transition-colors">
                    {/* <FaLanguage size={18} />  */}
                  </div>
                </div>
              </div>

              {recoveryMessage.text && (
                <div className={`text-[11px] font-bold p-4 rounded-2xl border animate-bounce-short ${
                  recoveryMessage.type === "success" 
                    ? "bg-green-50 text-green-600 border-green-100" 
                    : "bg-red-50 text-red-500 border-red-100"
                }`}>
                  {recoveryMessage.type === "success" ? "✓ " : "⚠️ "} {recoveryMessage.text}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleRecoverAccount}
                  disabled={recoveryLoading}
                  className="w-full h-14 rounded-2xl font-black bg-[#139dc7] text-white hover:bg-[#0a4d61] shadow-lg shadow-blue-200 transition-all flex items-center justify-center uppercase tracking-widest"
                >
                  {recoveryLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
                
                <button 
                  type="button"
                  onClick={() => { 
                    setShowRecoverModal(false); 
                    setRecoveryMessage({ type: "", text: "" }); 
                    setRecoveryEmailInput(""); // Clear input on close
                  }}
                  className="w-full h-12 rounded-2xl font-bold text-[#139dc7]/40 hover:text-[#139dc7] transition-all text-xs uppercase"
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