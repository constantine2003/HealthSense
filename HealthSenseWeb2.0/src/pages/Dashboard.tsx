export default function Dashboard() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-white">Patient Overview</h2>
        <p className="text-zinc-400">Real-time health analytics and vitals.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {['Heart Rate', 'Blood Oxygen', 'Sleep Quality', 'Activity'].map((stat) => (
          <div key={stat} className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 transition-colors">
            <p className="text-sm font-medium text-zinc-500">{stat}</p>
            <p className="text-2xl font-bold text-emerald-400">--</p>
          </div>
        ))}
      </div>
    </div>
  )
}