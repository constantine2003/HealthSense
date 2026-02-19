import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        {/* We'll add the dashboard route here next */}
      </Routes>
    </BrowserRouter>
  )
}

export default App