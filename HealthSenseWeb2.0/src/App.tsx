import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/adminDashboard' // Import your new page
import Profile from './pages/Profile'
import History from './pages/History'
import Result from './pages/Results'
import ResetPassword from './pages/RecoveryPassword'

function App() {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null); // New role state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
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

  // Combined helper to fetch preferences AND role
  // Combined helper to fetch preferences AND role
  const fetchUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("large_text, role")
        .eq("id", userId)
        .single();

      // Check if error exists (This clears your TypeScript warning)
      if (error) {
        console.error("Supabase Error:", error.message);
        setRole('patient'); // Fallback for safety
        return;
      }

      if (data) {
        // Apply Large Text class
        if (data.large_text) {
          document.documentElement.classList.add('large-text-mode');
        } else {
          document.documentElement.classList.remove('large-text-mode');
        }
        
        // Set role (default to patient if null)
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
        {/* LOGIN REDIRECT LOGIC */}
        <Route path="/" element={
          !isAuthenticated 
            ? <Login /> 
            : (isAdmin ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />)
        } />
        
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* PATIENT PROTECTED ROUTES */}
        <Route 
          path="/dashboard" 
          element={isAuthenticated && !isAdmin ? <Dashboard /> : <Navigate to="/" />} 
        />
        <Route 
          path="/profile" 
          element={isAuthenticated ? <Profile /> : <Navigate to="/" />} 
        />
        <Route 
          path="/history" 
          element={isAuthenticated && !isAdmin ? <History /> : <Navigate to="/" />} 
        />
        <Route 
          path="/results" 
          element={isAuthenticated && !isAdmin ? <Result /> : <Navigate to="/" />} 
        />

        {/* ADMIN PROTECTED ROUTES */}
        <Route 
          path="/admin" 
          element={isAuthenticated && isAdmin ? <AdminDashboard /> : <Navigate to="/" />} 
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App