import "../styles/navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-left">
        <span className="logo">HealthSense</span>
      </div>

      <div className="nav-right">
        <a href="#" className="about-btn">About Us</a>
      </div>
    </nav>
  );
}

export default Navbar;