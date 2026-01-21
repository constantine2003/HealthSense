import { Routes, Route } from "react-router-dom";
import Home from "./pages/home.jsx";
import Dashboard from "./pages/dashboard";
import Results from "./pages/results.jsx";
import History from "./pages/history";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/results" element={<Results />} />
      <Route path="/history" element={<History />} />
    </Routes>
  );
}

export default App;