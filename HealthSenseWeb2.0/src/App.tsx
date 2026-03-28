import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/adminDashboard'
import Profile from './pages/Profile'
import History from './pages/History'
import Result from './pages/Results'
import ResetPassword from './pages/RecoveryPassword'

function App() {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserData(session.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("large_text, role")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Supabase Error:", error.message);
        setRole('patient');
        return;
      }

      if (data) {
        if (data.large_text) {
          document.documentElement.classList.add('large-text-mode');
        } else {
          document.documentElement.classList.remove('large-text-mode');
        }
        setRole(data.role || 'patient');
      }
    } catch (err) {
      console.error("Unexpected Error fetching user data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  const isAuthenticated = !!session;
  const isAdmin = role === 'admin';

  return (
    <BrowserRouter>
      <Routes>
        {/* LANDING PAGE — always accessible */}
        <Route path="/" element={<Landing />} />

        {/* LOGIN — redirect if already logged in */}
        <Route path="/login" element={
          !isAuthenticated
            ? <Login />
            : (isAdmin ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />)
        } />

        <Route path="/reset-password" element={<ResetPassword />} />

        {/* PATIENT PROTECTED ROUTES */}
        <Route
          path="/dashboard"
          element={isAuthenticated && !isAdmin ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={isAuthenticated ? <Profile /> : <Navigate to="/login" />}
        />
        <Route
          path="/history"
          element={isAuthenticated && !isAdmin ? <History /> : <Navigate to="/login" />}
        />
        <Route
          path="/results"
          element={isAuthenticated && !isAdmin ? <Result /> : <Navigate to="/login" />}
        />

        {/* ADMIN PROTECTED ROUTES */}
        <Route
          path="/admin"
          element={isAuthenticated && isAdmin ? <AdminDashboard /> : <Navigate to="/login" />}
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App