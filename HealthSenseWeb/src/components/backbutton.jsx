import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const BackButton = () => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const buttonStyle = {
    width: "clamp(30px, 3vw, 45px)",
    height: "clamp(30px, 3vw, 35px)",
    border: "none",
    borderRadius: "8px",
    background: isHovered 
      ? "linear-gradient(to bottom, #A2E9F7, #C4D6FF)" 
      : "linear-gradient(to bottom, #90E0EF, #B6CCFE)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    left: 0,
    transition: "all 0.2s ease",
    boxShadow: isHovered ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
  };

  const handleMouseDown = (e) => {
    e.currentTarget.style.transform = "scale(0.95)";
  };

  const handleMouseUp = (e) => {
    e.currentTarget.style.transform = "scale(1)";
  };

  return (
    <button
      style={buttonStyle}
      onClick={() => navigate("/dashboard")}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Go back to dashboard"
    >
      {/* Fresh, Custom SVG Icon */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#2B3A67" 
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
    </button>
  );
};

export default BackButton;