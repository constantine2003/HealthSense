import React from "react";
import "../styles/results.css";
import Navbar from "../components/navbar2";
import ResultCard from "../components/resultcard";
import '../styles/resultcard.css';
import { FiActivity, FiThermometer, FiHeart, FiBarChart } from 'react-icons/fi';
import { MdHeight, MdMonitorWeight } from 'react-icons/md';
import { useNavigate } from "react-router-dom";
import BackButton from "../components/backbutton";

// Function to dynamically evaluate health metrics
// ================================
// Evaluate health metrics dynamically
// ================================
const evaluateHealthMetrics = (userData) => {
  const healthData = [];

  // -------------------------------
  // Helper function to validate numeric values
  // -------------------------------
  const isValidNumber = (value) => value !== null && value !== undefined && !isNaN(value);

  // -------------------------------
  // SpO2
  // -------------------------------
  let spo2Status = "Unknown";
  let spo2Type = "danger";
  if (isValidNumber(userData.spo2)) {
    if (userData.spo2 < 95) {
      spo2Status = "Low";
      spo2Type = "danger";
    } else if (userData.spo2 <= 98) {
      spo2Status = "Normal";
      spo2Type = "warning";
    } else if (userData.spo2 <= 100) {
      spo2Status = "Excellent";
      spo2Type = "success";
    } else {
      spo2Status = "Invalid";
      spo2Type = "danger";
    }
  }
  healthData.push({
    title: "SpO2",
    value: userData.spo2 || "-",
    unit: "%",
    status: spo2Status,
    statusType: spo2Type,
    icon: <FiActivity 
          color={spo2Type   === "success" ? "#22c55e" 
                : spo2Type   === "warning" ? "#F97316" 
                : "#EF4444"} 
          size={24} />,
  });

  // -------------------------------
  // Temperature (°C)
  // -------------------------------
  let tempStatus = "Unknown";
  let tempType = "danger";
  if (isValidNumber(userData.temperature)) {
    if (userData.temperature < 35) {
      tempStatus = "Hypothermia";
      tempType = "danger";
    } else if (userData.temperature < 36) {
      tempStatus = "Low";
      tempType = "warning";
    } else if (userData.temperature <= 37.5) {
      tempStatus = "Normal";
      tempType = "success";
    } else if (userData.temperature <= 39) {
      tempStatus = "Fever";
      tempType = "warning";
    } else {
      tempStatus = "High Fever";
      tempType = "danger";
    }
  }
  healthData.push({
    title: "Temperature",
    value: userData.temperature || "-",
    unit: "°C",
    status: tempStatus,
    statusType: tempType,
    icon: <FiThermometer 
          color={tempType === "success" ? "#22c55e" 
                : tempType === "warning" ? "#F97316" 
                : "#EF4444"} 
          size={24} />,
  });

  // -------------------------------
  // Height (m)
  // -------------------------------
  let heightStatus = "Unknown";
  let heightType = "danger";
  if (isValidNumber(userData.height)) {
    if (userData.height < 1.5) {
      heightStatus = "Below Average";
      heightType = "danger";
    } else if (userData.height <= 1.75) {
      heightStatus = "Average";
      heightType = "success";
    } else {
      heightStatus = "Above Average";
      heightType = "success";
    }
  }
  healthData.push({
    title: "Height",
    value: userData.height || "-",
    unit: "m",
    status: heightStatus,
    statusType: heightType,
    icon: <MdHeight 
          color={heightType === "success" ? "#22c55e" 
                : heightType === "warning" ? "#F97316" 
                : "#EF4444"} 
          size={24} />,
  });

  // -------------------------------
  // Weight (kg) – use BMI for classification
  // -------------------------------
  let weightStatus = "Unknown";
  let weightType = "danger";
  if (isValidNumber(userData.weight) && isValidNumber(userData.height)) {
    const bmi = userData.weight / (userData.height ** 2);
    if (bmi < 18.5) {
      weightStatus = "Underweight";
      weightType = "warning";
    } else if (bmi < 25) {
      weightStatus = "Normal";
      weightType = "success";
    } else if (bmi < 30) {
      weightStatus = "Overweight";
      weightType = "warning";
    } else {
      weightStatus = "Obese";
      weightType = "danger";
    }
  }
  healthData.push({
    title: "Weight",
    value: userData.weight || "-",
    unit: "kg",
    status: weightStatus,
    statusType: weightType,
    icon: <MdMonitorWeight 
          color={weightType === "success" ? "#22c55e" 
                : weightType === "warning" ? "#F97316" 
                : "#EF4444"} 
          size={24} />,
  });

  // -------------------------------
  // BMI
  // -------------------------------
  let bmiValue = "-";
  let bmiStatus = "Unknown";
  let bmiType = "danger";
  if (isValidNumber(userData.weight) && isValidNumber(userData.height)) {
    const bmi = userData.weight / (userData.height ** 2);
    bmiValue = bmi.toFixed(1);
    if (bmi < 18.5) {
      bmiStatus = "Underweight";
      bmiType = "warning";
    } else if (bmi < 25) {
      bmiStatus = "Normal";
      bmiType = "success";
    } else if (bmi < 30) {
      bmiStatus = "Overweight";
      bmiType = "warning";
    } else {
      bmiStatus = "Obese";
      bmiType = "danger";
    }
  }
  healthData.push({
    title: "BMI",
    value: bmiValue,
    unit: "",
    status: bmiStatus,
    statusType: bmiType,
    icon: <FiBarChart 
          color={bmiType === "success" ? "#22c55e" 
                : bmiType === "warning" ? "#F97316" 
                : "#EF4444"} 
          size={24} />,
  });

  // -------------------------------
  // Blood Pressure
  // -------------------------------
  let bpStatus = "Unknown";
  let bpType = "danger";
  if (userData.bloodPressure) {
    const [systolic, diastolic] = userData.bloodPressure.split("/").map(Number);
    if (!isNaN(systolic) && !isNaN(diastolic)) {
      if (systolic < 90 || diastolic < 60) {
        bpStatus = "Low";
        bpType = "warning";
      } else if (systolic <= 120 && diastolic <= 80) {
        bpStatus = "Ideal";
        bpType = "success";
      } else if (systolic <= 139 || diastolic <= 89) {
        bpStatus = "Elevated";
        bpType = "warning";
      } else {
        bpStatus = "High";
        bpType = "danger";
      }
    }
  }
  healthData.push({
    title: "Blood Pressure",
    value: userData.bloodPressure || "-",
    unit: "mmHg",
    status: bpStatus,
    statusType: bpType,
    icon: <FiHeart 
          color={bpType === "success" ? "#22c55e" 
                : bpType === "warning" ? "#F97316" 
                : "#EF4444"} 
          size={24} />,
  });

  return healthData;
};

// ------------------------------
// TEMPORARY FUNCTION TO PROVIDE MOCK DATA
// Replace with Supabase fetch later
// ------------------------------
const getMockUserData = () => {
  return {
    spo2: 91,
    temperature: 21.6,
    height: 1.65,
    weight: 50,
    bloodPressure: "1220/80",
  };
};

const Results = () => {
  // Use temporary mock function for now
  const userData = getMockUserData();

  // Dynamically generate healthData based on actual values
  const healthData = evaluateHealthMetrics(userData);
  const navigate = useNavigate(); 

  return (
    <div className="main-container">
      <Navbar />
      <div className="lastresults-content">
        <div className="lastresults-body">
          <div className="results-box">
            <div className="top">

            <BackButton/>

            <p className="toptext">Your Results</p>
            </div>
            <div className="results-grid">
              {healthData.map((item, index) => (
                <ResultCard
                  key={index}
                  title={item.title}
                  value={item.value}
                  unit={item.unit}
                  status={item.status}
                  statusType={item.statusType}
                  icon={item.icon}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
