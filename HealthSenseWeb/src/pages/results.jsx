import React from "react";
import "../styles/results.css";
import Navbar from "../components/navbar2";
import ResultCard from "../components/resultcard";
import '../styles/resultcard.css';

// Function to dynamically evaluate health metrics
const evaluateHealthMetrics = (userData) => {
  const healthData = [];

  // SpO2
  let spo2Status = "";
  let spo2Type = "";
  if (userData.spo2 < 95) {
    spo2Status = "Low";
    spo2Type = "danger";
  } else if (userData.spo2 <= 98) {
    spo2Status = "Normal";
    spo2Type = "warning";
  } else {
    spo2Status = "Excellent";
    spo2Type = "success";
  }
  healthData.push({
    title: "SpO2",
    value: userData.spo2,
    unit: "%",
    status: spo2Status,
    statusType: spo2Type,
    icon: "💨",
  });

  // Temperature
  let tempStatus = "";
  let tempType = "";
  if (userData.temperature < 36) {
    tempStatus = "Low";
    tempType = "warning";
  } else if (userData.temperature <= 37.5) {
    tempStatus = "Normal";
    tempType = "success";
  } else {
    tempStatus = "Fever";
    tempType = "danger";
  }
  healthData.push({
    title: "Temperature",
    value: userData.temperature,
    unit: "°C",
    status: tempStatus,
    statusType: tempType,
    icon: "🌡️",
  });

  // Height
  let heightStatus = "";
  let heightType = "";
  if (userData.height < 1.6) {
    heightStatus = "Below Average";
    heightType = "danger";
  } else if (userData.height <= 1.75) {
    heightStatus = "Average";
    heightType = "success";
  } else {
    heightStatus = "Above Average";
    heightType = "success";
  }
  healthData.push({
    title: "Height",
    value: userData.height,
    unit: "m",
    status: heightStatus,
    statusType: heightType,
    icon: "📏",
  });

  // Weight
  const minWeight = 18.5 * (userData.height ** 2);
  const maxWeight = 24.9 * (userData.height ** 2);
  let weightStatus = "";
  let weightType = "";
  if (userData.weight < minWeight) {
    weightStatus = "Underweight";
    weightType = "warning";
  } else if (userData.weight <= maxWeight) {
    weightStatus = "Normal";
    weightType = "success";
  } else if (userData.weight <= maxWeight + 5) {
    weightStatus = "Overweight";
    weightType = "warning";
  } else {
    weightStatus = "Obese";
    weightType = "danger";
  }
  healthData.push({
    title: "Weight",
    value: userData.weight,
    unit: "kg",
    status: weightStatus,
    statusType: weightType,
    icon: "⚖️",
  });

  // BMI
  const bmi = userData.weight / (userData.height ** 2);
  let bmiStatus = "";
  let bmiType = "";
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
  healthData.push({
    title: "BMI",
    value: bmi.toFixed(1),
    unit: "",
    status: bmiStatus,
    statusType: bmiType,
    icon: "📊",
  });

  // Blood Pressure
  const [systolic, diastolic] = userData.bloodPressure.split("/").map(Number);
  let bpStatus = "";
  let bpType = "";
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
  healthData.push({
    title: "Blood Pressure",
    value: userData.bloodPressure,
    unit: "mmHg",
    status: bpStatus,
    statusType: bpType,
    icon: "❤️",
  });

  return healthData;
};

// ------------------------------
// TEMPORARY FUNCTION TO SET MOCK DATA
// ------------------------------
const getMockUserData = () => {
  // TODO: Change these values to test different scenarios
  return {
    spo2: 99,
    temperature: 36.6,
    height: 1.0,
    weight: 10,
    bloodPressure: "120/80",
  };
};

const Results = () => {
  // Use temporary mock function for now
  const userData = getMockUserData();

  // Dynamically generate healthData based on actual values
  const healthData = evaluateHealthMetrics(userData);

  return (
    <div className="main-container">
      <Navbar />
      <div className="lastresults-content">
        <div className="lastresults-body">
          <div className="results-box">
            <button className="back-btn">Back</button>
            <p className="toptext">Your Results</p>

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
