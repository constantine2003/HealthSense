import React from 'react';
import '../styles/results.css'; // We will create this next

const ResultCard = ({ title, value, unit, status, statusType, icon }) => {
  // statusType should be 'success', 'warning', or 'danger'
  
  return (
    <div className="health-card">
      <div className="card-header">
        <div className={`icon-box ${statusType}-bg`}>{icon}</div>
        <span className="card-title">{title}</span>
      </div>

      <div className="value-container">
        <span className="main-value">{value}</span>
        <span className="unit">{unit}</span>
      </div>

      <div className={`status-badge ${statusType}`}>
        {status}
      </div>

      <div className="range-wrapper">
        <div className={`range-fill ${statusType}-fill`}></div>
      </div>
    </div>
  );
};

export default ResultCard;