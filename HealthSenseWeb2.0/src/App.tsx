import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import History from './pages/History'
import Result from './pages/Results' // [1] Import the new Result page

function App() {
  // Logic placeholder: replace with your actual auth state
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

        {/* HISTORY ROUTE */}
        <Route 
          path="/history" 
          element={isAuthenticated ? <History /> : <Navigate to="/" />} 
        />

        {/* LATEST RESULTS ROUTE [2] */}
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