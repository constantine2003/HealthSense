export const Navbar = () => {
  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-zinc-900 border-b border-zinc-800">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg shadow-lg shadow-emerald-500/20" />
        <span className="text-xl font-bold tracking-tighter">HealthSense</span>
      </div>
      <div className="hidden md:flex gap-6 text-sm text-zinc-400 font-medium">
        <a href="#" className="hover:text-white transition">Overview</a>
        <a href="#" className="hover:text-white transition">Patient Data</a>
        <a href="#" className="hover:text-white transition">Analytics</a>
      </div>
      <button className="bg-zinc-100 text-zinc-950 px-4 py-1.5 rounded-full text-sm font-bold hover:bg-emerald-400 transition">
        Connect
      </button>
    </nav>
  );
};