import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient' // Make sure this path is correct
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import History from './pages/History'
import Result from './pages/Results'
import ResetPassword from './pages/RecoveryPassword'

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check for active session on mount (Fixes the new tab issue)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchPreferences(session.user.id);
      setLoading(false);
    });

    // 2. Listen for auth changes (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchPreferences(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 3. Helper to apply Large Text globally when app starts
  const fetchPreferences = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("large_text")
      .eq("id", userId)
      .single();

    if (data?.large_text) {
      document.documentElement.classList.add('large-text-mode');
    } else {
      document.documentElement.classList.remove('large-text-mode');
    }
  };

  if (loading) return null; // Or a splash screen for your kiosk

  const isAuthenticated = !!session;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* PROTECTED ROUTES */}
        <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/" />} />
        <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/" />} />
        <Route path="/history" element={isAuthenticated ? <History /> : <Navigate to="/" />} />
        <Route path="/results" element={isAuthenticated ? <Result /> : <Navigate to="/" />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App