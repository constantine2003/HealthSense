// src/components/ProtectedPageTemplate.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SplashScreen from "../components/splashscreen";
import { supabase } from "../supabaseClient";
import { useAuth } from "../hooks/useAuth";

/**
 * ProtectedPageTemplate
 * @param {ReactNode} children - The actual page content
 */
const ProtectedPageTemplate = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Local splash screen state (2 seconds)
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    if (!loading) {
      // Not logged in → redirect to login
      if (!user) {
        navigate("/");
        return;
      }

      // Keep splash visible for at least 2 seconds
      const timer = setTimeout(() => setSplash(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [user, loading, navigate]);

  // Show splash screen while loading user data
  if (loading || splash) return <SplashScreen />;

  // Render actual page content
  return <>{children}</>;
};

export default ProtectedPageTemplate;
