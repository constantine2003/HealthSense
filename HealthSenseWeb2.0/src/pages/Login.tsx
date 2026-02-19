import React, { useState, useEffect } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Home: React.FC = () => {
  const navigate = useNavigate();

  // Logic States
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Connection Monitor
  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    
    // Simple validation for demo
    if (!emailInput || !passwordInput) {
      setLoginError("Please enter both email and password.");
      return;
    }

    try {
      // Logic for login goes here
      console.log("Logging in with:", emailInput);
      navigate("/dashboard");
    } catch (err: any) {
      setLoginError("Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-x-hidden relative">
      
      {/* HEADER / NAV AREA */}
      <header className="w-full px-8 lg:px-16 py-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-[#139dc7] tracking-tighter uppercase">HealthSense</span>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1 bg-white/40 rounded-full border border-white/40 backdrop-blur-md">
          <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-[10px] font-bold text-[#139dc7] uppercase tracking-wider">
            {isOnline ? 'System Online' : 'System Offline'}
          </span>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center w-full px-6 lg:px-12 pb-12 mx-auto overflow-x-hidden">
        
        {/* INNER WRAPPER: This acts as the boundary. 
          Increasing the gap to 24 (96px) ensures that even at 125% zoom, 
          the text and the card don't feel like they are "touching."
        */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-24 w-full max-w-[1440px]">

          {/* LEFT SECTION: BRANDING */}
          <div className="text-center lg:text-left flex flex-col items-center lg:items-start gap-3 shrink-0">
            <p className="text-[clamp(18px,4vw,36px)] font-bold text-[#139dc7] m-0 leading-none">
              Welcome to
            </p>
            
            {/* H1: Clamped to 115px. 
              The pr/mr fix ensures the italic "e" isn't cut off by the background clip. 
            */}
            <h1 className="text-[clamp(42px,10vw,115px)] font-bold leading-tight m-0 bg-gradient-to-r from-[#139dc7] to-[#34A0A4] bg-clip-text text-transparent select-none lg:whitespace-nowrap italic lg:not-italic pr-[0.2em] -mr-[0.2em]">
              HealthSense
            </h1>
            
            <p className="text-[clamp(14px,2.5vw,22px)] font-light text-[#139dc7] leading-tight w-full lg:max-w-[90%] opacity-80 mt-1">
              View your health checkup results securely and conveniently online
            </p>
          </div>

          {/* RIGHT SECTION: LOGIN CARD */}
          {/* Fixed width at 479px is safer for 125% zoom than 527px. 
            shrink-0 prevents Flexbox from squishing the box when the screen gets tight.
          */}
          <div className="w-full max-w-[479px] shrink-0">
            <div className="relative w-full min-h-[560px] bg-white/20 backdrop-blur-[40px] rounded-[32px] border border-white/30 shadow-[0_20px_50px_rgba(20,60,120,0.15),inset_0_1px_20px_rgba(255,255,255,0.3)] flex items-center justify-center p-8 sm:p-10 overflow-hidden">
              
              {/* Inner Card Glow Effect */}
              <div className="absolute -top-[20%] -right-[20%] w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] bg-[#139dc7]/10 rounded-full blur-[70px] sm:blur-[90px]" />

              <form className="w-full max-w-[340px] flex flex-col gap-5 sm:gap-6 z-10" onSubmit={handleLogin}>
                <div className="text-center space-y-2">
                  <h2 className="text-4xl sm:text-5xl font-normal text-[#139dc7] tracking-tight m-0">Welcome</h2>
                  <p className="text-xs sm:text-base font-medium text-[#139dc7]/70">Log in using your account to proceed</p>
                </div>

                {loginError && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-600 text-[10px] sm:text-sm py-2 px-3 rounded-lg text-center animate-bounce">
                    {loginError}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[11px] sm:text-sm font-semibold text-[#139dc7] ml-1">Email</label>
                  <input 
                    type="text" 
                    placeholder="firstname.lastname"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full h-12 sm:h-14 bg-transparent border-2 border-black rounded-xl px-5 text-[#222] placeholder:text-gray-500 focus:border-[#139dc7] outline-none transition-all text-sm sm:text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] sm:text-sm font-semibold text-[#139dc7] ml-1">Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full h-12 sm:h-14 bg-transparent border-2 border-black rounded-xl pl-5 pr-14 text-[#222] placeholder:text-gray-500 focus:border-[#139dc7] outline-none transition-all text-sm sm:text-lg"
                    />
                    <button 
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-[#139dc7]"
                    >
                      {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full h-12 sm:h-14 bg-gradient-to-b from-[#B6CCFE] to-[#4cb5d4] rounded-xl text-black font-bold text-lg sm:text-xl shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-1 active:scale-95 transition-all mt-2"
                >
                  Log in
                </button>

                <button type="button" className="text-sm sm:text-base font-medium text-gray-500 hover:text-[#139dc7] transition-colors">
                  Forgot Password?
                </button>

                <p className="text-[10px] sm:text-xs text-gray-500 text-center leading-relaxed mt-4 sm:mt-6">
                  By signing up, you agree to the <br/>
                  <span className="text-[#139dc7] font-bold cursor-pointer">Terms of Service</span> and <span className="text-[#139dc7] font-bold cursor-pointer">Data Processing Agreement</span>
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-8 text-center">
        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#139dc7] opacity-40">
          HealthSense Infrastructure v2.0
        </span>
      </footer>
    </div>
  );
};

export default Home;