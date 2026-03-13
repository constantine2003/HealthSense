import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  FaUsers, FaChartLine, FaSearch, FaUserEdit, 
  FaTimes, FaHeartbeat, FaFileMedical, FaHistory, FaKey,
  FaSortAlphaDown, FaSortAlphaUp, FaCalendarAlt, FaCheckCircle,
  FaExclamationCircle, FaThermometerHalf, FaWeight, FaTint
} from 'react-icons/fa';
import { XAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';

type ViewState = 'overview' | 'patients' | 'logs';
type SortField = 'name' | 'date';
type SortDir = 'asc' | 'desc';

interface Toast {
  id: number;
  text: string;
  ok: boolean;
}

// ─── Toast Manager ────────────────────────────────────────────────────────────
let toastId = 0;

const ToastContainer = ({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) => (
  <div className="fixed bottom-8 right-8 z-200 flex flex-col gap-3 pointer-events-none">
    {toasts.map(t => (
      <div
        key={t.id}
        className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-widest pointer-events-auto
          ${t.ok ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
        style={{ animation: 'slideInRight 0.25s ease' }}
      >
        {t.ok ? <FaCheckCircle size={14} /> : <FaExclamationCircle size={14} />}
        {t.text}
        <button onClick={() => onRemove(t.id)} className="ml-2 opacity-60 hover:opacity-100">
          <FaTimes size={10} />
        </button>
      </div>
    ))}
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ViewState>('overview');
  const [patients, setPatients] = useState<any[]>([]);
  const [checkups, setCheckups] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [patientCheckups, setPatientCheckups] = useState<any[]>([]);
  const [loadingCheckups, setLoadingCheckups] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [timeRange, setTimeRange] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [modalTab, setModalTab] = useState<'profile' | 'history'>('profile');

  const [editData, setEditData] = useState({
    first_name: '', middle_name: '', last_name: '',
    username: '', birthday: '', sex: ''
  });

  // ─── Toast helpers ──────────────────────────────────────────────────────────
  const pushToast = useCallback((text: string, ok: boolean) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, text, ok }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ─── Data fetching ──────────────────────────────────────────────────────────
  const fetchHealthSenseData = async () => {
    const { data: profiles } = await supabase
      .from('profiles').select('*').order('created_at', { ascending: false });
    const { data: checkupData } = await supabase
      .from('health_checkups')
      .select('*, profiles(username, first_name, last_name)')
      .order('created_at', { ascending: false });
    setPatients(profiles || []);
    setCheckups(checkupData || []);
  };

  const fetchAuditLogs = async () => {
    const { data } = await supabase
      .from('health_checkups')
      .select('id, created_at, profiles(username, first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(100);
    setAuditLogs(data || []);
  };

  useEffect(() => {
    fetchHealthSenseData();
    fetchAuditLogs();
  }, []);

  // ─── Fetch selected patient's checkup history ───────────────────────────────
  const fetchPatientCheckups = async (userId: string) => {
    setLoadingCheckups(true);
    const { data } = await supabase
      .from('health_checkups')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setPatientCheckups(data || []);
    setLoadingCheckups(false);
  };

  // ─── Handlers ──────────────────────────────────────────────────────────────
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
      pushToast("Update failed: " + error.message, false);
    } else {
      pushToast("Profile updated successfully!", true);
      setAuditLogs(prev => [{
        id: `manual-${Date.now()}`,
        created_at: new Date().toISOString(),
        action: 'profile_updated',
        profiles: { username: editData.username, first_name: editData.first_name, last_name: editData.last_name }
      }, ...prev]);
      await fetchHealthSenseData();
      setSelectedUser(null);
    }
    setIsUpdating(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      pushToast("Password must be at least 6 characters.", false);
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.rpc('admin_change_password', {
        new_password: newPassword,
        user_id: selectedUser.id,
      });
      if (error) throw error;
      pushToast("Password updated successfully!", true);
      setAuditLogs(prev => [{
        id: `manual-${Date.now()}`,
        created_at: new Date().toISOString(),
        action: 'password_changed',
        profiles: { username: selectedUser.username, first_name: selectedUser.first_name, last_name: selectedUser.last_name }
      }, ...prev]);
      setNewPassword("");
    } catch (err: any) {
      pushToast(err.message ?? "Password update failed.", false);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ─── Sort & filter ──────────────────────────────────────────────────────────
  const filteredPatients = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = patients.filter(p =>
      `${p.first_name} ${p.last_name} ${p.username}`.toLowerCase().includes(q)
    );
    return filtered.sort((a, b) => {
      if (sortField === 'name') {
        const nA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nB = `${b.first_name} ${b.last_name}`.toLowerCase();
        return sortDir === 'asc' ? nA.localeCompare(nB) : nB.localeCompare(nA);
      }
      const dA = new Date(a.created_at).getTime();
      const dB = new Date(b.created_at).getTime();
      return sortDir === 'asc' ? dA - dB : dB - dA;
    });
  }, [patients, searchQuery, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // ─── Chart ─────────────────────────────────────────────────────────────────
  const graphTitle = useMemo(() => {
    const now = new Date();
    if (timeRange === 'weekly') {
      const first = now.getDate() - now.getDay();
      const last = first + 6;
      const firstDay = new Date(new Date().setDate(first)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const lastDay  = new Date(new Date().setDate(last)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${firstDay} — ${lastDay}`;
    }
    if (timeRange === 'monthly') return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return `Fiscal Year ${now.getFullYear()}`;
  }, [timeRange]);

  const processedChartData = useMemo(() => {
    const dataMap: { [key: string]: number } = {};
    if (timeRange === 'weekly') {
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      days.forEach(d => dataMap[d] = 0);
      checkups.forEach(c => {
        const d = new Date(c.created_at).toLocaleDateString('en-US', { weekday: 'short' });
        if (dataMap[d] !== undefined) dataMap[d]++;
      });
      return days.map(name => ({ name, scans: dataMap[name] }));
    }
    if (timeRange === 'yearly') {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      months.forEach(m => dataMap[m] = 0);
      checkups.forEach(c => {
        const m = new Date(c.created_at).toLocaleDateString('en-US', { month: 'short' });
        if (dataMap[m] !== undefined) dataMap[m]++;
      });
      return months.map(name => ({ name, scans: dataMap[name] }));
    }
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
    monthDays.forEach(d => dataMap[d] = 0);
    checkups.forEach(c => {
      const date = new Date(c.created_at);
      if (date.getMonth() === new Date().getMonth()) dataMap[date.getDate().toString()]++;
    });
    return monthDays.map(name => ({ name, scans: dataMap[name] }));
  }, [checkups, timeRange]);

  const stats = useMemo(() => ({
    today: checkups.filter(c => new Date(c.created_at).toDateString() === new Date().toDateString()).length,
    total: checkups.length,
    patientsCount: patients.length
  }), [checkups, patients]);

  // ─── Audit log display helpers ──────────────────────────────────────────────
  const getActionLabel = (log: any) => {
    const name = log.profiles ? `@${log.profiles.username}` : 'Unknown';
    if (log.action === 'password_changed') return `${name} — password changed by admin`;
    if (log.action === 'profile_updated')  return `${name} — profile record updated by admin`;
    return `${name} — health checkup recorded`;
  };
  const getActionColor = (log: any) => {
    if (log.action === 'password_changed') return 'text-orange-500';
    if (log.action === 'profile_updated')  return 'text-blue-500';
    return 'text-[#139dc7]';
  };
  const getActionIcon = (log: any) => {
    if (log.action === 'password_changed') return <FaKey       className="text-orange-400 shrink-0" />;
    if (log.action === 'profile_updated')  return <FaUserEdit  className="text-blue-400 shrink-0" />;
    return <FaFileMedical className="text-[#139dc7] shrink-0" />;
  };

  return (
    <div className="min-h-screen w-full flex bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-hidden text-[#0a4d61]">

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside className="w-80 bg-white/30 backdrop-blur-2xl border-r border-white/50 flex flex-col z-50 shrink-0">
        <div className="p-10 flex flex-col">
          <span className="text-2xl font-black text-[#139dc7] tracking-tighter uppercase">HealthSense</span>
          <span className="text-[10px] font-bold text-[#34A0A4] uppercase tracking-[0.2em] -mt-1">Admin Operations</span>
        </div>

        <nav className="flex-1 px-6 space-y-3">
          {[
            { id: 'overview', label: 'Overview',         icon: <FaChartLine />,  badge: null                },
            { id: 'patients', label: 'Patient Database', icon: <FaUsers />,      badge: stats.patientsCount },
            { id: 'logs',     label: 'Audit Logs',       icon: <FaHistory />,    badge: auditLogs.length    },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as ViewState)}
              className={`w-full px-6 py-4 rounded-[20px] flex items-center gap-4 font-black text-xs uppercase tracking-widest transition-all
                ${activeView === item.id ? 'bg-[#139dc7] text-white shadow-xl shadow-[#139dc7]/20' : 'text-[#139dc7] hover:bg-white/40'}`}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== null && (
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full
                  ${activeView === item.id ? 'bg-white/20 text-white' : 'bg-[#139dc7]/10 text-[#139dc7]'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-8">
          <button
            onClick={() => { supabase.auth.signOut(); navigate("/"); }}
            className="w-full bg-white/20 backdrop-blur-md border border-red-400/30 text-red-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all"
          >
            Log Off
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-24 px-12 flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-black text-[#0a4d61] tracking-tight uppercase">{activeView}</h2>
          {activeView === 'overview' && (
            <div className="flex bg-white/40 backdrop-blur-md p-1 rounded-2xl border border-white/50">
              {(['weekly', 'monthly', 'yearly'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                    ${timeRange === range ? 'bg-[#139dc7] text-white shadow-md' : 'text-[#139dc7] hover:bg-white/40'}`}
                >
                  {range}
                </button>
              ))}
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-12 pb-12">

          {/* OVERVIEW */}
          {activeView === 'overview' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-3 gap-8">
                {[
                  { label: "Today's Checks", val: stats.today,         icon: <FaHeartbeat />   },
                  { label: "Total Records",   val: stats.total,         icon: <FaFileMedical /> },
                  { label: "Active Patients", val: stats.patientsCount, icon: <FaUsers />       },
                ].map((s, i) => (
                  <div key={i} className="bg-white/60 backdrop-blur-xl p-8 rounded-[40px] border border-white shadow-sm flex flex-col">
                    <div className="text-[#139dc7] mb-4 opacity-50 text-2xl">{s.icon}</div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#139dc7]/60 mb-1">{s.label}</p>
                    <h3 className="text-4xl font-black text-[#0a4d61]">{s.val}</h3>
                  </div>
                ))}
              </div>

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
                <div style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={processedChartData}>
                      <defs>
                        <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#139dc7" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#139dc7" stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0a4d6110" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#139dc7', fontSize: 10, fontWeight: 900 }} dy={15} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#139dc7', fontSize: 10, fontWeight: 900 }} />
                      <Tooltip cursor={{ stroke: '#139dc7', strokeWidth: 2 }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold', fontFamily: 'Lexend' }} />
                      <Area type="monotone" dataKey="scans" stroke="#139dc7" strokeWidth={4} fillOpacity={1} fill="url(#colorScans)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* PATIENTS */}
          {activeView === 'patients' && (
            <div className="bg-white/70 backdrop-blur-xl rounded-[40px] border border-white shadow-lg overflow-hidden">
              <div className="p-8 border-b border-white/50 flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-50 max-w-md">
                  <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-[#139dc7]/40" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    className="w-full bg-white/50 border-2 border-transparent rounded-3xl py-5 pl-14 pr-8 text-sm font-bold text-[#0a4d61] outline-none shadow-inner"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => toggleSort('name')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
                      ${sortField === 'name' ? 'bg-[#139dc7] text-white' : 'bg-white/50 text-[#139dc7] hover:bg-white'}`}
                  >
                    {sortField === 'name' && sortDir === 'desc' ? <FaSortAlphaUp size={11} /> : <FaSortAlphaDown size={11} />}
                    Name
                  </button>
                  <button
                    onClick={() => toggleSort('date')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
                      ${sortField === 'date' ? 'bg-[#139dc7] text-white' : 'bg-white/50 text-[#139dc7] hover:bg-white'}`}
                  >
                    <FaCalendarAlt size={11} />
                    Date {sortField === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </button>
                </div>
              </div>

              <table className="w-full text-left">
                <thead className="bg-white/30 text-[10px] font-black text-[#139dc7] uppercase tracking-[0.2em]">
                  <tr>
                    <th className="px-10 py-6">Patient</th>
                    <th className="px-10 py-6">ID</th>
                    <th className="px-10 py-6">Sex</th>
                    <th className="px-10 py-6">Registered</th>
                    <th className="px-10 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/20">
                  {filteredPatients.map((p) => (
                    <tr key={p.id} className="hover:bg-white/40 transition-all group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[#139dc7] text-white flex items-center justify-center font-black text-[10px] shrink-0">
                            {p.first_name?.[0]}{p.last_name?.[0]}
                          </div>
                          <span className="font-bold">{p.first_name} {p.last_name}</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 font-mono text-xs">@{p.username}</td>
                      <td className="px-10 py-6 text-xs font-black uppercase opacity-40">{p.sex || 'N/A'}</td>
                      <td className="px-10 py-6 text-xs font-bold opacity-50">
                        {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-10 py-6 text-right">
                        <button
                          onClick={() => {
                            setSelectedUser(p);
                            setModalTab('profile');
                            setNewPassword("");
                            setPatientCheckups([]);
                            setEditData({
                              first_name:  p.first_name  || '',
                              middle_name: p.middle_name || '',
                              last_name:   p.last_name   || '',
                              username:    p.username    || '',
                              birthday:    p.birthday    || '',
                              sex:         p.sex         || ''
                            });
                            fetchPatientCheckups(p.id);
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

          {/* AUDIT LOGS */}
          {activeView === 'logs' && (
            <div className="space-y-4">
              {auditLogs.map((log, i) => (
                <div key={i} className="bg-white/70 backdrop-blur-xl p-6 rounded-[30px] border border-white flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    {getActionIcon(log)}
                    <div>
                      <span className={`text-sm font-bold ${getActionColor(log)}`}>
                        {getActionLabel(log)}
                      </span>
                      {log.action && (
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-30 mt-0.5">
                          {log.action.replace('_', ' ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-black opacity-30 uppercase shrink-0 ml-4">
                    {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' · '}
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* ── MODAL ── */}
      {selectedUser && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-[#0a4d61]/60 backdrop-blur-md p-6 overflow-y-auto">
          <div className="bg-white/95 backdrop-blur-2xl w-full max-w-4xl rounded-[50px] shadow-2xl border border-white my-auto animate-in zoom-in-95 duration-200 overflow-hidden">

            {/* Header */}
            <div className="p-10 border-b border-[#139dc7]/10 flex items-center justify-between bg-white/50">
              <div>
                <h3 className="font-black text-[#0a4d61] text-2xl uppercase tracking-tighter">Edit Patient Record</h3>
                <p className="text-[10px] font-bold text-[#139dc7] uppercase tracking-[0.2em]">
                  Modifying Profile: {selectedUser.username}
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="w-12 h-12 rounded-2xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-10 pt-6 flex gap-2 border-b border-[#139dc7]/10 pb-0">
              {[
                { id: 'profile', label: 'Profile & Auth' },
                { id: 'history', label: `Checkup History${patientCheckups.length ? ` (${patientCheckups.length})` : ''}` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setModalTab(tab.id as 'profile' | 'history')}
                  className={`px-6 py-3 rounded-t-2xl text-[10px] font-black uppercase tracking-widest transition-all border-b-2
                    ${modalTab === tab.id
                      ? 'bg-white text-[#139dc7] border-[#139dc7]'
                      : 'bg-transparent text-[#139dc7]/40 border-transparent hover:text-[#139dc7]'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB: Profile & Auth */}
            {modalTab === 'profile' && (
              <div className="p-10 grid grid-cols-1 lg:grid-cols-5 gap-10">
                <div className="lg:col-span-3 space-y-8">
                  <section>
                    <h4 className="text-[10px] font-black text-[#0a4d61]/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                      <span className="w-8 h-0.5 bg-[#139dc7]/20"></span> Primary Identity
                    </h4>
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-[#139dc7] uppercase tracking-widest ml-2">Health ID (Username)</label>
                        <input
                          className="bg-slate-100/80 border-2 border-transparent focus:border-[#139dc7]/20 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 ring-[#139dc7]/5 transition-all"
                          value={editData.username}
                          onChange={e => setEditData({ ...editData, username: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-[#139dc7]/50 uppercase tracking-widest ml-2">First Name</label>
                          <input className="bg-slate-100/50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:bg-white focus:shadow-inner transition-all" value={editData.first_name} onChange={e => setEditData({ ...editData, first_name: e.target.value })} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-[#139dc7]/50 uppercase tracking-widest ml-2">Middle Name</label>
                          <input className="bg-slate-100/50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:bg-white focus:shadow-inner transition-all" value={editData.middle_name} onChange={e => setEditData({ ...editData, middle_name: e.target.value })} />
                        </div>
                        <div className="flex flex-col gap-1.5 col-span-2">
                          <label className="text-[10px] font-black text-[#139dc7]/50 uppercase tracking-widest ml-2">Last Name</label>
                          <input className="bg-slate-100/50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:bg-white focus:shadow-inner transition-all" value={editData.last_name} onChange={e => setEditData({ ...editData, last_name: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-[10px] font-black text-[#0a4d61]/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                      <span className="w-8 h-0.5 bg-[#139dc7]/20"></span> Demographics <span className="w-8 h-0.5 bg-[#139dc7]/20"></span>
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-[#139dc7]/50 uppercase tracking-widest ml-2">Birthday</label>
                        <input type="date" className="bg-slate-100/50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none" value={editData.birthday} onChange={e => setEditData({ ...editData, birthday: e.target.value })} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-[#139dc7]/50 uppercase tracking-widest ml-2">Sex</label>
                        <select className="bg-slate-100/50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none appearance-none" value={editData.sex} onChange={e => setEditData({ ...editData, sex: e.target.value })}>
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
                    className="w-full py-6 bg-[#139dc7] text-white rounded-[25px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-[#139dc7]/30 hover:bg-[#0a4d61] hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isUpdating ? 'Synchronizing...' : 'Commit Profile Changes'}
                  </button>
                </div>

                <div className="lg:col-span-2">
                  <div className="bg-slate-50/80 rounded-[40px] p-8 border border-slate-100 flex flex-col h-full ring-1 ring-black/5">
                    <div className="flex items-center gap-3 mb-6 text-[#139dc7]">
                      <div className="p-3 bg-white rounded-xl shadow-sm"><FaKey /></div>
                      <span className="font-black text-xs uppercase tracking-widest">Auth Override</span>
                    </div>
                    <p className="text-[11px] text-[#0a4d61]/60 mb-8 font-medium leading-relaxed bg-white/50 p-4 rounded-2xl border border-white">
                      Directly updates <code className="text-[#139dc7]">auth.users.encrypted_password</code> via bcrypt. Input is <b>unmasked</b> for admin verification.
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
                        disabled={isChangingPassword}
                        className="w-full py-5 bg-white border-2 border-[#139dc7] text-[#139dc7] rounded-[25px] font-black text-xs uppercase tracking-[0.2em] hover:bg-[#139dc7] hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isChangingPassword ? 'Updating...' : 'Force Auth Update'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Checkup History */}
            {modalTab === 'history' && (
              <div className="p-10">
                {loadingCheckups ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-10 h-10 border-4 border-[#139dc7] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : patientCheckups.length === 0 ? (
                  <div className="text-center py-16 text-[#139dc7]/40 font-black uppercase tracking-widest text-xs">
                    No checkup records found
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {patientCheckups.map((c, i) => (
                      <div key={i} className="bg-slate-50/80 rounded-3xl p-6 border border-slate-100 ring-1 ring-black/5">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-black text-[#139dc7] uppercase tracking-widest">
                            Checkup #{patientCheckups.length - i}
                          </span>
                          <span className="text-[10px] font-black opacity-40 uppercase">
                            {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {' · '}
                            {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { icon: <FaTint size={10} />,            label: 'SpO2',   val: c.spo2,           unit: '%'    },
                            { icon: <FaThermometerHalf size={10} />, label: 'Temp',   val: c.temperature,    unit: '°C'   },
                            { icon: <FaWeight size={10} />,          label: 'Weight', val: c.weight,         unit: 'kg'   },
                            { icon: <FaHeartbeat size={10} />,       label: 'BP',     val: c.blood_pressure, unit: 'mmHg' },
                            { icon: <FaChartLine size={10} />,       label: 'BMI',    val: c.bmi,            unit: ''     },
                            { icon: <FaUsers size={10} />,           label: 'Height', val: c.height ? (Number(c.height) / 100).toFixed(2) : '--', unit: 'm' },
                          ].map((item, j) => (
                            <div key={j} className="bg-white rounded-2xl px-4 py-3 flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-[#139dc7]/50">
                                {item.icon}
                                <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                              </div>
                              <span className="text-lg font-black text-[#0a4d61] leading-none">
                                {item.val ?? '--'}
                                <span className="text-[10px] font-bold text-[#139dc7] ml-0.5">{item.unit}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── TOASTS ── */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default AdminDashboard;