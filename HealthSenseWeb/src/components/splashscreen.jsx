import React from "react";
import healthFacts from "../data/healthfacts"; // adjust path

function SplashScreen() {
  // Array of random health facts
  const randomFact = healthFacts[Math.floor(Math.random() * healthFacts.length)];

  // Container styles
  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    width: "100vw",
    backgroundColor: "#B6CCFE",
    overflow: "hidden",
    textAlign: "center",
    padding: "20px",
    boxSizing: "border-box",
  };

  // Main title styles (logo)
  const textStyle = {
    fontFamily: "'Lexend', sans-serif",
    fontSize: "clamp(24px, 8vw, 64px)",
    fontWeight: 700,
    color: "#139dc7",
    opacity: 0,
    animation: "fadeScale 1.5s ease forwards",
    marginBottom: "8px", // closer gap to fact
  };

  // Fact text styles – same animation as logo
  const factStyle = {
    fontFamily: "'Lexend', sans-serif",
    fontSize: "clamp(14px, 3vw, 20px)",
    fontWeight: 300,
    color: "#139dc7",
    marginTop: "0px", // remove extra gap
    maxWidth: "90%",
    lineHeight: 1.4,
    opacity: 0,
    animation: "fadeScale 1.5s ease forwards", // same animation
    animationDelay: "0.3s", // slightly after logo
  };

  // Keyframes for fade + scale
  const animationStyle = `
    @keyframes fadeScale {
      0% { opacity: 0; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.05); }
      100% { opacity: 1; transform: scale(1); }
    }
  `;

  return (
    <div style={containerStyle}>
      <style>{animationStyle}</style>
      <h1 style={textStyle}>HealthSense</h1>
      <p style={factStyle}>{randomFact}</p>
    </div>
  );
}

export default SplashScreen;
