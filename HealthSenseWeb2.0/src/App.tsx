import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import History from './pages/History'
import Result from './pages/Results'
import ResetPassword from './pages/RecoveryPassword' // Added this

function App() {
  // Logic placeholder: replace with your actual auth state (e.g., Supabase session)
  const isAuthenticated = true; 

  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Login />} />
        
        {/* This must be public so users can reset after clicking their email link */}
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* PROTECTED ROUTES */}
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/" />} 
        />

        <Route 
          path="/profile" 
          element={isAuthenticated ? <Profile /> : <Navigate to="/" />} 
        />

        <Route 
          path="/history" 
          element={isAuthenticated ? <History /> : <Navigate to="/" />} 
        />

        <Route 
          path="/results" 
          element={isAuthenticated ? <Result /> : <Navigate to="/" />} 
        />

        {/* 404 / REDIRECT */}
        <Route path="*" element={<Navigate to="/" />} />
        
      </Routes>
    </BrowserRouter>
  )
}

export default App