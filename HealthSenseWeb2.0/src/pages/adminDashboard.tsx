import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  FaUsers, FaChartLine, FaSearch, FaUserEdit, 
  FaSignOutAlt, FaTimes, FaHeartbeat,
  FaFileMedical, FaHistory, FaChevronRight
} from 'react-icons/fa';
import { XAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';

type ViewState = 'overview' | 'patients' | 'logs';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ViewState>('overview');
  const [patients, setPatients] = useState<any[]>([]);
  const [checkups, setCheckups] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [timeRange, setTimeRange] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [editData, setEditData] = useState({ first_name: '', last_name: '', username: '' });

  useEffect(() => {
    fetchHealthSenseData();
  }, []);

  const fetchHealthSenseData = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    const { data: checkupData } = await supabase.from('health_checkups').select('*, profiles(username, first_name, last_name)').order('created_at', { ascending: false });
    
    setPatients(profiles || []);
    setCheckups(checkupData || []);
  };

  const handleUpdateUser = async () => {
    setIsUpdating(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: editData.first_name,
        last_name: editData.last_name,
        username: editData.username
      })
      .eq('id', selectedUser.id);

    if (error) {
      console.error("HealthSense Update Error:", error.message);
    } else {
      await fetchHealthSenseData();
      setSelectedUser(null);
    }
    setIsUpdating(false);
  };

  const processedChartData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    checkups.forEach((c) => {
      const date = new Date(c.created_at);
      let label = timeRange === 'weekly' ? date.toLocaleDateString('en-US', { weekday: 'short' }) :
                  timeRange === 'monthly' ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
                  date.toLocaleDateString('en-US', { month: 'short' });
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, scans: counts[key] }));
  }, [checkups, timeRange]);

  const stats = useMemo(() => ({
    today: checkups.filter(c => new Date(c.created_at).toDateString() === new Date().toDateString()).length,
    total: checkups.length,
    patientsCount: patients.length
  }), [checkups, patients]);

  const filteredPatients = patients.filter(p => 
    `${p.first_name} ${p.last_name} ${p.username}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full flex bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-hidden relative animate-in fade-in duration-700">
      
      {/* SIDEBAR - Styled like the Dashboard buttons */}
      <aside className="w-80 bg-white/30 backdrop-blur-2xl border-r border-white/50 flex flex-col z-50">
        <div className="p-10 flex flex-col">
          <span className="text-2xl font-black text-[#139dc7] tracking-tighter uppercase">HealthSense</span>
          <span className="text-[10px] font-bold text-[#34A0A4] uppercase tracking-[0.2em] -mt-1">Admin Operations</span>
        </div>
        
        <nav className="flex-1 px-6 space-y-3">
          {[
            { id: 'overview', label: 'Overview', icon: <FaChartLine /> },
            { id: 'patients', label: 'Patient Database', icon: <FaUsers /> },
            { id: 'logs', label: 'Audit Logs', icon: <FaHistory /> },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveView(item.id as ViewState)} 
              className={`w-full px-6 py-4 rounded-[20px] flex items-center gap-4 font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${activeView === item.id ? 'bg-[#139dc7] text-white shadow-xl shadow-[#139dc7]/20' : 'text-[#139dc7] hover:bg-white/40'}`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div className="p-8">
          <button 
            onClick={() => { supabase.auth.signOut(); navigate("/"); }} 
            className="w-full bg-white/20 backdrop-blur-md border border-red-400/30 text-red-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all active:scale-95"
          >
            Terminate Session
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* HEADER */}
        <header className="h-24 px-12 flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-black text-[#0a4d61] tracking-tight">
            {activeView === 'overview' ? 'System Statistics' : activeView === 'patients' ? 'Patient Management' : 'System Activity'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-white/40 backdrop-blur-md border border-white rounded-full flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-[#139dc7] uppercase tracking-widest">Infrastructure Online</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-12 pb-12">
          
          {/* VIEW: OVERVIEW */}
          {activeView === 'overview' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-3 gap-8">
                {[
                  { label: "Today's Checks", val: stats.today, icon: <FaHeartbeat /> },
                  { label: "Total Records", val: stats.total, icon: <FaFileMedical /> },
                  { label: "Active Patients", val: stats.patientsCount, icon: <FaUsers /> },
                ].map((s, i) => (
                  <div key={i} className="bg-white/60 backdrop-blur-xl p-8 rounded-[40px] border border-white shadow-sm flex flex-col">
                    <div className="text-[#139dc7] mb-4 opacity-50 text-2xl">{s.icon}</div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#139dc7]/60 mb-1">{s.label}</p>
                    <h3 className="text-4xl font-black text-[#0a4d61]">{s.val}</h3>
                  </div>
                ))}
              </div>

              <div className="bg-white/70 backdrop-blur-xl p-10 rounded-[40px] border border-white shadow-lg h-[450px] relative overflow-hidden">
                <div className="flex justify-between items-center mb-10 relative z-10">
                  <h3 className="font-black text-xs uppercase tracking-[0.2em] text-[#139dc7]">Diagnostic Scan Activity</h3>
                  <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/50 shadow-inner">
                    {['weekly', 'monthly', 'yearly'].map((r) => (
                      <button key={r} onClick={() => setTimeRange(r as any)} className={`px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${timeRange === r ? 'bg-[#139dc7] text-white shadow-lg' : 'text-[#139dc7]/40 hover:text-[#139dc7]'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={processedChartData}>
                      <defs>
                        <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#139dc7" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#139dc7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#139dc720" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '800', fill: '#139dc7'}} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontFamily: 'Lexend', fontWeight: 'bold'}}
                      />
                      <Area type="monotone" dataKey="scans" stroke="#139dc7" strokeWidth={4} fill="url(#colorScans)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: PATIENTS */}
          {activeView === 'patients' && (
            <div className="bg-white/70 backdrop-blur-xl rounded-[40px] border border-white shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-8 border-b border-white/50">
                <div className="relative max-w-md">
                  <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-[#139dc7]/40" />
                  <input 
                    type="text" 
                    placeholder="Search by name or health ID..." 
                    className="w-full bg-white/50 border-2 border-transparent rounded-3xl py-5 pl-14 pr-8 text-sm font-bold text-[#0a4d61] placeholder:text-[#139dc7]/30 focus:border-[#139dc7] focus:bg-white transition-all outline-none shadow-inner"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/30 text-[10px] font-black text-[#139dc7] uppercase tracking-[0.2em]">
                    <tr>
                      <th className="px-10 py-6">Patient Name</th>
                      <th className="px-10 py-6">Health ID</th>
                      <th className="px-10 py-6">Registered On</th>
                      <th className="px-10 py-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/20">
                    {filteredPatients.map((p) => (
                      <tr key={p.id} className="hover:bg-white/40 transition-all group">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#139dc7] text-white flex items-center justify-center font-black text-xs shadow-lg shadow-[#139dc7]/20 group-hover:rotate-6 transition-transform">
                              {p.first_name?.[0]}{p.last_name?.[0]}
                            </div>
                            <span className="font-bold text-[#0a4d61]">{p.first_name} {p.last_name}</span>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                           <span className="px-3 py-1 bg-[#139dc7]/10 text-[#139dc7] rounded-lg font-mono text-xs font-bold uppercase tracking-tight">@{p.username}</span>
                        </td>
                        <td className="px-10 py-6 text-sm font-medium text-[#139dc7]/60">
                          {new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </td>
                        <td className="px-10 py-6 text-right">
                          <button 
                            onClick={() => { setSelectedUser(p); setEditData({ first_name: p.first_name, last_name: p.last_name, username: p.username }); }}
                            className="w-12 h-12 rounded-2xl bg-white text-[#139dc7] hover:bg-[#139dc7] hover:text-white transition-all flex items-center justify-center ml-auto shadow-sm active:scale-90"
                          >
                            <FaUserEdit size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW: LOGS */}
          {activeView === 'logs' && (
            <div className="space-y-4 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              {checkups.map((log, i) => (
                <div key={i} className="bg-white/70 backdrop-blur-xl p-8 rounded-[35px] border border-white flex items-center justify-between shadow-sm group hover:bg-white/90 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-[#139dc7]/10 text-[#139dc7] flex items-center justify-center shadow-inner">
                      <FaFileMedical size={24} />
                    </div>
                    <div>
                      <p className="font-black text-[#0a4d61] text-lg">Infrastructure Diagnostic Logged</p>
                      <p className="text-sm text-[#139dc7]/60 font-medium">
                        User: <span className="text-[#34A0A4] font-black">@{log.profiles?.username || 'Guest'}</span> • {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="px-5 py-2.5 rounded-2xl bg-[#139dc7] text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-[#139dc7]/20">Verified</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* EDIT MODAL - Glassmorphism style */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a4d61]/40 backdrop-blur-md p-6">
          <div className="bg-white/90 backdrop-blur-2xl w-full max-w-md rounded-[50px] shadow-2xl border border-white overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10 border-b border-[#139dc7]/10 flex items-center justify-between bg-white/50">
              <div>
                <h3 className="font-black text-[#0a4d61] text-xl tracking-tight">Modify Records</h3>
                <p className="text-[10px] font-black text-[#139dc7] uppercase tracking-[0.2em]">Patient ID: {selectedUser.id.slice(0,8)}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="w-10 h-10 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"><FaTimes /></button>
            </div>
            <div className="p-12 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#139dc7]/60 uppercase tracking-[0.2em] ml-2">Health ID (Username)</label>
                <input 
                  className="w-full bg-white border-2 border-[#139dc7]/5 rounded-3xl px-6 py-5 text-sm font-bold text-[#0a4d61] outline-none focus:border-[#139dc7] shadow-inner transition-all" 
                  value={editData.username} 
                  onChange={(e) => setEditData({...editData, username: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#139dc7]/60 uppercase tracking-[0.2em] ml-2">First Name</label>
                  <input 
                    className="w-full bg-white border-2 border-[#139dc7]/5 rounded-3xl px-6 py-5 text-sm font-bold text-[#0a4d61] outline-none focus:border-[#139dc7] shadow-inner transition-all" 
                    value={editData.first_name} 
                    onChange={(e) => setEditData({...editData, first_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#139dc7]/60 uppercase tracking-[0.2em] ml-2">Last Name</label>
                  <input 
                    className="w-full bg-white border-2 border-[#139dc7]/5 rounded-3xl px-6 py-5 text-sm font-bold text-[#0a4d61] outline-none focus:border-[#139dc7] shadow-inner transition-all" 
                    value={editData.last_name} 
                    onChange={(e) => setEditData({...editData, last_name: e.target.value})}
                  />
                </div>
              </div>
              <button 
                disabled={isUpdating}
                onClick={handleUpdateUser}
                className={`w-full py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] transition-all active:scale-95 ${isUpdating ? 'bg-slate-200 text-slate-400' : 'bg-[#139dc7] text-white shadow-2xl shadow-[#139dc7]/40 hover:bg-[#0a4d61]'}`}
              >
                {isUpdating ? 'Syncing...' : 'Commit Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER LABEL */}
      <div className="absolute bottom-6 right-12 z-0">
        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#139dc7] opacity-20">
          HealthSense Admin v2.0
        </span>
      </div>
    </div>
  );
};

export default AdminDashboard;