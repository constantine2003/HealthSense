import { Outlet } from 'react-router-dom'

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 rounded-md rotate-3" />
            <span className="font-bold text-xl tracking-tighter">HealthSense</span>
          </div>
          <div className="flex gap-8 text-sm text-zinc-400">
            <button className="hover:text-emerald-400 transition">Dashboard</button>
            <button className="hover:text-emerald-400 transition">Reports</button>
            <button className="hover:text-emerald-400 transition">Settings</button>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto p-8">
        <Outlet /> {/* This is where your pages will render */}
      </main>
    </div>
  )
}