import "../styles/navbar.css";
import { useNavigate } from "react-router-dom";
import { FaUser } from "react-icons/fa"; // FontAwesome
import { FiLogOut } from "react-icons/fi"; // Feather Icons

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Example: clear user session
    // localStorage.removeItem("userToken");
    // Do any other cleanup...

    navigate("/"); // navigate to Home after logout
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <span className="logo">HealthSense</span>
      </div>

      <div className="nav-right">
        <button className="about-btn">
          <FaUser  style={{ marginRight: "6px" }} />
          Profile
        </button>
        <button className="about-btn" onClick={handleLogout}>
          <FiLogOut  style={{ marginRight: "6px" }} />
          Log-Out
        </button>
      </div>
    </nav>
  );
}

export default Navbar;