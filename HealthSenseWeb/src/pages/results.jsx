import React, { useState, useEffect } from "react";
import "../styles/results.css";
import "../styles/resultcard.css";
import Navbar from "../components/navbar2";
import ResultCard from "../components/resultcard";
import BackButton from "../components/backbutton";
import SplashScreen from "../components/splashscreen"; // splash import
import { FiActivity, FiThermometer, FiHeart, FiBarChart } from 'react-icons/fi';
import { MdHeight, MdMonitorWeight } from 'react-icons/md';
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

// ===============================
// Evaluate health metrics
// ===============================
const evaluateHealthMetrics = (userData) => {
  const healthData = [];

  // Explicitly cast numbers
  const height = Number(userData.height);
  const weight = Number(userData.weight);
  const spo2 = Number(userData.spo2);
  const temp = Number(userData.temperature);

  const isValidNumber = (value) => value !== null && value !== undefined && !isNaN(value);

  // -------------------
  // SpO2
  // -------------------
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
    icon: <FiActivity color={spo2Type === "success" ? "#22c55e" : spo2Type === "warning" ? "#F97316" : "#EF4444"} size={24} />
  });

  // -------------------
  // Temperature
  // -------------------
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
    icon: <FiThermometer color={tempType === "success" ? "#22c55e" : tempType === "warning" ? "#F97316" : "#EF4444"} size={24} />
  });

  // -------------------
  // Height
  // -------------------
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
    icon: <MdHeight color={heightType === "success" ? "#22c55e" : "#EF4444"} size={24} />
  });

  // -------------------
  // Weight & BMI
  // -------------------
  let weightStatus = "Unknown", weightType = "danger", bmiValue = "-", bmiStatus = "Unknown", bmiType = "danger";

  if (isValidNumber(userData.bmi) && Number(userData.bmi) !== 0) {
      bmiValue = Number(userData.bmi).toFixed(1);
  } else if (isValidNumber(weight) && isValidNumber(height) && height > 0) {
      bmiValue = (weight / (height ** 2)).toFixed(1);
  }

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
      icon: <MdMonitorWeight color={weightType === "success" ? "#22c55e" : weightType === "warning" ? "#F97316" : "#EF4444"} size={24} />
  });

  healthData.push({
      title: "BMI",
      value: bmiValue,
      unit: "",
      status: bmiStatus,
      statusType: bmiType,
      icon: <FiBarChart color={bmiType === "success" ? "#22c55e" : bmiType === "warning" ? "#F97316" : "#EF4444"} size={24} />
  });

  // -------------------
  // Blood Pressure
  // -------------------
  let bpStatus = "Unknown", bpType = "danger";
  let bpValue = (userData.blood_pressure != null) ? userData.blood_pressure.toString().trim() : "-";

  if (bpValue.includes("/")) {
      const parts = bpValue.split("/").map(p => Number(p.trim()));
      const [systolic, diastolic] = parts;

      if (!isNaN(systolic) && !isNaN(diastolic)) {
          if (systolic < 90 || diastolic < 60) { bpStatus = "Low"; bpType = "warning"; }
          else if (systolic <= 120 && diastolic <= 80) { bpStatus = "Ideal"; bpType = "success"; }
          else if (systolic <= 139 || diastolic <= 89) { bpStatus = "Elevated"; bpType = "warning"; }
          else { bpStatus = "High"; bpType = "danger"; }
      }
  }

  healthData.push({
      title: "Blood Pressure",
      value: bpValue,
      unit: "mmHg",
      status: bpStatus,
      statusType: bpType,
      icon: <FiHeart color={bpType === "success" ? "#22c55e" : bpType === "warning" ? "#F97316" : "#EF4444"} size={24} />
  });

  return healthData;
};


// ===============================
// RESULTS COMPONENT
// ===============================
const Results = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLatestCheckup = async () => {
      // 1. Start the 2-second timer immediately
      const timer = new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        // 2. Define the data fetching logic
        const fetchData = async () => {
          const { data: { user } } = await supabase.auth.getUser();

          if (!user) {
            navigate("/");
            return null;
          }

          const { data, error } = await supabase
            .from("health_checkups")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (error) throw error;
          return data;
        };

        // 3. Wait for BOTH. 
        // If data takes 0.5s, it waits for the 2s timer.
        // If data takes 5s, it waits for the data.
        const [data] = await Promise.all([fetchData(), timer]);

        if (data) {
          setUserData(data);
        }
      } catch (err) {
        console.error("Failed to fetch latest checkup:", err.message);
        // Even on error, we wait for the timer to finish for a smooth UI
        await timer; 
      } finally {
        setLoading(false);
      }
    };

    fetchLatestCheckup();
  }, [navigate]);

  if (loading) return <SplashScreen />;

  const healthData = userData ? evaluateHealthMetrics(userData) : [];

  return (
    <div className="rmain-container">
      <Navbar />
      <div className="lastresults-content">
        <div className="lastresults-body">
          <div className="results-box">
            <div className="top">
              <BackButton />
              <p className="toptext">Your Results</p>
            </div>
              <p className="toptext">The date and time the data was collected</p>
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
