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
      // SECRETLY APPEND DOMAIN: "user.name" -> "user.name@kiosk.local"
      // This allows you to use Supabase Auth without forcing users to type @...
      const secretEmail = emailInput.includes("@") 
        ? emailInput 
        : `${emailInput}@kiosk.local`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: secretEmail,
        password: passwordInput,
      });

      if (error) throw error;

      console.log("Kiosk Login successful:", data.user?.email);
      navigate("/dashboard");

    } catch (err: any) {
      console.error("Auth Error:", err.message);
      // Friendly error for the kiosk
      setLoginError("Access denied. Please check your Patient ID and Password.");
    } finally {
      setIsLoading(false);
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
        <div className="flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-32 w-full max-w-[1600px]">

          {/* LEFT SECTION: BRANDING */}
          <div className="text-center lg:text-left flex flex-col items-center lg:items-start gap-1 sm:gap-4 shrink-0">
            <p className="text-[clamp(18px,3.5vw,32px)] font-bold text-[#139dc7] m-0 leading-none opacity-90">
              Welcome to
            </p>
            
            <h1 className="text-[clamp(44px,11vw,120px)] font-black leading-[0.85] m-0 bg-gradient-to-r from-[#139dc7] to-[#34A0A4] bg-clip-text text-transparent select-none lg:whitespace-nowrap italic lg:not-italic pr-[0.1em]">
              HealthSense
            </h1>
            
            <p className="text-[clamp(14px,2.2vw,20px)] font-light text-[#139dc7] leading-relaxed max-w-[340px] lg:max-w-[550px] opacity-70 mt-3 sm:mt-5">
              View your personal health checkup results securely, privately, and conveniently online today.
            </p>
          </div>

          {/* RIGHT SECTION: LOGIN CARD */}
          <div className="w-full max-w-[420px] sm:max-w-[500px] shrink-0">
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
                  <button type="button" className="text-[11px] sm:text-sm font-bold text-[#139dc7]/60 hover:text-[#139dc7] transition-all">
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
    </div>
  );
};

export default Home;