import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaDownload, FaShareAlt, FaCalendarCheck, FaPrint } from "react-icons/fa";
import { FiActivity, FiThermometer, FiBarChart, FiHeart, FiInfo } from "react-icons/fi";
import { MdHeight, MdMonitorWeight } from "react-icons/md";
import { supabase } from "../supabaseClient";

type StatusType = "success" | "warning" | "danger";

interface HealthRecord {
  date: string;
  time: string;
  oxygen: string;
  temp: string;
  height: string;
  weight: string;
  bmi: string;
  bp: string;
}

const Result: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [latestRecord, setLatestRecord] = useState<HealthRecord | null>(null);

  useEffect(() => {
    const fetchLatestResult = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          navigate("/");
          return;
        }

        // Fetch only the single most recent record for this user
        const { data, error } = await supabase
          .from("health_checkups")
          .select("spo2, temperature, height, weight, bmi, blood_pressure, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;

        if (data) {
          const timestamp = new Date(data.created_at);
          setLatestRecord({
            date: timestamp.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            oxygen: data.spo2?.toString() || "--",
            temp: data.temperature?.toString() || "--",
            height: data.height?.toString() || "--",
            weight: data.weight?.toString() || "--",
            bmi: data.bmi?.toString() || "--",
            bp: data.blood_pressure || "--/--"
          });
        }
      } catch (err) {
        console.error("Error fetching latest result:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestResult();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eaf4ff]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#139dc7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#139dc7] font-bold animate-pulse">Syncing Latest Vitals...</p>
        </div>
      </div>
    );
  }

  if (!latestRecord) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eaf4ff]">
        <div className="text-center p-10 bg-white/50 rounded-[40px] backdrop-blur-md border border-white">
          <h2 className="text-2xl font-bold text-[#0a4d61] mb-4">No Records Found</h2>
          <button onClick={() => navigate('/dashboard')} className="text-[#139dc7] font-bold flex items-center gap-2 mx-auto">
            <FaArrowLeft /> Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Basic logic to determine if things are "Excellent"
  const isHealthy = Number(latestRecord.oxygen) >= 95 && Number(latestRecord.bmi) < 25;

  return (
    <div className="min-h-screen bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-x-hidden">
      
      <header className="w-full px-8 lg:px-16 py-6 flex justify-between items-center z-50 shrink-0">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-[#139dc7] font-bold hover:gap-4 transition-all active:scale-95"
        >
          <FaArrowLeft /> Back to Dashboard
        </button>
        
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-20">
        
        {/* HERO SECTION */}
        <div className="bg-white/70 backdrop-blur-xl rounded-[40px] p-8 md:p-12 border border-white shadow-2xl mb-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 text-[#139dc7] font-bold uppercase tracking-widest text-sm mb-2">
              <FaCalendarCheck /> Latest Checkup Result
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-[#0a4d61]">{latestRecord.date}</h1>
            <p className="text-[#139dc7] font-medium mt-1">Recorded at {latestRecord.time} via HealthSense Kiosk</p>
          </div>
          <div className={`${isHealthy ? 'bg-green-500 shadow-green-200' : 'bg-orange-500 shadow-orange-200'} text-white px-8 py-4 rounded-3xl font-bold text-center shadow-xl transition-colors duration-500`}>
            <p className="text-[10px] uppercase opacity-80 mb-1">Overall Condition</p>
            <p className="text-2xl">{isHealthy ? "EXCELLENT" : "STABLE"}</p>
          </div>
        </div>

        {/* ACTION BAR */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 px-4">
          <h3 className="text-[#0a4d61] font-bold flex items-center gap-2 text-lg">
            <FiInfo className="text-[#139dc7]" /> Report Summary
          </h3>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white/60 hover:bg-white text-[#139dc7] rounded-full border border-white font-bold text-xs transition-all shadow-sm active:scale-90">
              <FaPrint size={12} /> Print
            </button>
            <button className="flex items-center gap-2 px-6 py-2.5 bg-[#139dc7] hover:bg-[#0a4d61] text-white rounded-full font-bold text-xs transition-all shadow-lg shadow-blue-900/10 active:scale-95">
              <FaDownload size={12} /> Export PDF
            </button>
          </div>
        </div>

        {/* RESULTS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ResultCard 
            icon={<FiActivity />} 
            label="Blood Oxygen" 
            value={latestRecord.oxygen} 
            unit="%" 
            status={Number(latestRecord.oxygen) >= 95 ? "Normal" : "Low"} 
            type={Number(latestRecord.oxygen) >= 95 ? "success" : "danger"} 
          />
          <ResultCard 
            icon={<FiHeart />} 
            label="Blood Pressure" 
            value={latestRecord.bp} 
            unit="mmHg" 
            status="Recorded" 
            type="success" 
          />
          <ResultCard 
            icon={<FiThermometer />} 
            label="Body Temp" 
            value={latestRecord.temp} 
            unit="°C" 
            status={Number(latestRecord.temp) <= 37.5 ? "Normal" : "Elevated"} 
            type={Number(latestRecord.temp) <= 37.5 ? "success" : "warning"} 
          />
          <ResultCard 
            icon={<FiBarChart />} 
            label="Body Mass Index" 
            value={latestRecord.bmi} 
            unit="" 
            status={Number(latestRecord.bmi) < 25 ? "Normal" : "Overweight"} 
            type={Number(latestRecord.bmi) < 25 ? "success" : "warning"} 
          />
          <ResultCard icon={<MdMonitorWeight />} label="Weight" value={latestRecord.weight} unit="kg" status="Stable" type="success" />
          <ResultCard icon={<MdHeight />} label="Height" value={latestRecord.height} unit="m" status="Recorded" type="success" />
        </div>

        {/* HEALTH INSIGHTS SECTION */}
        <section className="mt-12 bg-[#0a4d61] rounded-[40px] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="flex items-center gap-2 text-xl font-bold mb-4">
              <FiInfo className="text-[#9fc5f8]" /> Health Insights
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              <p className="text-blue-100/80 leading-relaxed text-lg">
                Your SpO2 levels of <span className="text-white font-bold">{latestRecord.oxygen}%</span> are within the optimal range. Your BMI of <span className="text-white font-bold">{latestRecord.bmi}</span> indicates a {Number(latestRecord.bmi) < 25 ? "healthy" : "monitored"} weight for your height.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-sm font-medium">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]" /> 
                  Maintain current hydration and activity levels.
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-300 shadow-[0_0_10px_rgba(147,197,253,0.5)]" /> 
                  Data synced with HealthSense Cloud Infrastructure.
                </li>
              </ul>
            </div>
          </div>
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        </section>
      </main>
    </div>
  );
};

// Reusable Card Component (remains the same as your provided code)
const ResultCard = ({ icon, label, value, unit, status, type }: { icon: any, label: string, value: string, unit: string, status: string, type: StatusType }) => {
  const typeColors = {
    success: "bg-green-500/10 text-green-600 border-green-200",
    warning: "bg-orange-500/10 text-orange-600 border-orange-200",
    danger: "bg-red-500/10 text-red-600 border-red-200"
  };

  return (
    <div className="bg-white/80 backdrop-blur-md border border-white p-7 rounded-4xl shadow-lg group hover:bg-white transition-all hover:shadow-xl hover:-translate-y-1">
      <div className="flex justify-between items-start mb-6">
        <div className="w-14 h-14 bg-[#139dc7]/10 rounded-2xl flex items-center justify-center text-[#139dc7] text-3xl group-hover:bg-[#139dc7] group-hover:text-white transition-all duration-300">
          {icon}
        </div>
        <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border shadow-sm ${typeColors[type]}`}>
          {status}
        </span>
      </div>
      <div>
        <p className="text-xs font-bold text-[#139dc7]/50 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black text-[#0a4d61]">{value}</span>
          <span className="text-sm font-bold text-[#139dc7]">{unit}</span>
        </div>
      </div>
    </div>
  );
};

export default Result;