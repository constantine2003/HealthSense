import { useEffect, useState, useMemo, useRef } from 'react'
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  ScrollView, TextInput, FlatList, Animated, Pressable
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../utils/supabaseClient'
import { analyzeHealth } from '../utils/healthAnalysis'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import BottomNav from "../components/BottomNav"

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
  const slideAnim = useRef(new Animated.Value(0)).current

  const lang = {
    English: {
      title: 'Checkup History', subtitle: 'Your complete health record timeline.',
      search: 'Search by date...', noRecords: 'No records found.',
      checkedAt: 'Checked at', newest: 'Newest', oldest: 'Oldest',
      allRisk: 'All', noRisk: 'No Risk', low: 'Low', moderate: 'Mod', high: 'High',
      insightsTitle: 'AI Health Analysis', insightsSubtitle: 'Rule-based analysis of your vitals',
      allClear: 'All Vitals Normal', allClearDesc: 'Readings are within healthy ranges.',
      riskLabels: { low: 'Low Risk', moderate: 'Moderate', high: 'High Risk' },
      disclaimer: 'For informational purposes only. Not a substitute for medical advice.',
      offlineBanner: "Showing cached data — you're offline",
      vitalTitles: { spo2: 'SpO2', temp: 'Temp', height: 'Height', weight: 'Weight', bmi: 'BMI', bp: 'BP', hr: 'HR' },
      back: 'Back', report: 'Checkup Report', diagnostic: 'Diagnostic Summary',
    },
    Tagalog: {
      title: 'Kasaysayan ng Checkup', subtitle: 'Kumpletong timeline ng iyong medikal na rekord.',
      search: 'Maghanap gamit ang petsa...', noRecords: 'Walang nahanap na record.',
      checkedAt: 'Siniyasat noong', newest: 'Bago', oldest: 'Luma',
      allRisk: 'Lahat', noRisk: 'Wala', low: 'Mababa', moderate: 'Katamtaman', high: 'Mataas',
      insightsTitle: 'AI Pagsusuri ng Kalusugan', insightsSubtitle: 'Pagsusuri batay sa iyong mga vital signs',
      allClear: 'Lahat ng Vital Signs ay Normal', allClearDesc: 'Ang mga resulta ay nasa malusog na range.',
      riskLabels: { low: 'Mababang Panganib', moderate: 'Katamtamang Panganib', high: 'Mataas na Panganib' },
      disclaimer: 'Para sa impormasyon lamang. Hindi kapalit ng medikal na payo.',
      offlineBanner: 'Naka-cache na data — offline ka',
      vitalTitles: { spo2: 'SpO2', temp: 'Temp', height: 'Taas', weight: 'Timbang', bmi: 'BMI', bp: 'BP', hr: 'HR' },
      back: 'Bumalik', report: 'Ulat ng Checkup', diagnostic: 'Buod ng Diagnosis',
    },
  }

  const openDetail = (record: CheckupRecord) => {
    setSelectedRecord(record)
    setExpandedCondition(null)
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start()
  }

  const closeDetail = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setSelectedRecord(null)
      setExpandedCondition(null)
    })
  }

  const handleLogout = async () => {
    try { await supabase.auth.signOut() } catch {}
    router.replace("/")
  }

  const l = lang[language]
  const isMetric = units === 'metric'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          const cachedProfile = await AsyncStorage.getItem('hs_profile')
          if (!cachedProfile) { router.replace('/'); return }
          const p = JSON.parse(cachedProfile)
          if (p.language) setLanguage(p.language)
          if (p.units) setUnits(p.units.toLowerCase())
          throw new Error('offline')
        }
        const user = session.user
        const cachedProfile = await AsyncStorage.getItem('hs_profile')
        if (cachedProfile) {
          const p = JSON.parse(cachedProfile)
          if (p.language) setLanguage(p.language)
          if (p.units) setUnits(p.units.toLowerCase())
        }
        try {
          const { data: profile } = await supabase.from('profiles').select('language, units').eq('id', user.id).single()
          if (profile?.language) setLanguage(profile.language as 'English' | 'Tagalog')
          if (profile?.units) setUnits(profile.units.toLowerCase() as 'metric' | 'imperial')
        } catch {}
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
    const t = Number(r.temp), w = Number(r.weight)
    const rawH = Number(r.height), heightM = rawH / 100
    const displayTemp = isMetric ? t : (t * 9 / 5) + 32
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
    low: { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1', dot: '#7dd3fc' },
    moderate: { bg: '#fffbeb', border: '#fcd34d', text: '#b45309', dot: '#fbbf24' },
    high: { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', dot: '#f87171' },
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf4ff' }}>
        <ActivityIndicator size="large" color="#139dc7" />
        <Text style={{ color: '#139dc7', fontWeight: '900', fontSize: 12, marginTop: 16, textTransform: 'uppercase', letterSpacing: 4 }}>Loading History</Text>
      </View>
    )
  }

  // ─── Detail View (replaces Modal) ───────────────────────────────────────────
  const DetailView = () => {
    if (!selectedRecord) return null
    const conditions = analyzeHealth(selectedRecord)
    const highCount = conditions.filter(c => c.risk === 'high').length
    const modCount = conditions.filter(c => c.risk === 'moderate').length
    const vitals = getVitalsMini(selectedRecord)

    const translateY = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [800, 0],
    })

    return (
      <Animated.View
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'white',
          zIndex: 100,
          transform: [{ translateY }],
        }}
      >
        {/* Header */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
          <View style={{ height: 4, backgroundColor: '#139dc7' }} />
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, fontWeight: '900', color: '#139dc7', textTransform: 'uppercase', letterSpacing: 2 }}>{l.diagnostic}</Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#0a4d61', marginTop: 2 }}>{l.report}</Text>
              <Text style={{ fontSize: 13, color: '#139dc7', fontWeight: '700', marginTop: 2 }}>{selectedRecord.date} · {selectedRecord.time}</Text>
            </View>
            <TouchableOpacity
              onPress={closeDetail}
              style={{ width: 36, height: 36, backgroundColor: '#f1f5f9', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Fully native ScrollView — no Modal wrapper */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="always"
        >
          {/* Vitals grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {vitals.map((v, i) => (
              <View key={i} style={{ width: '47.5%', backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f1f5f9', minHeight: 80 }}>
                <Text style={{ fontSize: 8, fontWeight: '900', color: 'rgba(19,157,199,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{v.title}</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#0a4d61', lineHeight: 24 }}>
                  {v.value}
                  <Text style={{ fontSize: 10, color: 'rgba(19,157,199,0.5)', fontWeight: '700' }}> {v.unit}</Text>
                </Text>
              </View>
            ))}
          </View>

          {/* Analysis header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="shield-checkmark" size={16} color="#0a4d61" />
              <Text style={{ fontWeight: '900', color: '#0a4d61', fontSize: 14 }}>{l.insightsTitle}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {highCount > 0 && (
                <View style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 7, fontWeight: '900', color: '#dc2626', textTransform: 'uppercase' }}>{highCount} High</Text>
                </View>
              )}
              {modCount > 0 && (
                <View style={{ backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 7, fontWeight: '900', color: '#b45309', textTransform: 'uppercase' }}>{modCount} Mod</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={{ fontSize: 9, color: 'rgba(19,157,199,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>{l.insightsSubtitle}</Text>

          {/* Conditions */}
          {conditions.length === 0 ? (
            <View style={{ backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#10b981" />
              <View>
                <Text style={{ fontWeight: '900', color: '#15803d', fontSize: 13 }}>{l.allClear}</Text>
                <Text style={{ color: 'rgba(22,163,74,0.7)', fontSize: 11, marginTop: 2 }}>{l.allClearDesc}</Text>
              </View>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {conditions.map((cond, i) => {
                const cfg = riskColors[cond.risk]
                const isOpen = expandedCondition === i
                const name = language === 'Tagalog' ? cond.nameTagalog : cond.name
                const explanation = language === 'Tagalog' ? cond.explanationTagalog : cond.explanation
                return (
                  <View key={i} style={{ backgroundColor: cfg.bg, borderColor: cfg.border, borderWidth: 1, borderRadius: 16 }}>
                    <Pressable
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}
                      onPress={() => setExpandedCondition(isOpen ? null : i)}
                    >
                      <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: cfg.dot + '30', borderWidth: 1, borderColor: cfg.border, alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cfg.dot }} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '900', color: '#0a4d61', fontSize: 12, lineHeight: 16 }}>{name}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {cond.relatedVitals.map(v => (
                            <View key={v} style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(19,157,199,0.2)' }}>
                              <Text style={{ fontSize: 7, fontWeight: '900', textTransform: 'uppercase', color: '#139dc7' }}>{v}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                      <View style={{ backgroundColor: cfg.text + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                        <Text style={{ color: cfg.text, fontSize: 7, fontWeight: '900', textTransform: 'uppercase' }}>{l.riskLabels[cond.risk]}</Text>
                      </View>
                      <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={cfg.text} />
                    </Pressable>
                    {isOpen && (
                      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
                        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.8)', marginBottom: 10 }} />
                        <Text style={{ fontSize: 12, color: 'rgba(10,77,97,0.8)', lineHeight: 18, fontWeight: '500' }}>{explanation}</Text>
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 16 }}>
            <Ionicons name="information-circle-outline" size={13} color="#139dc7" style={{ opacity: 0.4 }} />
            <Text style={{ fontSize: 8, color: 'rgba(19,157,199,0.4)', fontWeight: '500', lineHeight: 14, flex: 1 }}>{l.disclaimer}</Text>
          </View>
        </ScrollView>
      </Animated.View>
    )
  }

  // ─── Main List ───────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#eaf4ff' }}>

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#0a4d61', marginBottom: 2 }}>{l.title}</Text>
        <Text style={{ fontSize: 9, color: 'rgba(19,157,199,0.5)', fontWeight: '500', marginBottom: 8 }}>{l.subtitle}</Text>

        {offline && (
          <View style={{ backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="warning-outline" size={13} color="#d97706" />
            <Text style={{ color: '#d97706', fontSize: 12, fontWeight: '900' }}>{l.offlineBanner}</Text>
          </View>
        )}

        <TextInput
          style={{
            height: 44, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.7)', borderRadius: 16, paddingHorizontal: 16,
            color: '#139dc7', fontWeight: '700', fontSize: 14, marginBottom: 8,
          }}
          placeholder={l.search}
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
            <TouchableOpacity
              style={{ backgroundColor: '#139dc7', borderWidth: 2, borderColor: '#139dc7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}
              onPress={() => setSortDir(d => d === 'newest' ? 'oldest' : 'newest')}
            >
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 10, textTransform: 'uppercase' }}>
                {sortDir === 'newest' ? `↓ ${l.newest}` : `↑ ${l.oldest}`}
              </Text>
            </TouchableOpacity>
            {riskFilterOptions.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={{
                  backgroundColor: riskFilter === opt.key ? opt.color : 'rgba(255,255,255,0.7)',
                  borderColor: riskFilter === opt.key ? opt.color : 'rgba(255,255,255,0.8)',
                  borderWidth: 2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                }}
                onPress={() => setRiskFilter(opt.key)}
              >
                {opt.key !== 'all' && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: riskFilter === opt.key ? 'white' : opt.color }} />
                )}
                <Text style={{ color: riskFilter === opt.key ? 'white' : opt.color, fontWeight: '900', fontSize: 10, textTransform: 'uppercase' }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={{ fontSize: 10, fontWeight: '900', color: 'rgba(19,157,199,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
          {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
          {searchQuery || riskFilter !== 'all' ? ` of ${records.length}` : ''}
        </Text>
      </View>

      {/* List */}
      {filteredRecords.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Ionicons name="search-outline" size={48} color="#139dc7" style={{ opacity: 0.3, marginBottom: 12 }} />
          <Text style={{ color: 'rgba(19,157,199,0.6)', fontWeight: '700', textAlign: 'center' }}>{l.noRecords}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 12 }}
          renderItem={({ item: record }) => {
            const { high, mod, allNormal } = getRiskInfo(record)
            const vitals = getVitalsMini(record)
            const accentColor = allNormal ? '#10b981' : high > 0 ? '#ef4444' : mod > 0 ? '#f59e0b' : '#0ea5e9'
            return (
              <View style={{
                backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 24,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
                borderLeftWidth: 4, borderLeftColor: accentColor, overflow: 'hidden',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(241,245,249,0.8)' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '900', color: '#0a4d61', fontSize: 15, lineHeight: 20 }}>{record.date}</Text>
                    <Text style={{ fontSize: 9, color: 'rgba(19,157,199,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
                      {l.checkedAt} {record.time}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 8 }}>
                    {allNormal && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399' }} />
                        <Text style={{ fontSize: 7, fontWeight: '900', color: '#15803d', textTransform: 'uppercase' }}>Normal</Text>
                      </View>
                    )}
                    {high > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' }} />
                        <Text style={{ fontSize: 7, fontWeight: '900', color: '#dc2626', textTransform: 'uppercase' }}>{high} High</Text>
                      </View>
                    )}
                    {mod > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fbbf24' }} />
                        <Text style={{ fontSize: 7, fontWeight: '900', color: '#b45309', textTransform: 'uppercase' }}>{mod} Mod</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#139dc7', borderRadius: 12 }}
                    onPress={() => openDetail(record)}
                  >
                    <Ionicons name="chevron-forward" size={14} color="white" />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 10, gap: 6 }}>
                  {vitals.map((v, i) => (
                    <View key={i} style={{ backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, minWidth: 60 }}>
                      <Text style={{ fontSize: 7, fontWeight: '900', color: 'rgba(19,157,199,0.5)', textTransform: 'uppercase', marginBottom: 2 }}>{v.title}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: '#0a4d61', lineHeight: 16 }}>
                        {v.value}
                        <Text style={{ fontSize: 7, opacity: 0.5 }}> {v.unit}</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )
          }}
        />
      )}

      <BottomNav onLogout={handleLogout} />

      {/* Detail view slides over everything — no Modal */}
      <DetailView />
    </View>
  )
}