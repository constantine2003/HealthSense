import React from "react";
import "../styles/history.css";
import Navbar from "../components/navbar2";

const History = () => {
  return (
    <div className="main-container">
      <Navbar />
      <div className="history-content">
        <div className="history-body">
          <h1>History</h1>
        </div>
      </div>
    </div>
  );
};

export default History;
