import React from "react";
import "../styles/results.css";
import Navbar from "../components/navbar2";

const Results = () => {
  return (
    <div className="main-container">
      <Navbar />
      <div className="lastresults-content">
        <div className="lastresults-body">
          <div className="results-box">
            
            
              <button className="back-btn">Back</button>
              <p className="toptext">Your Results</p>
            
              <div className="results-grid">
                <div className="grid-item">Box 1</div>
                <div className="grid-item">Box 2</div>
                <div className="grid-item">Box 3</div>
                <div className="grid-item">Box 4</div>
                <div className="grid-item">Box 5</div>
                <div className="grid-item">Box 6</div>
              </div>
            {/* different content */}
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;