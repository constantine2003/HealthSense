import React from "react";
import "../styles/results.css";
import Navbar from "../components/navbar2";

const Results = () => {
  return (
    <div className="main-container">
      <Navbar />
      <div className="lastresults-content">
        <div className="lastresults-body">
          <h1>Last results</h1>
        </div>
      </div>
    </div>
  );
};

export default Results;