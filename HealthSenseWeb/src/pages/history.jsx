import React, { useState, useEffect } from "react";
import "../styles/history.css";
import Navbar from "../components/navbar2";
import BackButton from "../components/backbutton";
import SplashScreen from "../components/splashscreen";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { FiActivity, FiThermometer, FiHeart, FiBarChart } from 'react-icons/fi';
import { MdHeight, MdMonitorWeight } from 'react-icons/md';

// ================================
// Evaluate metrics (same as dashboard logic)
// ================================
const evaluateMetrics = (checkup) => {
  const healthData = [];

  const isValidNumber = (n) => n !== null && n !== undefined && !isNaN(n);

  const spo2 = Number(checkup.spo2 || 0);
  const temp = Number(checkup.temperature || 0);
  const height = Number(checkup.height || 0);
  const weight = Number(checkup.weight || 0);
  const bmiVal = Number(checkup.bmi || 0);
  const bp = checkup.blood_pressure ? checkup.blood_pressure.toString().trim() : "-";

  // --- SpO2 ---
  let spo2Status = "Unknown", spo2Type = "danger";
  if (isValidNumber(spo2)) {
    if (spo2 < 95) { spo2Status = "Low"; spo2Type = "danger"; }
    else if (spo2 <= 98) { spo2Status = "Normal"; spo2Type = "warning"; }
    else { spo2Status = "Excellent"; spo2Type = "success"; }
  }
  healthData.push({
    title: "SpO2",
    value: spo2 || "-",
    unit: "%",
    status: spo2Status,
    statusType: spo2Type,
    icon: <FiActivity color={spo2Type === "success" ? "#22c55e" : spo2Type === "warning" ? "#F97316" : "#EF4444"} style={{ fontSize: "clamp(24px, 5vw, 35px)" }} />
  });

  // --- Temperature ---
  let tempStatus = "Unknown", tempType = "danger";
  if (isValidNumber(temp)) {
    if (temp < 35) { tempStatus = "Hypothermia"; tempType = "danger"; }
    else if (temp < 36) { tempStatus = "Low"; tempType = "warning"; }
    else if (temp <= 37.5) { tempStatus = "Normal"; tempType = "success"; }
    else if (temp <= 39) { tempStatus = "Fever"; tempType = "warning"; }
    else { tempStatus = "High Fever"; tempType = "danger"; }
  }
  healthData.push({
    title: "Temperature",
    value: temp || "-",
    unit: "°C",
    status: tempStatus,
    statusType: tempType,
    icon: <FiThermometer color={tempType === "success" ? "#22c55e" : tempType === "warning" ? "#F97316" : "#EF4444"} style={{ fontSize: "clamp(24px, 5vw, 40px)" }} />
  });

  // --- Height ---
  let heightStatus = "Unknown", heightType = "danger";
  if (isValidNumber(height)) {
    if (height < 1.5) { heightStatus = "Below Average"; heightType = "danger"; }
    else if (height <= 1.75) { heightStatus = "Average"; heightType = "success"; }
    else { heightStatus = "Above Average"; heightType = "success"; }
  }
  healthData.push({
    title: "Height",
    value: height || "-",
    unit: "m",
    status: heightStatus,
    statusType: heightType,
    icon: <MdHeight color={heightType === "success" ? "#22c55e" : "#EF4444"} style={{ fontSize: "clamp(24px, 5vw, 40px)" }} />
  });

  // --- Weight & BMI ---
  let weightStatus = "Unknown", weightType = "danger", bmiValue = "-", bmiStatus = "Unknown", bmiType = "danger";
  if (isValidNumber(bmiVal) && bmiVal !== 0) bmiValue = bmiVal.toFixed(1);
  else if (isValidNumber(weight) && isValidNumber(height) && height > 0) bmiValue = (weight / (height ** 2)).toFixed(1);

  if (bmiValue !== "-") {
    const bmiNum = parseFloat(bmiValue);
    if (bmiNum < 18.5) { bmiStatus = "Underweight"; bmiType = "warning"; weightStatus = "Underweight"; weightType = "warning"; }
    else if (bmiNum < 25) { bmiStatus = "Normal"; bmiType = "success"; weightStatus = "Normal"; weightType = "success"; }
    else if (bmiNum < 30) { bmiStatus = "Overweight"; bmiType = "warning"; weightStatus = "Overweight"; weightType = "warning"; }
    else { bmiStatus = "Obese"; bmiType = "danger"; weightStatus = "Obese"; weightType = "danger"; }
  }

  healthData.push({
    title: "Weight",
    value: weight || "-",
    unit: "kg",
    status: weightStatus,
    statusType: weightType,
    icon: <MdMonitorWeight color={weightType === "success" ? "#22c55e" : weightType === "warning" ? "#F97316" : "#EF4444"} style={{ fontSize: "clamp(24px, 5vw, 40px)" }} />
  });

  healthData.push({
    title: "BMI",
    value: bmiValue,
    unit: "",
    status: bmiStatus,
    statusType: bmiType,
    icon: <FiBarChart color={bmiType === "success" ? "#22c55e" : bmiType === "warning" ? "#F97316" : "#EF4444"} style={{ fontSize: "clamp(24px, 5vw, 35px)" }} />
  });

  // --- Blood Pressure ---
  let bpStatus = "Unknown", bpType = "danger";
  if (bp.includes("/")) {
    const [systolic, diastolic] = bp.split("/").map(Number);
    if (!isNaN(systolic) && !isNaN(diastolic)) {
      if (systolic < 90 || diastolic < 60) { bpStatus = "Low"; bpType = "warning"; }
      else if (systolic <= 120 && diastolic <= 80) { bpStatus = "Ideal"; bpType = "success"; }
      else if (systolic <= 139 || diastolic <= 89) { bpStatus = "Elevated"; bpType = "warning"; }
      else { bpStatus = "High"; bpType = "danger"; }
    }
  }
  healthData.push({
    title: "Blood Pressure",
    value: bp,
    unit: "mmHg",
    status: bpStatus,
    statusType: bpType,
    icon: <FiHeart color={bpType === "success" ? "#22c55e" : bpType === "warning" ? "#F97316" : "#EF4444"} style={{ fontSize: "clamp(24px, 5vw, 40px)" }} />
  });

  return healthData;
};

// Generate a simple AI summary based on metrics
const getAISummary = (metrics) => {
  const types = metrics.map(m => m.statusType);
  if (types.includes("danger")) {
    return "Some results are at risk. Please consult a healthcare professional.";
  } else if (types.includes("warning")) {
    return "Some results are slightly out of range. Monitor your health.";
  } else {
    return "All results are within normal range. Keep up the good work!";
  }
};

// ================================
// Main Component
// ================================

const History = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [splash, setSplash] = useState(true);
  const [history, setHistory] = useState([]);
  const [selectedCheckup, setSelectedCheckup] = useState(null);

  // Fetch user history
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/"); // redirect if not logged in
      return;
    }

    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("health_checkups")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }); // latest first

      if (error) {
        console.error("Failed to fetch history:", error.message);
      } else {
        setHistory(data || []);
      }

      setTimeout(() => setSplash(false), 2000); // splash for 2s
    };

    fetchHistory();
  }, [authLoading, user, navigate]);

  // Show splash while loading
  if (authLoading || splash) return <SplashScreen />;

  // Function to determine overall status for item
  const getOverallStatus = (metrics) => {
    const types = metrics.map((m) => m.statusType);
    if (types.includes("danger")) return { status: "risk", label: "At Risk" };
    if (types.includes("warning")) return { status: "warning", label: "Alert" };
    return { status: "success", label: "Normal" };
  };

  return (
    <div className="main-container">
      <Navbar />
      <div className="history-content">
        <div className="history-box">
          <div className="top">
            <BackButton />
            <p className="toptext">History</p>
            
          </div>

            <p className="toptext" style={{ fontSize: "1rem", color: "#666" }}>
              {history.length === 0
                ? "No data collected."
                : "Review your past health checkups below."}
            </p>
          
          <div className="history-list">
            {history.map((item) => {
              const metrics = evaluateMetrics(item);
              const overall = getOverallStatus(metrics);
              const dateObj = new Date(item.created_at);
              const dateStr = dateObj.toLocaleDateString();
              const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={item.id} className="history-item">
                  <div className="date-section">
                    <span className="date-text">{dateStr}</span>
                    <span className="time-text">{timeStr}</span>
                  </div>

                  <div className="stats-preview">
                    {metrics.map((m, idx) => (
                      <div key={idx} className="mini-stat">
                        {m.icon} {m.value}{m.unit}
                      </div>
                    ))}
                  </div>

                  <button className="details-arrow" onClick={() => setSelectedCheckup(item)}>View details</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Modal for details */}
      {selectedCheckup && (() => {
        const metrics = evaluateMetrics(selectedCheckup);
        const aiSummary = getAISummary(metrics);
        return (
          <div className="modal-overlay" onClick={() => setSelectedCheckup(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedCheckup(null)}>&times;</button>
              <h2 style={{ marginBottom: 8 }}>Checkup Details</h2>
              <div style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>
                {new Date(selectedCheckup.created_at).toLocaleString()}
              </div>
              <div className="modal-metrics">
                {metrics.map((m, idx) => (
                  <div key={idx} className={`modal-metric metric-${m.statusType}`}>
                    <div className="metric-icon">{m.icon}</div>
                    <div className="metric-info">
                      <div className="metric-title">{m.title}</div>
                      <div className="metric-value">{m.value}{m.unit}</div>
                      <div className={`metric-status status-${m.statusType}`}>{m.status}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="modal-extra">
                <div style={{ marginBottom: 6, color: '#168AAD', fontWeight: 600 }}>
                  <b>System Summary:</b> {aiSummary}
                </div>
                <div><b>Notes:</b> {selectedCheckup.notes || "-"}</div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default History;
