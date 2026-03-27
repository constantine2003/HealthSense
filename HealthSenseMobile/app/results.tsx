import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../utils/supabaseClient'
import { analyzeHealth } from '../utils/healthAnalysis'
import AsyncStorage from '@react-native-async-storage/async-storage'

const CACHE_KEY = 'hs_latest_record'

interface HealthRecord {
  date: string; time: string
  oxygen: string; temp: string; height: string
  weight: string; bmi: string; bp: string; heart_rate: string
}

export default function Results() {
  const router = useRouter()
  const [record, setRecord] = useState<HealthRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [language, setLanguage] = useState<'English' | 'Tagalog'>('English')
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric')
  const [expandedCondition, setExpandedCondition] = useState<number | null>(null)

  const content = {
    English: {
      back: 'Back', header: 'Latest Checkup Result', via: 'via HealthSense Kiosk',
      condition: 'Overall Condition', excellent: 'EXCELLENT', stable: 'STABLE',
      vitals: 'Vital Signs', latest: 'Latest recorded measurements',
      insightsTitle: 'AI Health Analysis', insightsSubtitle: 'Rule-based analysis of your vitals',
      allClear: 'All Vitals Normal', allClearDesc: 'Your readings are within healthy ranges.',
      riskLabels: { low: 'Low Risk', moderate: 'Moderate', high: 'High Risk' },
      relatedVitals: 'Related Vitals',
      disclaimer: 'For informational purposes only. Not a substitute for medical advice.',
      noRecord: 'No records found.', offlineBanner: "Showing cached data — you're offline",
      vitalTitles: { spo2: 'SpO2', temp: 'Temperature', height: 'Height', weight: 'Weight', bmi: 'BMI', bp: 'Blood Pressure', hr: 'Heart Rate' },
      status: { normal: 'Normal', low: 'Low', high: 'High', fever: 'Fever', highFever: 'High Fever', ideal: 'Ideal', elevated: 'Elevated', under: 'Underweight', over: 'Overweight', obese: 'Obese', noData: 'No Data' },
    },
    Tagalog: {
      back: 'Bumalik', header: 'Pinakabagong Resulta', via: 'gamit ang HealthSense Kiosk',
      condition: 'Pangkalahatang Kalagayan', excellent: 'NAPAKAHUSAY', stable: 'MAAYOS',
      vitals: 'Mga Vital Signs', latest: 'Pinakabagong naitalang sukat',
      insightsTitle: 'AI Pagsusuri ng Kalusugan', insightsSubtitle: 'Pagsusuri batay sa iyong mga vital signs',
      allClear: 'Lahat ng Vital Signs ay Normal', allClearDesc: 'Ang iyong mga resulta ay nasa malusog na range.',
      riskLabels: { low: 'Mababang Panganib', moderate: 'Katamtamang Panganib', high: 'Mataas na Panganib' },
      relatedVitals: 'Kaugnay na Vital Signs',
      disclaimer: 'Para sa impormasyon lamang. Hindi kapalit ng medikal na payo.',
      noRecord: 'Walang nahanap na record.', offlineBanner: 'Naka-cache na data — offline ka',
      vitalTitles: { spo2: 'SpO2', temp: 'Temperatura', height: 'Tangkad', weight: 'Timbang', bmi: 'BMI', bp: 'Presyon ng Dugo', hr: 'Heart Rate' },
      status: { normal: 'Normal', low: 'Mababa', high: 'Mataas', fever: 'Lagnat', highFever: 'Mataas na Lagnat', ideal: 'Ideal', elevated: 'Tumataas', under: 'Payat', over: 'Mabigat', obese: 'Obese', noData: 'Walang Data' },
    },
  }

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
          .limit(1)
          .single()
        if (error) throw error
        if (data) {
          const ts = new Date(data.created_at)
          const rec: HealthRecord = {
            date: ts.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            time: ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            oxygen: data.spo2?.toString() || '--',
            temp: data.temperature?.toString() || '--',
            height: data.height?.toString() || '--',
            weight: data.weight?.toString() || '--',
            bmi: data.bmi?.toString() || '--',
            bp: data.blood_pressure || '--/--',
            heart_rate: data.heart_rate?.toString() || '--',
          }
          setRecord(rec)
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(rec))
        }
      } catch {
        const cached = await AsyncStorage.getItem(CACHE_KEY)
        if (cached) { setRecord(JSON.parse(cached)); setOffline(true) }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const lang = content[language]
  const isMetric = units === 'metric'

  const getVitals = (r: HealthRecord) => {
    const s = Number(r.oxygen)
    const t = Number(r.temp)
    const b = Number(r.bmi)
    const w = Number(r.weight)
    const rawH = Number(r.height)
    const hr = Number(r.heart_rate)
    const displayTemp = isMetric ? t : (t * 9 / 5) + 32
    const displayWeight = isMetric ? w : w * 2.20462
    const heightM = rawH / 100
    const displayH = isMetric ? heightM : heightM * 39.3701

    let spo2Status = lang.status.normal, spo2Color = '#10b981'
    if (isNaN(s)) { spo2Status = lang.status.noData; spo2Color = '#f59e0b' }
    else if (s < 95) { spo2Status = lang.status.low; spo2Color = '#ef4444' }

    let tempStatus = lang.status.normal, tempColor = '#10b981'
    if (isNaN(t)) { tempStatus = lang.status.noData; tempColor = '#f59e0b' }
    else if (t > 39) { tempStatus = lang.status.highFever; tempColor = '#ef4444' }
    else if (t > 37.5) { tempStatus = lang.status.fever; tempColor = '#f59e0b' }

    let bmiStatus = lang.status.normal, bmiColor = '#10b981'
    if (isNaN(b)) { bmiStatus = lang.status.noData; bmiColor = '#f59e0b' }
    else if (b < 18.5) { bmiStatus = lang.status.under; bmiColor = '#f59e0b' }
    else if (b >= 30) { bmiStatus = lang.status.obese; bmiColor = '#ef4444' }
    else if (b >= 25) { bmiStatus = lang.status.over; bmiColor = '#f59e0b' }

    let bpStatus = lang.status.ideal, bpColor = '#10b981'
    if (r.bp?.includes('/') && !r.bp.includes('--')) {
      const [sys, dia] = r.bp.split('/').map(Number)
      if (sys > 140 || dia > 90) { bpStatus = lang.status.high; bpColor = '#ef4444' }
      else if (sys > 120 || dia > 80) { bpStatus = lang.status.elevated; bpColor = '#f59e0b' }
    } else { bpStatus = lang.status.noData; bpColor = '#f59e0b' }

    let hrStatus = lang.status.normal, hrColor = '#10b981'
    if (!r.heart_rate || r.heart_rate === '--' || isNaN(hr)) { hrStatus = lang.status.noData; hrColor = '#f59e0b' }
    else if (hr < 40 || hr > 150) { hrStatus = hr > 150 ? lang.status.high : lang.status.low; hrColor = '#ef4444' }
    else if (hr < 60) { hrStatus = lang.status.low; hrColor = '#f59e0b' }
    else if (hr > 100) { hrStatus = lang.status.high; hrColor = '#f59e0b' }

    return [
      { title: lang.vitalTitles.spo2, value: r.oxygen, unit: '%', status: spo2Status, color: spo2Color, icon: 'water-outline' },
      { title: lang.vitalTitles.temp, value: isNaN(t) ? '--' : displayTemp.toFixed(1), unit: isMetric ? '°C' : '°F', status: tempStatus, color: tempColor, icon: 'thermometer-outline' },
      { title: lang.vitalTitles.weight, value: isNaN(w) ? '--' : displayWeight.toFixed(1), unit: isMetric ? 'kg' : 'lb', status: bmiStatus, color: bmiColor, icon: 'barbell-outline' },
      { title: lang.vitalTitles.bmi, value: r.bmi, unit: '', status: bmiStatus, color: bmiColor, icon: 'body-outline' },
      { title: lang.vitalTitles.height, value: isNaN(rawH) ? '--' : (isMetric ? heightM.toFixed(2) : displayH.toFixed(1)), unit: isMetric ? 'm' : 'in', status: lang.status.normal, color: '#10b981', icon: 'resize-outline' },
      { title: lang.vitalTitles.bp, value: r.bp, unit: 'mmHg', status: bpStatus, color: bpColor, icon: 'heart-outline' },
      { title: lang.vitalTitles.hr, value: r.heart_rate, unit: 'bpm', status: hrStatus, color: hrColor, icon: 'pulse-outline' },
    ]
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eaf4ff]">
        <ActivityIndicator size="large" color="#139dc7" />
        <Text className="text-[#139dc7] font-black text-sm mt-4 uppercase tracking-widest">Loading Results</Text>
      </View>
    )
  }

  if (!record) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eaf4ff] px-6">
        <Text className="text-xl font-black text-[#0a4d61] mb-4 text-center">{lang.noRecord}</Text>
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-1">
          <Ionicons name="arrow-back" size={16} color="#139dc7" />
          <Text className="text-[#139dc7] font-bold">{lang.back}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const isHealthy = Number(record.oxygen) >= 95 && Number(record.bmi) < 25
  const conditions = analyzeHealth(record)
  const highCount = conditions.filter(c => c.risk === 'high').length
  const modCount = conditions.filter(c => c.risk === 'moderate').length
  const vitals = getVitals(record)

  const riskColors = {
    low: { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1', dot: '#7dd3fc' },
    moderate: { bg: '#fffbeb', border: '#fcd34d', text: '#b45309', dot: '#fbbf24' },
    high: { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', dot: '#f87171' },
  }

  // Split vitals: first 6 in pairs, last 1 centered
  const pairedVitals = vitals.slice(0, 6)
  const lastVital = vitals[6]

  return (
    <View className="flex-1 bg-[#eaf4ff]">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View className="px-5 pt-14 pb-2 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-1">
            <Ionicons name="arrow-back" size={16} color="#139dc7" />
            <Text className="text-[#139dc7] font-bold text-sm">{lang.back}</Text>
          </TouchableOpacity>
        </View>

        {/* Offline banner */}
        {offline && (
          <View className="mx-5 mb-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 flex-row items-center gap-2">
            <Ionicons name="warning-outline" size={14} color="#d97706" />
            <Text className="text-amber-600 text-xs font-black">{lang.offlineBanner}</Text>
          </View>
        )}

        {/* Hero card */}
        <View className="mx-5 bg-white/70 rounded-3xl border border-white shadow-sm mb-4 overflow-hidden">
          <View className={`h-1.5 w-full`} style={{ backgroundColor: isHealthy ? '#34d399' : '#fbbf24' }} />
          <View className="p-5">
            <View className="flex-row items-center gap-1.5 mb-1">
              <Ionicons name="calendar-outline" size={11} color="#139dc7" />
              <Text className="text-[10px] font-black text-[#139dc7] uppercase tracking-widest">
                {lang.header}
              </Text>
            </View>
            <Text className="text-2xl font-black text-[#0a4d61] leading-tight">{record.date}</Text>
            <Text className="text-[#139dc7]/60 text-sm font-medium mt-1">
              Recorded at {record.time} — {lang.via}
            </Text>
            <View className="mt-4 rounded-2xl px-5 py-3 items-center"
              style={{ backgroundColor: isHealthy ? '#10b981' : '#f59e0b' }}>
              <Text className="text-[9px] text-white/70 uppercase tracking-widest font-black">{lang.condition}</Text>
              <Text className="text-xl text-white font-black mt-0.5">
                {isHealthy ? lang.excellent : lang.stable}
              </Text>
            </View>
          </View>
        </View>

        {/* Vitals label */}
        <View className="px-5 mb-3">
          <Text className="text-base font-black text-[#0a4d61]">{lang.vitals}</Text>
          <Text className="text-[9px] text-[#139dc7]/40 font-bold uppercase tracking-widest mt-0.5">{lang.latest}</Text>
        </View>

        {/* Vitals grid — 2 columns, last centered */}
        <View className="px-5 mb-5">
          {/* Paired rows */}
          {[0, 1, 2].map(rowIndex => (
            <View key={rowIndex} className="flex-row gap-3 mb-3">
              {pairedVitals.slice(rowIndex * 2, rowIndex * 2 + 2).map((v, i) => (
                <View key={i} className="flex-1 bg-white/80 rounded-2xl p-4 border border-white shadow-sm">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="w-7 h-7 rounded-xl items-center justify-center"
                      style={{ backgroundColor: v.color + '20' }}>
                      <Ionicons name={v.icon as any} size={14} color={v.color} />
                    </View>
                    <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: v.color + '20' }}>
                      <Text style={{ color: v.color }} className="text-[7px] font-black uppercase">{v.status}</Text>
                    </View>
                  </View>
                  <Text className="text-[8px] font-black text-[#139dc7]/50 uppercase tracking-widest mb-0.5">{v.title}</Text>
                  <Text className="text-2xl font-black text-[#0a4d61] leading-none">
                    {v.value}
                    <Text className="text-xs text-[#139dc7]/60 font-bold"> {v.unit}</Text>
                  </Text>
                </View>
              ))}
            </View>
          ))}

          {/* Last vital centered */}
          {lastVital && (
            <View className="items-center">
              <View className="bg-white/80 rounded-2xl p-4 border border-white shadow-sm" style={{ width: '48%' }}>
                <View className="flex-row items-center justify-between mb-2">
                  <View className="w-7 h-7 rounded-xl items-center justify-center"
                    style={{ backgroundColor: lastVital.color + '20' }}>
                    <Ionicons name={lastVital.icon as any} size={14} color={lastVital.color} />
                  </View>
                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: lastVital.color + '20' }}>
                    <Text style={{ color: lastVital.color }} className="text-[7px] font-black uppercase">{lastVital.status}</Text>
                  </View>
                </View>
                <Text className="text-[8px] font-black text-[#139dc7]/50 uppercase tracking-widest mb-0.5">{lastVital.title}</Text>
                <Text className="text-2xl font-black text-[#0a4d61] leading-none">
                  {lastVital.value}
                  <Text className="text-xs text-[#139dc7]/60 font-bold"> {lastVital.unit}</Text>
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* AI Health Analysis */}
        <View className="px-5">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="shield-checkmark-outline" size={16} color="#0a4d61" />
              <Text className="text-base font-black text-[#0a4d61]">{lang.insightsTitle}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              {highCount > 0 && (
                <View className="flex-row items-center gap-1 bg-red-100 border border-red-200 rounded-full px-2.5 py-1">
                  <View className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <Text className="text-[8px] font-black text-red-700 uppercase">{highCount} {lang.riskLabels.high}</Text>
                </View>
              )}
              {modCount > 0 && (
                <View className="flex-row items-center gap-1 bg-amber-100 border border-amber-200 rounded-full px-2.5 py-1">
                  <View className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <Text className="text-[8px] font-black text-amber-700 uppercase">{modCount} {lang.riskLabels.moderate}</Text>
                </View>
              )}
            </View>
          </View>
          <Text className="text-[9px] text-[#139dc7]/40 font-bold uppercase tracking-widest mb-3">
            {lang.insightsSubtitle}
          </Text>

          {conditions.length === 0 ? (
            <View className="bg-white/70 border border-emerald-200 rounded-2xl p-5 flex-row items-center gap-4">
              <View className="w-10 h-10 bg-emerald-100 rounded-xl items-center justify-center">
                <Ionicons name="checkmark-circle-outline" size={22} color="#10b981" />
              </View>
              <View className="flex-1">
                <Text className="font-black text-emerald-700 text-sm">{lang.allClear}</Text>
                <Text className="text-emerald-600/70 text-xs mt-0.5">{lang.allClearDesc}</Text>
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
                    <TouchableOpacity
                      className="flex-row items-center gap-3 p-4"
                      onPress={() => setExpandedCondition(isOpen ? null : i)}
                    >
                      <View className="w-8 h-8 rounded-xl items-center justify-center"
                        style={{ backgroundColor: cfg.dot + '30', borderColor: cfg.border, borderWidth: 1 }}>
                        <View className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.dot }} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-black text-[#0a4d61] text-sm leading-tight">{name}</Text>
                        <View className="flex-row flex-wrap gap-1 mt-0.5">
                          {cond.relatedVitals.map(v => (
                            <View key={v} className="bg-white/70 rounded-full px-1.5 py-0.5 border border-[#139dc7]/20">
                              <Text className="text-[7px] font-black uppercase text-[#139dc7]">{v}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                      <View className="flex-row items-center gap-1.5">
                        <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.text + '20' }}>
                          <Text style={{ color: cfg.text }} className="text-[7px] font-black uppercase">{lang.riskLabels[cond.risk]}</Text>
                        </View>
                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={cfg.text} />
                      </View>
                    </TouchableOpacity>
                    {isOpen && (
                      <View className="px-4 pb-4">
                        <View className="h-px bg-white/80 mb-3" />
                        <View className="flex-row gap-2">
                          <View className="w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: cfg.dot }} />
                          <Text className="text-xs text-[#0a4d61]/80 leading-relaxed font-medium flex-1">{explanation}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          )}

          <View className="flex-row items-start gap-2 mt-4">
            <Ionicons name="information-circle-outline" size={13} color="#139dc7" style={{ opacity: 0.4 }} />
            <Text className="text-[8px] text-[#139dc7]/40 font-medium leading-relaxed flex-1">{lang.disclaimer}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}