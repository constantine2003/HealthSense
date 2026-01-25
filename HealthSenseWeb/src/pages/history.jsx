import React, { useState, useEffect } from "react";
import "../styles/history.css";
import Navbar from "../components/navbar2";
import BackButton from "../components/backbutton";
import { FiActivity, FiThermometer, FiHeart, FiBarChart } from 'react-icons/fi';
import { MdHeight, MdMonitorWeight } from 'react-icons/md';
import { useAuth } from "../hooks/useAuth";
import SplashScreen from "../components/splashscreen";
import { getProfile } from "../auth/getProfile";
import { supabase } from "../supabaseClient";

// Functions for metric status & colors
const getMetricStatus = (metric, value) => {
  let statusType = "danger";
  value = Number(value);
  switch (metric) {
    case "spo2":
      if (value < 95) statusType = "danger";
      else if (value <= 98) statusType = "warning";
      else statusType = "success";
      break;
    case "temp":
      if (value < 35) statusType = "danger";
      else if (value < 36) statusType = "warning";
      else if (value <= 37.5) statusType = "success";
      else if (value <= 39) statusType = "warning";
      else statusType = "danger";
      break;
    case "bmi":
    case "weight":
      if (value < 18.5) statusType = "warning";
      else if (value < 25) statusType = "success";
      else if (value < 30) statusType = "warning";
      else statusType = "danger";
      break;
    case "height":
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

const getStatusColor = (statusType) => (
  statusType === "success" ? "#22c55e"
  : statusType === "warning" ? "#F97316"
  : "#EF4444"
);

const getOverallStatus = (stats) => {
  const types = [
    getMetricStatus("spo2", stats.spo2),
    getMetricStatus("temp", stats.temp),
    getMetricStatus("bmi", stats.bmi),
    getMetricStatus("weight", stats.weight),
    getMetricStatus("height", stats.height),
    getMetricStatus("bp", stats.bp),
  ];
  if (types.includes("danger")) return { status: "risk", label: "At Risk" };
  if (types.includes("warning")) return { status: "warning", label: "Alert" };
  return { status: "success", label: "Normal" };
};

const History = () => {
  const { user, loading: authLoading } = useAuth();
  const [splash, setSplash] = useState(true);
  const [fullName, setFullName] = useState("");
  const [checkupHistory, setCheckupHistory] = useState([]);

  // Fetch profile & checkups
  useEffect(() => {
    if (authLoading) return;
    if (!user) return; // already redirected by useAuth

    const fetchData = async () => {
      try {
        // Fetch profile
        const profile = await getProfile(user.id);
        setFullName(`${profile.first_name} ${profile.last_name}`);

        // Fetch health checkups
        const { data, error } = await supabase
          .from("health_checkups")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setCheckupHistory(data || []);
      } catch (err) {
        console.error("Failed to fetch data:", err.message);
      }

      // Keep splash for 2 seconds
      setTimeout(() => setSplash(false), 2000);
    };

    fetchData();
  }, [authLoading, user]);

  // Show splash while auth or local splash is active
  if (authLoading || splash) return <SplashScreen />;

  return (
    <div className="main-container">
      <Navbar />
      <div className="history-content">
        <div className="history-box">
          <div className="top">
            <BackButton />
            <p className="toptext">History</p>
            {/* {fullName && <p className="subtitle">Hello, {fullName}!</p>} */}
          </div>

          <div className="history-list">
            {checkupHistory.length === 0 && <p>No checkups found.</p>}
            {checkupHistory.map((item) => {
              const overall = getOverallStatus(item);
              return (
                <div key={item.id} className="history-item">
                  <div className="date-section">
                    <span className="date-text">{new Date(item.created_at).toLocaleDateString()}</span>
                    <span className="time-text">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="stats-preview">
                    <div className="mini-stat">
                      <FiActivity color={getStatusColor(getMetricStatus("spo2", item.spo2))} /> {item.spo2}%
                    </div>
                    <div className="mini-stat">
                      <FiThermometer color={getStatusColor(getMetricStatus("temp", item.temperature))} /> {item.temperature}°C
                    </div>
                    <div className="mini-stat">
                      <FiBarChart color={getStatusColor(getMetricStatus("bmi", item.bmi))} /> {item.bmi}
                    </div>
                    <div className="mini-stat">
                      <MdMonitorWeight color={getStatusColor(getMetricStatus("weight", item.weight))} /> {item.weight}kg
                    </div>
                    <div className="mini-stat">
                      <MdHeight color={getStatusColor(getMetricStatus("height", item.height))} /> {item.height}m
                    </div>
                    <div className="mini-stat">
                      <FiHeart color={getStatusColor(getMetricStatus("bp", item.blood_pressure))} /> {item.blood_pressure}
                    </div>
                  </div>

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
