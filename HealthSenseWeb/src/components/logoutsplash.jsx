import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SplashScreen from "../components/splashscreen";
import { supabase } from "../supabaseClient";

export default function LogoutSplash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        localStorage.removeItem("userToken");
      } catch (err) {
        console.error("Logout failed:", err.message);
        alert("Failed to log out. Try again.");
      }
      navigate("/");
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return <SplashScreen />;
}
