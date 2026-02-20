import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSearch, FaFilter, FaFileAlt, FaTimes } from "react-icons/fa";
import { FiActivity, FiThermometer, FiBarChart, FiHeart } from "react-icons/fi";
import { MdHeight, MdMonitorWeight } from "react-icons/md";
import { supabase } from "../supabaseClient"; // Ensure path is correct

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
  
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
  const [historyData, setHistoryData] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
  try {
    setLoading(true);
    
    // 1. Get current logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/");
      return;
    }

    // 2. Fetch records where user_id matches the logged-in user
    const { data, error } = await supabase
      .from("health_checkups")
      .select("spo2, temperature, height, weight, bmi, blood_pressure, created_at")
      .eq("user_id", user.id) // <--- CHANGED FROM "id" TO "user_id"
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (data) {
      const formattedData: Record[] = data.map((item) => {
        const timestamp = new Date(item.created_at);
        return {
          date: timestamp.toLocaleDateString(),
          time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          oxygen: item.spo2?.toString() || "0",
          temp: item.temperature?.toString() || "0",
          height: item.height?.toString() || "0",
          weight: item.weight?.toString() || "0",
          bmi: item.bmi?.toString() || "0",
          bp: item.blood_pressure || "0/0"
        };
      });
      setHistoryData(formattedData);
    }
  } catch (err) {
    console.error("Error fetching health history:", err);
  } finally {
    setLoading(false);
  }
};

    fetchHistory();
  }, [navigate]);

  // HEALTH LOGIC PROCESSOR (Same as your provided logic)
  const getHealthData = (record: Record) => {
    const { oxygen: spo2, temp, height, weight, bmi: bmiVal, bp } = record;
    const healthData = [];

    // SpO2
    let spo2Status = "Normal", spo2Type: StatusType = "success";
    const s = Number(spo2);
    if (s < 95) { spo2Status = "Low"; spo2Type = "danger"; }
    else if (s <= 98) { spo2Status = "Normal"; spo2Type = "warning"; }
    healthData.push({ title: "SpO2", value: spo2, unit: "%", status: spo2Status, type: spo2Type, icon: <FiActivity /> });

    // Temperature
    let tempStatus = "Normal", tempType: StatusType = "success";
    const t = Number(temp);
    if (t < 35) { tempStatus = "Hypothermia"; tempType = "danger"; }
    else if (t <= 37.5) { tempStatus = "Normal"; tempType = "success"; }
    else if (t <= 39) { tempStatus = "Fever"; tempType = "warning"; }
    else { tempStatus = "High Fever"; tempType = "danger"; }
    healthData.push({ title: "Temperature", value: temp, unit: "°C", status: tempStatus, type: tempType, icon: <FiThermometer /> });

    // Height
    let heightStatus = "Average", heightType: StatusType = "success";
    const h = Number(height);
    if (h < 1.5) { heightStatus = "Below Average"; heightType = "danger"; }
    healthData.push({ title: "Height", value: height, unit: "m", status: heightStatus, type: heightType, icon: <MdHeight /> });

    // Weight & BMI
    let weightStatus = "Normal", weightType: StatusType = "success";
    let bmiStatus = "Normal", bmiType: StatusType = "success";
    const b = Number(bmiVal);
    if (b < 18.5) { bmiStatus = "Underweight"; bmiType = "warning"; weightStatus = "Underweight"; weightType = "warning"; }
    else if (b < 25) { bmiStatus = "Normal"; bmiType = "success"; weightStatus = "Normal"; weightType = "success"; }
    else if (b < 30) { bmiStatus = "Overweight"; bmiType = "warning"; weightStatus = "Overweight"; weightType = "warning"; }
    else { bmiStatus = "Obese"; bmiType = "danger"; weightStatus = "Obese"; weightType = "danger"; }

    healthData.push({ title: "Weight", value: weight, unit: "kg", status: weightStatus, type: weightType, icon: <MdMonitorWeight /> });
    healthData.push({ title: "BMI", value: bmiVal, unit: "", status: bmiStatus, type: bmiType, icon: <FiBarChart /> });

    // Blood Pressure
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
      <header className="w-full px-4 sm:px-8 lg:px-16 py-4 sm:py-6 flex flex-row justify-between items-center z-50 shrink-0 gap-2">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-[#139dc7] font-bold hover:gap-3 transition-all active:scale-95">
          <FaArrowLeft className="text-lg" /> 
          <span className="text-sm sm:text-base hidden xs:block">Back to Dashboard</span>
          <span className="text-sm xs:hidden">Back</span>
        </button>
        
        <div className="flex items-center gap-2 px-4 py-1.5 bg-white/40 rounded-full border border-white/40 backdrop-blur-md shadow-sm">
          <div className="w-5 h-5 bg-[#139dc7] rounded-full flex items-center justify-center text-[10px] text-white font-bold">J</div>
          <span className="text-[10px] font-bold text-[#139dc7] uppercase tracking-wider">
            Patient ID: <span className="opacity-60">HS-2026-88</span>
          </span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 lg:px-12 flex flex-col min-h-0">
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
        <div className="flex-1 overflow-y-auto pr-2 pb-10 space-y-6">
          {loading ? (
            <div className="w-full py-20 flex flex-col items-center justify-center gap-4 text-[#139dc7]">
               <div className="w-10 h-10 border-4 border-[#139dc7]/20 border-t-[#139dc7] rounded-full animate-spin" />
               <p className="font-bold animate-pulse">Retrieving records...</p>
            </div>
          ) : historyData.length === 0 ? (
            <div className="bg-white/30 rounded-3xl p-20 text-center border border-white/40">
              <p className="text-[#139dc7] font-bold">No health records found.</p>
            </div>
          ) : (
            historyData.map((record, index) => (
              <div key={index} className="group relative bg-white/70 backdrop-blur-xl rounded-4xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 transition-all hover:shadow-[0_20px_40px_rgba(19,157,199,0.1)] hover:-translate-y-1">
                <div className="flex flex-col xl:flex-row items-center gap-8">
                  <div className="w-full xl:w-52 shrink-0 border-b xl:border-b-0 xl:border-r border-[#139dc7]/20 pb-6 xl:pb-0 xl:pr-8">
                    <div className="flex items-center gap-3 text-[#0a4d61] font-extrabold text-2xl">
                      <div className="w-10 h-10 bg-[#139dc7]/10 rounded-xl flex items-center justify-center text-[#139dc7]">
                          <FaFileAlt size={18} />
                      </div>
                      {record.date}
                    </div>
                    <div className="mt-2 text-[11px] text-[#139dc7] font-black uppercase tracking-[0.2em] opacity-60 ml-1">
                      Checked at {record.time}
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 w-full">
                    {[
                      { label: "SpO2", val: record.oxygen + "%" },
                      { label: "Temp", val: record.temp + "°C" },
                      { label: "Height", val: record.height + "m" },
                      { label: "Weight", val: record.weight + "kg" },
                      { label: "BMI", val: record.bmi },
                      { label: "BP", val: record.bp, long: true }
                    ].map((stat, i) => (
                      <div key={i} className="bg-white/50 border border-white p-4 rounded-2xl shadow-sm group-hover:bg-white transition-colors">
                        <p className="text-[10px] font-black text-[#139dc7] uppercase mb-2 tracking-tight opacity-50">{stat.label}</p>
                        <p className={`font-bold text-[#0a4d61] ${stat.long ? 'text-sm md:text-base' : 'text-lg'} leading-none`}>
                          {stat.val}
                        </p>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => setSelectedRecord(record)}
                    className="w-full xl:w-auto px-8 py-5 bg-[#139dc7] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[#139dc7]/30 hover:bg-[#0a4d61] hover:scale-105 transition-all shrink-0 active:scale-95"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* VIEW DETAILS MODAL */}
      {selectedRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-[#001b2e]/60 backdrop-blur-xl animate-in fade-in duration-300">
          
          {/* Background Overlay Click to Close */}
          <div className="absolute inset-0" onClick={() => setSelectedRecord(null)} />

          <div className="bg-white/95 w-full max-w-2xl rounded-[50px] shadow-[0_32px_64px_rgba(0,0,0,0.2)] overflow-hidden relative border border-white/50 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            
            {/* Top Accent Bar */}
            <div className="h-3 w-full bg-linear-to-r from-[#139dc7] to-[#34A0A4]" />

            {/* Close Button */}
            <button 
              onClick={() => setSelectedRecord(null)}
              className="absolute top-8 right-8 w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90 shadow-sm z-10"
            >
              <FaTimes size={24} />
            </button>

            <div className="p-8 sm:p-12">
              {/* Header Section */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="px-3 py-1 bg-[#139dc7]/10 rounded-lg text-[#139dc7] text-[10px] font-black uppercase tracking-tighter">
                    Diagnostic Summary
                  </div>
                </div>
                <h2 className="text-4xl font-black text-[#0a4d61] tracking-tight">Checkup Report</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[#139dc7] font-bold">{selectedRecord.date}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#139dc7]/30" />
                  <span className="text-[#139dc7]/60 font-medium">{selectedRecord.time}</span>
                </div>
              </div>

              {/* Health Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {getHealthData(selectedRecord).map((data, i) => (
                  <div 
                    key={i} 
                    className="group flex items-center gap-5 p-6 bg-white rounded-[32px] border border-[#139dc7]/5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-[#139dc7]/20 transition-all"
                  >
                    {/* Icon Container */}
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 transition-transform group-hover:scale-110 ${
                      data.type === 'success' ? 'bg-green-100 text-green-600' : 
                      data.type === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {data.icon}
                    </div>

                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase text-[#139dc7]/40 leading-none mb-1.5 tracking-widest">{data.title}</p>
                      <div className="flex items-baseline gap-1">
                        <p className="text-2xl font-black text-[#0a4d61] leading-none">
                          {data.value}
                        </p>
                        <span className="text-sm font-bold text-[#0a4d61]/40 uppercase">{data.unit}</span>
                      </div>
                      
                      {/* Status Badge */}
                      <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                        data.type === 'success' ? 'bg-green-500/10 text-green-600' : 
                        data.type === 'warning' ? 'bg-orange-500/10 text-orange-600' : 'bg-red-500/10 text-red-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                          data.type === 'success' ? 'bg-green-500' : 
                          data.type === 'warning' ? 'bg-orange-500' : 'bg-red-500'
                        }`} />
                        {data.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Info */}
              <div className="mt-10 pt-8 border-t border-[#139dc7]/10 flex justify-between items-center">
                <p className="text-[10px] font-bold text-[#139dc7]/30 uppercase tracking-[0.2em]">
                  Verified by HealthSense AI
                </p>
                <button 
                  onClick={() => window.print()}
                  className="text-[#139dc7] text-xs font-black uppercase hover:underline"
                >
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;