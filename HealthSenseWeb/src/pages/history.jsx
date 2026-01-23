import React from "react";
import "../styles/history.css";
import Navbar from "../components/navbar2";
import BackButton from "../components/backbutton";
import "../styles/results.css";  
const History = () => {
  return (
    <div className="main-container">
      <Navbar />
      <div className="history-content">
        <div className="history-body">
          <div className="history-box">
            <div className="top">

            <BackButton/>

            <p className="toptext">History</p>
            
            </div>
            <p>saiduhaiosudasdusduhaioddddddddddd</p><p>saiduhaiosudasdddddddddddddd</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default History;
