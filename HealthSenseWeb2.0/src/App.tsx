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
// Static pages
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfUse from './pages/TermsOfUse'
import ContactSupport from './pages/ContactSupport'
import HelpCenter from './pages/HelpCenter'

// ─── Reusable route guards ────────────────────────────────────────────────────

/** Requires login AND a specific role. Redirects to /login if unauthenticated,
 *  or to the appropriate dashboard if the role doesn't match. */
function ProtectedRoute({
  isAuthenticated,
  role,
  requiredRole,
  children,
}: {
  isAuthenticated: boolean
  role: string | null
  requiredRole: 'patient' | 'admin'
  children: React.ReactNode
}) {
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (requiredRole === 'admin' && role !== 'admin') return <Navigate to="/dashboard" replace />
  if (requiredRole === 'patient' && role === 'admin') return <Navigate to="/admin" replace />
  return children
}

// ─────────────────────────────────────────────────────────────────────────────

function App() {
  const [session, setSession] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchUserData(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchUserData(session.user.id)
      } else {
        setRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('large_text, role')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Supabase Error:', error.message)
        // FIX: default to 'patient' on error — never default to 'admin'
        setRole('patient')
        return
      }

      if (data) {
        if (data.large_text) {
          document.documentElement.classList.add('large-text-mode')
        } else {
          document.documentElement.classList.remove('large-text-mode')
        }
        // FIX: only accept known roles; anything else falls back to 'patient'
        setRole(data.role === 'admin' ? 'admin' : 'patient')
      }
    } catch (err) {
      console.error('Unexpected Error fetching user data:', err)
      setRole('patient')
    } finally {
      setLoading(false)
    }
  }

  // FIX: show a minimal spinner instead of returning null —
  // prevents a flash of the wrong page on slow networks
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)]">
        <div className="w-8 h-8 border-2 border-[#139dc7]/30 border-t-[#139dc7] rounded-full animate-spin" />
      </div>
    )
  }

  const isAuthenticated = !!session
  const isAdmin = role === 'admin'

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/" element={<Landing />} />

        <Route
          path="/login"
          element={
            !isAuthenticated
              ? <Login />
              : (isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />)
          }
        />

        {/* /reset-password is public — RecoveryPassword must validate the token from URL hash */}
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ── Static / legal pages — always public, no auth required ── */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfUse />} />
        <Route path="/support" element={<ContactSupport />} />
        <Route path="/help" element={<HelpCenter />} />

        {/* ── Patient-only protected routes ── */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} role={role} requiredRole="patient">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        {/* FIX: /profile now requires patient role — admins are redirected to /admin */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} role={role} requiredRole="patient">
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} role={role} requiredRole="patient">
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/results"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} role={role} requiredRole="patient">
              <Result />
            </ProtectedRoute>
          }
        />

        {/* ── Admin-only protected routes ── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} role={role} requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all — must be last */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App