import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSearch, FaFilter, FaChevronRight, FaFileAlt, FaTimes } from "react-icons/fa";
import { FiActivity, FiThermometer, FiBarChart, FiHeart } from "react-icons/fi";
import { MdHeight, MdMonitorWeight } from "react-icons/md";

// TYPES FOR HEALTH LOGIC
type StatusType = "success" | "warning" | "danger" | "Unknown";

interface Record {
  date: string;
  time: string;
  oxygen: string;
  temp: string;
  height: string;
  weight: string;
  bmi: string;
  bp: string;
}

const History: React.FC = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  const historyData: Record[] = [
    { date: "1/29/2026", time: "09:41 PM", oxygen: "99", temp: "37", height: "1.70", weight: "60", bmi: "20.8", bp: "120/80" },
    { date: "12/15/2025", time: "10:20 AM", oxygen: "94", temp: "38.5", height: "1.70", weight: "62", bmi: "21.5", bp: "145/95" },
    { date: "10/02/2025", time: "02:15 PM", oxygen: "99", temp: "36.2", height: "1.70", weight: "61", bmi: "21.1", bp: "118/75" },
  ];

  // HEALTH LOGIC PROCESSOR
  const getHealthData = (record: Record) => {
    const { oxygen: spo2, temp, height, weight, bmi: bmiVal, bp } = record;
    const healthData = [];

    // --- SpO2 ---
    let spo2Status = "Normal", spo2Type: StatusType = "success";
    const s = Number(spo2);
    if (s < 95) { spo2Status = "Low"; spo2Type = "danger"; }
    else if (s <= 98) { spo2Status = "Normal"; spo2Type = "warning"; }
    healthData.push({ title: "SpO2", value: spo2, unit: "%", status: spo2Status, type: spo2Type, icon: <FiActivity /> });

    // --- Temperature ---
    let tempStatus = "Normal", tempType: StatusType = "success";
    const t = Number(temp);
    if (t < 35) { tempStatus = "Hypothermia"; tempType = "danger"; }
    else if (t <= 37.5) { tempStatus = "Normal"; tempType = "success"; }
    else if (t <= 39) { tempStatus = "Fever"; tempType = "warning"; }
    else { tempStatus = "High Fever"; tempType = "danger"; }
    healthData.push({ title: "Temperature", value: temp, unit: "°C", status: tempStatus, type: tempType, icon: <FiThermometer /> });

    // --- Height ---
    let heightStatus = "Average", heightType: StatusType = "success";
    const h = Number(height);
    if (h < 1.5) { heightStatus = "Below Average"; heightType = "danger"; }
    healthData.push({ title: "Height", value: height, unit: "m", status: heightStatus, type: heightType, icon: <MdHeight /> });

    // --- Weight & BMI ---
    let weightStatus = "Normal", weightType: StatusType = "success";
    let bmiStatus = "Normal", bmiType: StatusType = "success";
    const b = Number(bmiVal);

    if (b < 18.5) { 
      bmiStatus = "Underweight"; bmiType = "warning"; 
      weightStatus = "Underweight"; weightType = "warning"; 
    }
    else if (b < 25) { 
      bmiStatus = "Normal"; bmiType = "success"; 
      weightStatus = "Normal"; weightType = "success"; 
    }
    else if (b < 30) { 
      bmiStatus = "Overweight"; bmiType = "warning"; 
      weightStatus = "Overweight"; weightType = "warning"; 
    }
    else { 
      bmiStatus = "Obese"; bmiType = "danger"; 
      weightStatus = "Obese"; weightType = "danger"; 
    }

    healthData.push({ title: "Weight", value: weight, unit: "kg", status: weightStatus, type: weightType, icon: <MdMonitorWeight /> });
    healthData.push({ title: "BMI", value: bmiVal, unit: "", status: bmiStatus, type: bmiType, icon: <FiBarChart /> });

    // --- Blood Pressure ---
    let bpStatus = "Ideal", bpType: StatusType = "success";
    if (bp.includes("/")) {
      const [systolic, diastolic] = bp.split("/").map(Number);
      if (systolic < 90 || diastolic < 60) { bpStatus = "Low"; bpType = "warning"; }
      else if (systolic <= 120 && diastolic <= 80) { bpStatus = "Ideal"; bpType = "success"; }
      else if (systolic <= 139 || diastolic <= 89) { bpStatus = "Elevated"; bpType = "warning"; }
      else { bpStatus = "High"; bpType = "danger"; }
    }
    healthData.push({ title: "Blood Pressure", value: bp, unit: "mmHg", status: bpStatus, type: bpType, icon: <FiHeart /> });

    return healthData;
  };

  return (
    <div className="min-h-screen h-screen flex flex-col bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-hidden relative">
      
      {/* HEADER */}
      <header className="w-full px-8 lg:px-16 py-6 flex justify-between items-center z-50 shrink-0">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-[#139dc7] font-bold hover:gap-4 transition-all">
          <FaArrowLeft /> Back to Dashboard
        </button>
        <div className="flex items-center gap-2 px-3 py-1 bg-white/40 rounded-full border border-white/40 backdrop-blur-md">
          <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-[10px] font-bold text-[#139dc7] uppercase tracking-wider">
            {isOnline ? 'System Online' : 'System Offline'}
          </span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 lg:px-12 flex flex-col min-h-0">
        <section className="mb-8 shrink-0 text-center lg:text-left">
          <h1 className="text-4xl font-bold text-[#139dc7] m-0">Checkup History</h1>
          <p className="text-[#139dc7]/60 mb-6">Review your past health checkups below.</p>
          <div className="flex gap-4">
            <div className="flex-1 relative">
                <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-[#139dc7]/40" />
                <input type="text" placeholder="Search by date..." className="w-full h-14 bg-white/20 border border-white/40 rounded-2xl pl-12 pr-5 outline-none focus:border-[#139dc7] text-[#139dc7]" />
            </div>
            <button className="h-14 px-6 bg-white/20 border border-white/40 rounded-2xl text-[#139dc7] flex items-center gap-2 font-bold"><FaFilter /> Filter</button>
          </div>
        </section>

        {/* LIST AREA */}
        <div className="flex-1 overflow-y-auto pr-2 pb-10 space-y-4">
          {historyData.map((record, index) => (
            <div key={index} className="bg-white/20 backdrop-blur-md rounded-[24px] border border-white/30 p-6 shadow-lg transition-all hover:bg-white/30">
              <div className="flex flex-col xl:flex-row items-center gap-6">
                
                <div className="w-full xl:w-48 shrink-0 border-b xl:border-b-0 xl:border-r border-[#139dc7]/10 pb-4 xl:pb-0 xl:pr-6">
                  <div className="flex items-center gap-2 text-[#139dc7] font-bold text-xl"><FaFileAlt /> {record.date}</div>
                  <div className="text-xs text-[#139dc7]/50 font-bold uppercase tracking-tighter">{record.time}</div>
                </div>

                {/* UPDATED GRID: PREVENTS OVERFLOW */}
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 w-full">
                  {[
                    { label: "SpO2", val: record.oxygen + "%" },
                    { label: "Temp", val: record.temp + "°C" },
                    { label: "Height", val: record.height + "m" },
                    { label: "Weight", val: record.weight + "kg" },
                    { label: "BMI", val: record.bmi },
                    { label: "BP", val: record.bp, long: true } // Identify long text
                  ].map((stat, i) => (
                    <div key={i} className="bg-[#139dc7]/5 p-3 rounded-xl border border-white/20">
                      <p className="text-[10px] font-black text-[#139dc7]/40 uppercase mb-1">{stat.label}</p>
                      <p className={`font-bold text-[#139dc7] ${stat.long ? 'text-xs md:text-sm' : 'text-sm'}`}>
                        {stat.val}
                      </p>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => setSelectedRecord(record)}
                  className="w-full xl:w-auto px-6 py-4 bg-[#139dc7] text-white rounded-2xl font-bold text-sm whitespace-nowrap hover:bg-[#34A0A4]"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* VIEW DETAILS MODAL */}
      {selectedRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#001b2e]/40 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white/90 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden relative border border-white/50">
            <button 
              onClick={() => setSelectedRecord(null)}
              className="absolute top-6 right-6 w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
            >
              <FaTimes size={20} />
            </button>

            <div className="p-10">
              <h2 className="text-3xl font-bold text-[#139dc7] mb-2">Checkup Report</h2>
              <p className="text-[#139dc7]/50 font-bold uppercase tracking-widest text-sm mb-8">{selectedRecord.date} • {selectedRecord.time}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getHealthData(selectedRecord).map((data, i) => (
                  <div key={i} className="flex items-center gap-4 p-5 bg-white rounded-3xl border border-[#139dc7]/10 shadow-sm">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${
                      data.type === 'success' ? 'bg-green-100 text-green-600' : 
                      data.type === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {data.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-[#139dc7]/40 leading-none mb-1">{data.title}</p>
                      <p className="text-xl font-bold text-[#139dc7] leading-none">{data.value}<span className="text-sm font-normal ml-1">{data.unit}</span></p>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1 inline-block ${
                        data.type === 'success' ? 'bg-green-500/10 text-green-600' : 
                        data.type === 'warning' ? 'bg-orange-500/10 text-orange-600' : 'bg-red-500/10 text-red-600'
                      }`}>{data.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;