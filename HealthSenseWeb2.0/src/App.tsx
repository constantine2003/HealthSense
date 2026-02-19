import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile' // New Import

function App() {
  // Logic placeholder: currently set to true for development
  const isAuthenticated = true; 

  return (
    <BrowserRouter>
      <Routes>
        {/* LOGIN ROUTE */}
        <Route path="/" element={<Login />} />

        {/* DASHBOARD ROUTE */}
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/" />} 
        />

        {/* PROFILE ROUTE */}
        <Route 
          path="/profile" 
          element={isAuthenticated ? <Profile /> : <Navigate to="/" />} 
        />

        {/* 404 / REDIRECT - Essential for Kiosk Mode */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App