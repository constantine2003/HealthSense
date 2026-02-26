import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  FaUsers, FaChartLine, FaSearch, FaUserEdit, 
  FaTimes, FaHeartbeat, FaFileMedical, FaHistory, FaKey 
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
  const [newPassword, setNewPassword] = useState("");
  const [timeRange, setTimeRange] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  
  const [editData, setEditData] = useState({ 
    first_name: '', 
    middle_name: '', 
    last_name: '', 
    username: '',
    birthday: '',
    sex: ''
  });

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
        middle_name: editData.middle_name,
        last_name: editData.last_name,
        username: editData.username,
        birthday: editData.birthday,
        sex: editData.sex
      })
      .eq('id', selectedUser.id);

    if (error) {
      alert("Update Error: " + error.message);
    } else {
      await fetchHealthSenseData();
      setSelectedUser(null);
    }
    setIsUpdating(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    
    const { error } = await supabase.auth.admin.updateUserById(
      selectedUser.id,
      { password: newPassword }
    );

    if (error) {
      alert("Auth Error: " + error.message);
    } else {
      alert("Password updated successfully!");
      setNewPassword("");
    }
  };

  /**
   * DYNAMIC GRAPH TITLE LOGIC
   * Returns a string like "Week of Feb 23, 2026" or "March 2026"
   */
  const graphTitle = useMemo(() => {
    const now = new Date();
    if (timeRange === 'weekly') {
      const first = now.getDate() - now.getDay();
      const last = first + 6;
      const firstDay = new Date(now.setDate(first)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const lastDay = new Date(now.setDate(last)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${firstDay} — ${lastDay}`;
    }
    if (timeRange === 'monthly') {
      return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return `Fiscal Year ${now.getFullYear()}`;
  }, [timeRange]);

  /**
   * DYNAMIC GRAPH DATA LOGIC
   */
  const processedChartData = useMemo(() => {
    const dataMap: { [key: string]: number } = {};

    if (timeRange === 'weekly') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days.forEach(d => dataMap[d] = 0);
      checkups.forEach(c => {
        const d = new Date(c.created_at).toLocaleDateString('en-US', { weekday: 'short' });
        if (dataMap[d] !== undefined) dataMap[d]++;
      });
      return days.map(name => ({ name, scans: dataMap[name] }));
    } 

    if (timeRange === 'yearly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach(m => dataMap[m] = 0);
      checkups.forEach(c => {
        const m = new Date(c.created_at).toLocaleDateString('en-US', { month: 'short' });
        if (dataMap[m] !== undefined) dataMap[m]++;
      });
      return months.map(name => ({ name, scans: dataMap[name] }));
    }

    // Monthly Logic (Days 1-31)
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
    monthDays.forEach(d => dataMap[d] = 0);
    checkups.forEach(c => {
      const date = new Date(c.created_at);
      if (date.getMonth() === new Date().getMonth()) {
        const d = date.getDate().toString();
        dataMap[d]++;
      }
    });
    return monthDays.map(name => ({ name, scans: dataMap[name] }));
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
    <div className="min-h-screen w-full flex bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-hidden text-[#0a4d61]">
      
      {/* SIDEBAR */}
      <aside className="w-80 bg-white/30 backdrop-blur-2xl border-r border-white/50 flex flex-col z-50">
        <div className="p-10 flex flex-col">
          <span className="text-2xl font-black text-[#139dc7] tracking-tighter uppercase">HealthSense</span>
          <span className="text-[10px] font-bold text-[#34A0A4] uppercase tracking-[0.2em] -mt-1">Admin Operations</span>
        </div>
        
        <nav className="flex-1 px-6 space-y-3">
          {[{ id: 'overview', label: 'Overview', icon: <FaChartLine /> }, { id: 'patients', label: 'Patient Database', icon: <FaUsers /> }, { id: 'logs', label: 'Audit Logs', icon: <FaHistory /> }].map((item) => (
            <button key={item.id} onClick={() => setActiveView(item.id as ViewState)} className={`w-full px-6 py-4 rounded-[20px] flex items-center gap-4 font-black text-xs uppercase tracking-widest transition-all ${activeView === item.id ? 'bg-[#139dc7] text-white shadow-xl shadow-[#139dc7]/20' : 'text-[#139dc7] hover:bg-white/40'}`}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div className="p-8">
          <button onClick={() => { supabase.auth.signOut(); navigate("/"); }} className="w-full bg-white/20 backdrop-blur-md border border-red-400/30 text-red-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all">
            Terminate Session
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-24 px-12 flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-black text-[#0a4d61] tracking-tight uppercase">{activeView}</h2>
          
          {activeView === 'overview' && (
            <div className="flex bg-white/40 backdrop-blur-md p-1 rounded-2xl border border-white/50">
              {(['weekly', 'monthly', 'yearly'] as const).map((range) => (
                <button 
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === range ? 'bg-[#139dc7] text-white shadow-md' : 'text-[#139dc7] hover:bg-white/40'}`}
                >
                  {range}
                </button>
              ))}
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-12 pb-12">
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

              {/* GRAPH AREA */}
              <div className="bg-white/70 backdrop-blur-xl p-10 rounded-[40px] border border-white shadow-lg">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h4 className="text-[#139dc7] text-[10px] font-black uppercase tracking-[0.2em]">Diagnostic Frequency</h4>
                    <p className="text-xl font-black text-[#0a4d61]">{graphTitle}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-[#139dc7]/40 uppercase tracking-widest">Aggregate Scans</span>
                    <p className="text-2xl font-black text-[#139dc7]">{stats.total}</p>
                  </div>
                </div>
                
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={processedChartData}>
                      <defs>
                        <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#139dc7" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#139dc7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0a4d6110" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#139dc7', fontSize: 10, fontWeight: 900}} 
                        dy={15}
                      />
                      <YAxis 
                         axisLine={false} 
                         tickLine={false} 
                         tick={{fill: '#139dc7', fontSize: 10, fontWeight: 900}}
                      />
                      <Tooltip 
                        cursor={{ stroke: '#139dc7', strokeWidth: 2 }}
                        contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold', fontFamily: 'Lexend'}}
                      />
                      <Area type="monotone" dataKey="scans" stroke="#139dc7" strokeWidth={4} fillOpacity={1} fill="url(#colorScans)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeView === 'patients' && (
            <div className="bg-white/70 backdrop-blur-xl rounded-[40px] border border-white shadow-lg overflow-hidden">
               <div className="p-8 border-b border-white/50">
                <div className="relative max-w-md">
                  <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-[#139dc7]/40" />
                  <input 
                    type="text" 
                    placeholder="Search records..." 
                    className="w-full bg-white/50 border-2 border-transparent rounded-3xl py-5 pl-14 pr-8 text-sm font-bold text-[#0a4d61] outline-none shadow-inner"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <table className="w-full text-left">
                <thead className="bg-white/30 text-[10px] font-black text-[#139dc7] uppercase tracking-[0.2em]">
                  <tr>
                    <th className="px-10 py-6">Patient</th>
                    <th className="px-10 py-6">ID</th>
                    <th className="px-10 py-6">Sex</th>
                    <th className="px-10 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/20">
                  {filteredPatients.map((p) => (
                    <tr key={p.id} className="hover:bg-white/40 transition-all group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[#139dc7] text-white flex items-center justify-center font-black text-[10px]">
                            {p.first_name?.[0]}{p.last_name?.[0]}
                          </div>
                          <span className="font-bold">{p.first_name} {p.last_name}</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 font-mono text-xs">@{p.username}</td>
                      <td className="px-10 py-6 text-xs font-black uppercase opacity-40">{p.sex || 'N/A'}</td>
                      <td className="px-10 py-6 text-right">
                        <button 
                          onClick={() => {
                            setSelectedUser(p);
                            setEditData({
                              first_name: p.first_name || '',
                              middle_name: p.middle_name || '',
                              last_name: p.last_name || '',
                              username: p.username || '',
                              birthday: p.birthday || '',
                              sex: p.sex || ''
                            });
                          }}
                          className="w-10 h-10 rounded-xl bg-white text-[#139dc7] hover:bg-[#139dc7] hover:text-white transition-all ml-auto flex items-center justify-center shadow-sm"
                        >
                          <FaUserEdit />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeView === 'logs' && (
            <div className="space-y-4">
               {checkups.map((log, i) => (
                <div key={i} className="bg-white/70 backdrop-blur-xl p-6 rounded-[30px] border border-white flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <FaFileMedical className="text-[#139dc7]" />
                    <span className="text-sm font-bold">Log: @{log.profiles?.username} updated infrastructure diagnostics.</span>
                  </div>
                  <span className="text-[10px] font-black opacity-30 uppercase">{new Date(log.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* MODAL */}
{selectedUser && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a4d61]/60 backdrop-blur-md p-6 overflow-y-auto">
    <div className="bg-white/95 backdrop-blur-2xl w-full max-w-4xl rounded-[50px] shadow-2xl border border-white my-auto animate-in zoom-in-95 duration-200 overflow-hidden">
      
      {/* Header */}
      <div className="p-10 border-b border-[#139dc7]/10 flex items-center justify-between bg-white/50">
        <div>
          <h3 className="font-black text-[#0a4d61] text-2xl uppercase tracking-tighter">Edit Patient Record</h3>
          <p className="text-[10px] font-bold text-[#139dc7] uppercase tracking-[0.2em]">Modifying Profile: {selectedUser.username}</p>
        </div>
        <button 
          onClick={() => setSelectedUser(null)} 
          className="w-12 h-12 rounded-2xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
        >
          <FaTimes size={20} />
        </button>
      </div>

      <div className="p-10 grid grid-cols-1 lg:grid-cols-5 gap-10">
        
        {/* Left Column: Personal Information (Takes 3/5 space) */}
        <div className="lg:col-span-3 space-y-8">
          <section>
            <h4 className="text-[10px] font-black text-[#0a4d61]/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <span className="w-8 h-[2px] bg-[#139dc7]/20"></span> Primary Identity
            </h4>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-[#139dc7] uppercase tracking-widest ml-2">Health ID (Username)</label>
                <input 
                  className="bg-slate-100/80 border-2 border-transparent focus:border-[#139dc7]/20 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 ring-[#139dc7]/5 transition-all" 
                  value={editData.username} 
                  onChange={e => setEditData({...editData, username: e.target.value})} 
                />
              </div>

              {/* Improved Name Grid - No longer cramped */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-[#139dc7]/50 uppercase tracking-widest ml-2">First Name</label>
                  <input className="bg-slate-100/50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:bg-white focus:shadow-inner transition-all" value={editData.first_name} onChange={e => setEditData({...editData, first_name: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-[#139dc7]/50 uppercase tracking-widest ml-2">Middle Name</label>
                  <input className="bg-slate-100/50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:bg-white focus:shadow-inner transition-all" value={editData.middle_name} onChange={e => setEditData({...editData, middle_name: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-[10px] font-black text-[#139dc7]/50 uppercase tracking-widest ml-2">Last Name</label>
                  <input className="bg-slate-100/50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:bg-white focus:shadow-inner transition-all" value={editData.last_name} onChange={e => setEditData({...editData, last_name: e.target.value})} />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-[10px] font-black text-[#0a4d61]/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <span className="w-8 h-[2px] bg-[#139dc7]/20"></span> Demographics<span className="w-8 h-[2px] bg-[#139dc7]/20"></span>
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-[#139dc7]/50 uppercase tracking-widest ml-2">Birthday</label>
                <input type="date" className="bg-slate-100/50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none" value={editData.birthday} onChange={e => setEditData({...editData, birthday: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-[#139dc7]/50 uppercase tracking-widest ml-2">Sex</label>
                <select className="bg-slate-100/50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none appearance-none" value={editData.sex} onChange={e => setEditData({...editData, sex: e.target.value})}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
          </section>

          <button 
            onClick={handleUpdateUser} 
            disabled={isUpdating} 
            className="w-full py-6 bg-[#139dc7] text-white rounded-[25px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-[#139dc7]/30 hover:bg-[#0a4d61] hover:-translate-y-1 transition-all active:scale-95"
          >
            {isUpdating ? 'Synchronizing...' : 'Commit Profile Changes'}
          </button>
        </div>

        {/* Right Column: Security/Auth (Takes 2/5 space) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-50/80 rounded-[40px] p-8 border border-slate-100 flex flex-col h-full ring-1 ring-black/5">
            <div className="flex items-center gap-3 mb-6 text-[#139dc7]">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <FaKey />
              </div>
              <span className="font-black text-xs uppercase tracking-widest">Auth Override</span>
            </div>
            
            <p className="text-[11px] text-[#0a4d61]/60 mb-8 font-medium leading-relaxed bg-white/50 p-4 rounded-2xl border border-white">
              Security Protocol: Password updates are applied directly to the authentication provider. The input below is <b>unmasked</b> for administrative verification.
            </p>

            <div className="space-y-4 mt-auto">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-[#139dc7]/50 uppercase tracking-widest ml-2">New Password</label>
                <input 
                  type="text" 
                  placeholder="Type new password..." 
                  className="w-full bg-white rounded-2xl px-6 py-5 text-sm font-bold border border-slate-200 outline-none focus:border-[#139dc7] text-[#139dc7] shadow-sm"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <button 
                onClick={handleChangePassword}
                className="w-full py-5 bg-white border-2 border-[#139dc7] text-[#139dc7] rounded-[25px] font-black text-xs uppercase tracking-[0.2em] hover:bg-[#139dc7] hover:text-white transition-all shadow-sm active:scale-95"
              >
                Force Auth Update
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default AdminDashboard;