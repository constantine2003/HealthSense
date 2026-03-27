import { useEffect, useState, useMemo } from 'react'
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  ScrollView, TextInput, FlatList, Modal
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../utils/supabaseClient'
import { analyzeHealth } from '../utils/healthAnalysis'
import AsyncStorage from '@react-native-async-storage/async-storage'

const CACHE_KEY = 'hs_history_records'

interface CheckupRecord {
  date: string; time: string; rawDate: Date
  oxygen: string; temp: string; height: string
  weight: string; bmi: string; bp: string; heart_rate: string
}

export default function History() {
  const router = useRouter()
  const [records, setRecords] = useState<CheckupRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [language, setLanguage] = useState<'English' | 'Tagalog'>('English')
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortDir, setSortDir] = useState<'newest' | 'oldest'>('newest')
  const [riskFilter, setRiskFilter] = useState<'all' | 'none' | 'low' | 'moderate' | 'high'>('all')
  const [selectedRecord, setSelectedRecord] = useState<CheckupRecord | null>(null)
  const [expandedCondition, setExpandedCondition] = useState<number | null>(null)

  const lang = {
    English: {
      back: 'Back', title: 'Checkup History', subtitle: 'Your complete health record timeline.',
      search: 'Search by date...', noRecords: 'No records found.',
      checkedAt: 'Checked at', viewDetails: 'View Details', close: 'Close',
      newest: 'Newest', oldest: 'Oldest', allRisk: 'All', noRisk: 'No Risk',
      low: 'Low', moderate: 'Mod', high: 'High',
      insightsTitle: 'AI Health Analysis', insightsSubtitle: 'Rule-based analysis of your vitals',
      allClear: 'All Vitals Normal', allClearDesc: 'Readings are within healthy ranges.',
      riskLabels: { low: 'Low Risk', moderate: 'Moderate', high: 'High Risk' },
      relatedVitals: 'Related Vitals',
      disclaimer: 'For informational purposes only. Not a substitute for medical advice.',
      offlineBanner: 'Showing cached data — you\'re offline',
      vitalTitles: { spo2: 'SpO2', temp: 'Temp', height: 'Height', weight: 'Weight', bmi: 'BMI', bp: 'BP', hr: 'HR' },
    },
    Tagalog: {
      back: 'Bumalik', title: 'Kasaysayan ng Checkup', subtitle: 'Kumpletong timeline ng iyong medikal na rekord.',
      search: 'Maghanap gamit ang petsa...', noRecords: 'Walang nahanap na record.',
      checkedAt: 'Siniyasat noong', viewDetails: 'Tingnan', close: 'Isara',
      newest: 'Bago', oldest: 'Luma', allRisk: 'Lahat', noRisk: 'Wala',
      low: 'Mababa', moderate: 'Katamtaman', high: 'Mataas',
      insightsTitle: 'AI Pagsusuri ng Kalusugan', insightsSubtitle: 'Pagsusuri batay sa iyong mga vital signs',
      allClear: 'Lahat ng Vital Signs ay Normal', allClearDesc: 'Ang mga resulta ay nasa malusog na range.',
      riskLabels: { low: 'Mababang Panganib', moderate: 'Katamtamang Panganib', high: 'Mataas na Panganib' },
      relatedVitals: 'Kaugnay na Vital Signs',
      disclaimer: 'Para sa impormasyon lamang. Hindi kapalit ng medikal na payo.',
      offlineBanner: 'Naka-cache na data — offline ka',
      vitalTitles: { spo2: 'SpO2', temp: 'Temp', height: 'Taas', weight: 'Timbang', bmi: 'BMI', bp: 'BP', hr: 'HR' },
    },
  }

  const l = lang[language]
  const isMetric = units === 'metric'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/'); return }
        const { data: profile } = await supabase.from('profiles').select('language, units').eq('id', user.id).single()
        if (profile?.language) setLanguage(profile.language as 'English' | 'Tagalog')
        if (profile?.units) setUnits(profile.units.toLowerCase() as 'metric' | 'imperial')
        const { data, error } = await supabase
          .from('health_checkups')
          .select('spo2, temperature, height, weight, bmi, blood_pressure, heart_rate, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        if (error) throw error
        if (data) {
          const mapped = data.map(item => {
            const ts = new Date(item.created_at)
            return {
              rawDate: ts,
              date: ts.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
              time: ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              oxygen: item.spo2?.toString() || '0',
              temp: item.temperature?.toString() || '0',
              height: item.height?.toString() || '0',
              weight: item.weight?.toString() || '0',
              bmi: item.bmi?.toString() || '0',
              bp: item.blood_pressure || '0/0',
              heart_rate: item.heart_rate?.toString() || '--',
            }
          })
          setRecords(mapped)
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(mapped.map(r => ({ ...r, rawDate: r.rawDate.toISOString() }))))
        }
      } catch {
        const cached = await AsyncStorage.getItem(CACHE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached).map((r: any) => ({ ...r, rawDate: new Date(r.rawDate) }))
          setRecords(parsed)
          setOffline(true)
        }
      } finally { setLoading(false) }
    }
    fetchData()
  }, [])

  const filteredRecords = useMemo(() => {
    let result = [...records]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(r => r.date.toLowerCase().includes(q))
    }
    if (riskFilter !== 'all') {
      result = result.filter(r => {
        const conds = analyzeHealth(r)
        if (riskFilter === 'none') return conds.length === 0
        if (riskFilter === 'low') return conds.some(c => c.risk === 'low') && !conds.some(c => c.risk === 'moderate' || c.risk === 'high')
        if (riskFilter === 'moderate') return conds.some(c => c.risk === 'moderate') && !conds.some(c => c.risk === 'high')
        if (riskFilter === 'high') return conds.some(c => c.risk === 'high')
        return true
      })
    }
    result.sort((a, b) => sortDir === 'newest' ? b.rawDate.getTime() - a.rawDate.getTime() : a.rawDate.getTime() - b.rawDate.getTime())
    return result
  }, [records, searchQuery, riskFilter, sortDir])

  const getRiskInfo = (r: CheckupRecord) => {
    const conds = analyzeHealth(r)
    const high = conds.filter(c => c.risk === 'high').length
    const mod = conds.filter(c => c.risk === 'moderate').length
    const allNormal = conds.length === 0
    return { high, mod, allNormal }
  }

  const getVitalsMini = (r: CheckupRecord) => {
    const t = Number(r.temp), b = Number(r.bmi), w = Number(r.weight)
    const rawH = Number(r.height), heightM = rawH / 100
    const displayTemp = isMetric ? t : (t * 9/5) + 32
    const displayWeight = isMetric ? w : w * 2.20462
    const displayH = isMetric ? heightM : heightM * 39.3701
    return [
      { title: l.vitalTitles.spo2, value: r.oxygen, unit: '%' },
      { title: l.vitalTitles.temp, value: isNaN(t) ? '--' : displayTemp.toFixed(1), unit: isMetric ? '°C' : '°F' },
      { title: l.vitalTitles.weight, value: isNaN(w) ? '--' : displayWeight.toFixed(1), unit: isMetric ? 'kg' : 'lb' },
      { title: l.vitalTitles.bmi, value: r.bmi, unit: '' },
      { title: l.vitalTitles.height, value: isNaN(rawH) ? '--' : (isMetric ? heightM.toFixed(2) : displayH.toFixed(1)), unit: isMetric ? 'm' : 'in' },
      { title: l.vitalTitles.bp, value: r.bp, unit: 'mmHg' },
      { title: l.vitalTitles.hr, value: r.heart_rate, unit: 'bpm' },
    ]
  }

  const riskFilterOptions = [
    { key: 'all', label: l.allRisk, color: '#139dc7' },
    { key: 'none', label: l.noRisk, color: '#10b981' },
    { key: 'low', label: l.low, color: '#0ea5e9' },
    { key: 'moderate', label: l.moderate, color: '#f59e0b' },
    { key: 'high', label: l.high, color: '#ef4444' },
  ] as const

  const riskColors = {
    low:      { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1', dot: '#7dd3fc' },
    moderate: { bg: '#fffbeb', border: '#fcd34d', text: '#b45309', dot: '#fbbf24' },
    high:     { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', dot: '#f87171' },
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eaf4ff]">
        <ActivityIndicator size="large" color="#139dc7" />
        <Text className="text-[#139dc7] font-black text-sm mt-4 uppercase tracking-widest">Loading History</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-[#eaf4ff]">

      {/* Header */}
      <View className="px-5 pt-14 pb-3">
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-[#139dc7] font-bold text-sm">← {l.back}</Text>
          </TouchableOpacity>
          <View className="items-end">
            <Text className="text-xl font-black text-[#0a4d61]">{l.title}</Text>
            <Text className="text-[9px] text-[#139dc7]/50 font-medium">{l.subtitle}</Text>
          </View>
        </View>

        {/* Offline banner */}
        {offline && (
          <View className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2 flex-row items-center gap-2 mb-2">
            <Text className="text-amber-600 text-xs font-black">⚠ {l.offlineBanner}</Text>
          </View>
        )}

        {/* Search */}
        <TextInput
          className="h-11 bg-white/70 border-2 border-white/70 rounded-2xl px-4 text-[#139dc7] font-bold text-sm mb-2"
          placeholder={l.search}
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Sort + Risk filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1">
          <View className="flex-row gap-2 pr-4">
            {/* Sort */}
            <TouchableOpacity
              className="px-3 py-2 rounded-xl border-2 flex-row items-center gap-1"
              style={{ backgroundColor: '#139dc7', borderColor: '#139dc7' }}
              onPress={() => setSortDir(d => d === 'newest' ? 'oldest' : 'newest')}
            >
              <Text className="text-white font-black text-[10px] uppercase">
                {sortDir === 'newest' ? `↓ ${l.newest}` : `↑ ${l.oldest}`}
              </Text>
            </TouchableOpacity>

            {/* Risk filters */}
            {riskFilterOptions.map(opt => (
              <TouchableOpacity
                key={opt.key}
                className="px-3 py-2 rounded-xl border-2 flex-row items-center gap-1"
                style={{
                  backgroundColor: riskFilter === opt.key ? opt.color : 'rgba(255,255,255,0.7)',
                  borderColor: riskFilter === opt.key ? opt.color : 'rgba(255,255,255,0.8)',
                }}
                onPress={() => setRiskFilter(opt.key)}
              >
                {opt.key !== 'all' && (
                  <View className="w-2 h-2 rounded-full" style={{ backgroundColor: riskFilter === opt.key ? 'white' : opt.color }} />
                )}
                <Text
                  className="font-black text-[10px] uppercase"
                  style={{ color: riskFilter === opt.key ? 'white' : opt.color }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text className="text-[10px] font-black text-[#139dc7]/40 uppercase tracking-widest mt-1">
          {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
          {searchQuery || riskFilter !== 'all' ? ` of ${records.length}` : ''}
        </Text>
      </View>

      {/* Records list */}
      {filteredRecords.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-4xl mb-4">🔍</Text>
          <Text className="text-[#139dc7]/60 font-bold text-center">{l.noRecords}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 12 }}
          renderItem={({ item: record }) => {
            const { high, mod, allNormal } = getRiskInfo(record)
            const vitals = getVitalsMini(record)
            const accentColor = allNormal ? '#10b981' : high > 0 ? '#ef4444' : mod > 0 ? '#f59e0b' : '#0ea5e9'
            return (
              <View
                className="bg-white/75 rounded-3xl border border-white overflow-hidden"
                style={{ borderLeftWidth: 4, borderLeftColor: accentColor }}
              >
                {/* Top row */}
                <View className="flex-row items-center px-4 pt-4 pb-3 border-b border-slate-100/80">
                  <View className="flex-1">
                    <Text className="font-black text-[#0a4d61] text-base leading-tight">{record.date}</Text>
                    <Text className="text-[9px] text-[#139dc7]/50 font-bold uppercase tracking-widest mt-0.5">
                      {l.checkedAt} {record.time}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5 mr-2">
                    {allNormal && (
                      <View className="flex-row items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                        <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <Text className="text-[7px] font-black text-emerald-700 uppercase">Normal</Text>
                      </View>
                    )}
                    {high > 0 && (
                      <View className="flex-row items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                        <View className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <Text className="text-[7px] font-black text-red-700 uppercase">{high} High</Text>
                      </View>
                    )}
                    {mod > 0 && (
                      <View className="flex-row items-center gap-1 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                        <View className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <Text className="text-[7px] font-black text-amber-700 uppercase">{mod} Mod</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    className="px-3 py-2 bg-[#139dc7] rounded-xl"
                    onPress={() => { setSelectedRecord(record); setExpandedCondition(null) }}
                  >
                    <Text className="text-white font-black text-[10px] uppercase">›</Text>
                  </TouchableOpacity>
                </View>

                {/* Vitals mini */}
                <View className="flex-row flex-wrap px-3 py-2.5 gap-1.5">
                  {vitals.map((v, i) => (
                    <View key={i} className="bg-slate-50 rounded-xl px-2.5 py-1.5" style={{ minWidth: '13%' }}>
                      <Text className="text-[7px] font-black text-[#139dc7]/50 uppercase">{v.title}</Text>
                      <Text className="text-xs font-black text-[#0a4d61]">
                        {v.value}<Text className="text-[7px] opacity-50"> {v.unit}</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )
          }}
        />
      )}

      {/* Detail Modal */}
      <Modal visible={!!selectedRecord} animationType="slide" presentationStyle="pageSheet">
        {selectedRecord && (() => {
          const conditions = analyzeHealth(selectedRecord)
          const highCount = conditions.filter(c => c.risk === 'high').length
          const modCount = conditions.filter(c => c.risk === 'moderate').length
          const vitals = getVitalsMini(selectedRecord)
          return (
            <View className="flex-1 bg-white">
              {/* Modal header */}
              <View className="border-b border-slate-100">
                <View className="h-1 bg-[#139dc7]" />
                <View className="px-5 py-4 flex-row items-start justify-between">
                  <View>
                    <Text className="text-[9px] font-black text-[#139dc7] uppercase tracking-widest">Diagnostic Summary</Text>
                    <Text className="text-xl font-black text-[#0a4d61] mt-0.5">Checkup Report</Text>
                    <Text className="text-sm text-[#139dc7] font-bold mt-0.5">{selectedRecord.date} · {selectedRecord.time}</Text>
                  </View>
                  <TouchableOpacity
                    className="w-8 h-8 bg-slate-100 rounded-xl items-center justify-center"
                    onPress={() => setSelectedRecord(null)}
                  >
                    <Text className="text-slate-400 font-bold">✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                {/* Vitals 2-col */}
                <View className="flex-row flex-wrap gap-2 mb-5">
                  {vitals.map((v, i) => (
                    <View key={i} className="bg-slate-50 rounded-2xl p-3 border border-slate-100" style={{ width: '47.5%' }}>
                      <Text className="text-[8px] font-black text-[#139dc7]/40 uppercase tracking-widest mb-0.5">{v.title}</Text>
                      <Text className="text-xl font-black text-[#0a4d61] leading-none">
                        {v.value}<Text className="text-[10px] text-[#139dc7]/50 font-bold"> {v.unit}</Text>
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Analysis */}
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="font-black text-[#0a4d61] text-sm">🛡 {l.insightsTitle}</Text>
                  <View className="flex-row gap-1">
                    {highCount > 0 && (
                      <View className="flex-row items-center gap-1 bg-red-100 border border-red-200 rounded-full px-2 py-0.5">
                        <Text className="text-[7px] font-black text-red-700 uppercase">{highCount} High</Text>
                      </View>
                    )}
                    {modCount > 0 && (
                      <View className="flex-row items-center gap-1 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
                        <Text className="text-[7px] font-black text-amber-700 uppercase">{modCount} Mod</Text>
                      </View>
                    )}
                  </View>
                </View>

                {conditions.length === 0 ? (
                  <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex-row items-center gap-3">
                    <Text className="text-2xl">✓</Text>
                    <View>
                      <Text className="font-black text-emerald-700 text-sm">{l.allClear}</Text>
                      <Text className="text-emerald-600/70 text-xs mt-0.5">{l.allClearDesc}</Text>
                    </View>
                  </View>
                ) : (
                  <View className="gap-2">
                    {conditions.map((cond, i) => {
                      const cfg = riskColors[cond.risk]
                      const isOpen = expandedCondition === i
                      const name = language === 'Tagalog' ? cond.nameTagalog : cond.name
                      const explanation = language === 'Tagalog' ? cond.explanationTagalog : cond.explanation
                      return (
                        <View key={i} style={{ backgroundColor: cfg.bg, borderColor: cfg.border, borderWidth: 1 }} className="rounded-2xl overflow-hidden">
                          <TouchableOpacity className="flex-row items-center gap-3 p-3.5" onPress={() => setExpandedCondition(isOpen ? null : i)}>
                            <View className="w-7 h-7 rounded-lg items-center justify-center" style={{ backgroundColor: cfg.bg, borderColor: cfg.border, borderWidth: 1 }}>
                              <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                            </View>
                            <View className="flex-1">
                              <Text className="font-black text-[#0a4d61] text-xs leading-tight">{name}</Text>
                              <View className="flex-row flex-wrap gap-1 mt-0.5">
                                {cond.relatedVitals.map(v => (
                                  <View key={v} className="bg-white/70 rounded-full px-1.5 py-0.5 border border-[#139dc7]/20">
                                    <Text className="text-[7px] font-black uppercase text-[#139dc7]">{v}</Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.text + '20' }}>
                              <Text style={{ color: cfg.text }} className="text-[7px] font-black uppercase">{l.riskLabels[cond.risk]}</Text>
                            </View>
                            <Text style={{ color: cfg.text }}>{isOpen ? '▲' : '▼'}</Text>
                          </TouchableOpacity>
                          {isOpen && (
                            <View className="px-4 pb-3">
                              <View className="h-px bg-white/80 mb-2" />
                              <Text className="text-xs text-[#0a4d61]/80 leading-relaxed font-medium">{explanation}</Text>
                            </View>
                          )}
                        </View>
                      )
                    })}
                  </View>
                )}

                <View className="flex-row items-start gap-2 mt-4">
                  <Text className="text-[#139dc7]/30 text-xs">ℹ</Text>
                  <Text className="text-[8px] text-[#139dc7]/40 font-medium leading-relaxed flex-1">{l.disclaimer}</Text>
                </View>
              </ScrollView>
            </View>
          )
        })()}
      </Modal>
    </View>
  )
}