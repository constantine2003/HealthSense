import React from "react";
import "../styles/history.css";
import Navbar from "../components/navbar2";
import BackButton from "../components/backbutton";
import { FiActivity, FiThermometer, FiHeart, FiBarChart } from 'react-icons/fi';
import { MdHeight, MdMonitorWeight } from 'react-icons/md';

const checkupHistory = [
  { id: 1, date: "Jan 23, 2026", time: "14:20", stats: { spo2: "99", temp: "36.6", height: "1.75", weight: "70", bmi: "22.9", bp: "120/80" } }, // success (green)
  { id: 2, date: "Jan 25, 2026", time: "14:20", stats: { spo2: "97", temp: "37.8", height: "1.75", weight: "74", bmi: "24.1", bp: "130/85" } }, // warning/caution (orange)
  { id: 3, date: "Jan 22, 2026", time: "14:20", stats: { spo2: "92", temp: "39.5", height: "1.45", weight: "90", bmi: "42.7", bp: "160/100" } }, // risk (red)

  // New entries to show 3 colors clearly
  { id: 4, date: "Jan 26, 2026", time: "09:30", stats: { spo2: "99", temp: "36.4", height: "1.70", weight: "65", bmi: "22.5", bp: "118/78" } }, // success (green)
  { id: 5, date: "Jan 27, 2026", time: "11:15", stats: { spo2: "96", temp: "37.6", height: "1.68", weight: "68", bmi: "24.1", bp: "125/82" } }, // warning/caution (orange)
  { id: 6, date: "Jan 28, 2026", time: "15:45", stats: { spo2: "93", temp: "39.0", height: "1.60", weight: "85", bmi: "33.2", bp: "150/95" } },  // risk (red)
  // New entries to show 3 colors clearly
  { id: 7, date: "Jan 26, 2026", time: "09:30", stats: { spo2: "99", temp: "36.4", height: "1.70", weight: "65", bmi: "22.5", bp: "118/78" } }, // success (green)
  { id: 8, date: "Jan 27, 2026", time: "11:15", stats: { spo2: "96", temp: "37.6", height: "1.68", weight: "68", bmi: "24.1", bp: "125/82" } }, // warning/caution (orange)
  { id: 9, date: "Jan 28, 2026", time: "15:45", stats: { spo2: "93", temp: "39.0", height: "1.60", weight: "85", bmi: "33.2", bp: "150/95" } }  // risk (red)
];


// Function to determine status type based on metric value
const getMetricStatus = (metric, value) => {
  let statusType = "danger";

  switch (metric) {
    case "spo2":
      value = Number(value);
      if (value < 95) statusType = "danger";
      else if (value <= 98) statusType = "warning";
      else if (value <= 100) statusType = "success";
      break;

    case "temp":
      value = Number(value);
      if (value < 35) statusType = "danger";
      else if (value < 36) statusType = "warning";
      else if (value <= 37.5) statusType = "success";
      else if (value <= 39) statusType = "warning";
      else statusType = "danger";
      break;

    case "bmi":
    case "weight":
      value = Number(value);
      if (value < 18.5) statusType = "warning";
      else if (value < 25) statusType = "success";
      else if (value < 30) statusType = "warning";
      else statusType = "danger";
      break;

    case "height":
      value = Number(value);
      if (value < 1.5) statusType = "danger";
      else statusType = "success";
      break;

    case "bp":
      if (typeof value === "string" && value.includes("/")) {
        const [systolic, diastolic] = value.split("/").map(Number);
        if (systolic < 90 || diastolic < 60) statusType = "warning";
        else if (systolic <= 120 && diastolic <= 80) statusType = "success";
        else if (systolic <= 139 || diastolic <= 89) statusType = "warning";
        else statusType = "danger";
      }
      break;

    default:
      statusType = "danger";
  }

  return statusType;
};

// Function to convert statusType to a color
const getStatusColor = (statusType) => {
  return statusType === "success" ? "#22c55e" 
       : statusType === "warning" ? "#F97316"
       : "#EF4444";
};

// Function to determine overall status
const getOverallStatus = (stats) => {
  const types = [
    getMetricStatus("spo2", stats.spo2),
    getMetricStatus("temp", stats.temp),
    getMetricStatus("bmi", stats.bmi),
    getMetricStatus("weight", stats.weight),
    getMetricStatus("height", stats.height),
    getMetricStatus("bp", stats.bp),
  ];

  if (types.includes("danger")) return { status: "risk", label: "At Risk" }; // any danger → red
  if (types.includes("warning")) return { status: "warning", label: "Alert" }; // any warning → orange
  return { status: "success", label: "Normal" }; // all success → green
};

const History = () => {
  return (
    <div className="main-container">
      <Navbar />
      <div className="history-content">
        
          <div className="history-box">
            <div className="top">
              <BackButton />
              <p className="toptext">History</p>
            </div>

            <div className="history-list">
              {checkupHistory.map((item) => {
                const overall = getOverallStatus(item.stats); // compute per item

                return (
                  <div key={item.id} className="history-item">
                    <div className="date-section">
                      <span className="date-text">{item.date}</span>
                      <span className="time-text">{item.time}</span>
                    </div>

                    <div className="stats-preview">
                      <div className="mini-stat">
                        <FiActivity color={getStatusColor(getMetricStatus("spo2", item.stats.spo2))} /> {item.stats.spo2}%
                      </div>
                      <div className="mini-stat">
                        <FiThermometer color={getStatusColor(getMetricStatus("temp", item.stats.temp))} /> {item.stats.temp}°C
                      </div>
                      <div className="mini-stat">
                        <FiBarChart color={getStatusColor(getMetricStatus("bmi", item.stats.bmi))} /> {item.stats.bmi}
                      </div>
                      <div className="mini-stat">
                        <MdMonitorWeight color={getStatusColor(getMetricStatus("weight", item.stats.weight))} /> {item.stats.weight}kg
                      </div>
                      <div className="mini-stat">
                        <MdHeight color={getStatusColor(getMetricStatus("height", item.stats.height))} /> {item.stats.height}m
                      </div>
                      <div className="mini-stat">
                        <FiHeart color={getStatusColor(getMetricStatus("bp", item.stats.bp))} /> {item.stats.bp}
                      </div>
                    </div>

                    {/* <div className={`status-indicator ${overall.status}`}>
                      {overall.label}
                    </div> */}

                    <button className="details-arrow">View details</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    
  );
};

export default History;
