// BackButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";

const BackButton = () => {
  const navigate = useNavigate();

  const buttonStyle = {
    width: "clamp(30px, 3vw, 45px)",
    height: "clamp(30px, 3vw, 35px)",
    border: "none",
    borderRadius: "8px",
    background: "linear-gradient(to bottom, #90E0EF, #B6CCFE)",
    fontSize: "clamp(14px, 2vw, 16px)",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    left: 0,
    transition: "transform 0.1s ease",
  };

  const handleMouseDown = (e) => {
    e.currentTarget.style.transform = "scale(0.98)";
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
    >
      <IoArrowBack size={24} />
    </button>
  );
};

export default BackButton;
