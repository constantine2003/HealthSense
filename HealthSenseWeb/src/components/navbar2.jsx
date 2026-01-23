import "../styles/navbar.css";
import { useNavigate } from "react-router-dom";
import { FaUser } from "react-icons/fa"; // FontAwesome
import { IoPersonOutline } from "react-icons/io5"; // Ionicons
import { MdPerson } from "react-icons/md"; // Material Design
import { FiLogOut } from "react-icons/fi"; // Feather Icons
import { MdLogout } from "react-icons/md"; // Material Design
import { IoExitOutline } from "react-icons/io5"; // Ionicons
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
          <FaUser size={18} style={{ marginRight: "6px" }} />
          Profile
        </button>
        <button className="about-btn" onClick={handleLogout}>
          <FiLogOut size={18} style={{ marginRight: "6px" }} />
          Log-Out
        </button>
      </div>
    </nav>
  );
}

export default Navbar;