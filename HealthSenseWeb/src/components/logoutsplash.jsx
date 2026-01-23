import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SplashScreen from "../components/splashscreen";

export default function LogoutSplash() {
  const navigate = useNavigate();

  useEffect(() => {
    // Navigate to Home after splash animation duration
    const timer = setTimeout(() => {
      navigate("/"); // Home page
    }, 1500); // match splash animation
    return () => clearTimeout(timer);
  }, [navigate]);

  return <SplashScreen />;
}
