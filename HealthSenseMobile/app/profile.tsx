import { useEffect, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  ScrollView, Alert, TextInput, Modal
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../utils/supabaseClient'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function Profile() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [language, setLanguage] = useState<'English' | 'Tagalog'>('English')
  const [pendingLanguage, setPendingLanguage] = useState<'English' | 'Tagalog'>('English')
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric')
  const [profile, setProfile] = useState<{
    first_name: string; middle_name?: string; last_name: string
    birthday: string; sex: string; username: string
  } | null>(null)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const [showPassModal, setShowPassModal] = useState(false)
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passError, setPassError] = useState('')
  const [passLoading, setPassLoading] = useState(false)

  const content = {
    English: {
      back: 'Back', title: 'Account Settings', desc: 'Manage profile & preferences',
      personal: 'Personal Information', preferences: 'Preferences',
      fullName: 'Full Name', birthdate: 'Birthdate', age: 'Age', sex: 'Sex', patientId: 'Patient ID',
      measurementUnits: 'Measurement Units', lang: 'Language',
      metric: 'kg, cm, °C', imperial: 'lb, in, °F',
      updatePass: 'Update Security Password',
      save: 'Synchronize Profile', saving: 'Saving...', saved: 'Changes Applied',
      locked: 'Identity data is locked for security.',
      passTitle: 'Update Password', currPass: 'Current Password',
      newPassLabel: 'New Password', confirmPassLabel: 'Confirm New Password',
      cancel: 'Cancel', update: 'Update Password',
      faqTitle: 'Frequently Asked Questions',
      faqSub: 'Everything you need to know',
    },
    Tagalog: {
      back: 'Bumalik', title: 'Ayos ng Account', desc: 'Pamahalaan ang profile at mga kagustuhan',
      personal: 'Impormasyon ng Personal', preferences: 'Kagustuhan',
      fullName: 'Buong Pangalan', birthdate: 'Kapanganakan', age: 'Edad', sex: 'Kasarian', patientId: 'Patient ID',
      measurementUnits: 'Yunit ng Sukat', lang: 'Wika',
      metric: 'kg, cm, °C', imperial: 'lb, in, °F',
      updatePass: 'I-update ang Password',
      save: 'I-sync ang Profile', saving: 'Sine-save...', saved: 'Nailapat na',
      locked: 'Naka-lock ang pagkakakilanlan para sa seguridad.',
      passTitle: 'I-update ang Password', currPass: 'Kasalukuyang Password',
      newPassLabel: 'Bagong Password', confirmPassLabel: 'Kumpirmahin ang Bagong Password',
      cancel: 'Kanselahin', update: 'I-update',
      faqTitle: 'Mga Madalas na Tanong',
      faqSub: 'Lahat ng kailangan mong malaman',
    },
  }

  const getFaqs = (lang: 'English' | 'Tagalog') => [
    {
      icon: 'heart-outline' as const,
      q: lang === 'English' ? 'What do my vital signs mean?' : 'Ano ang ibig sabihin ng aking mga vital signs?',
      a: lang === 'English'
        ? 'SpO2 measures oxygen in your blood (normal: 97–100%). Temperature normal range is 36.1–37.2°C. Blood pressure normal is below 120/80 mmHg. BMI uses height and weight — for Asians, 23–24.9 is already at-risk. Heart rate normal resting is 60–100 bpm.'
        : 'SpO2 — sinusukat ang oxygen sa dugo (normal: 97–100%). Temperatura normal: 36.1–37.2°C. Presyon ng dugo normal: mas mababa sa 120/80 mmHg. BMI — para sa mga Asyano, ang 23–24.9 ay at-risk na. Heart rate normal: 60–100 bpm.',
    },
    {
      icon: 'shield-checkmark-outline' as const,
      q: lang === 'English' ? 'What is the AI Health Analysis?' : 'Ano ang AI Health Analysis?',
      a: lang === 'English'
        ? 'It is a rule-based clinical decision system — not a machine learning model. It evaluates your vitals against established medical thresholds from ACC/AHA 2017, WHO & Asian-Pacific BMI Standards, American Thoracic Society SpO2 ranges, SIRS Criteria, and AHA heart rate definitions. It is for informational purposes only — not a diagnosis.'
        : 'Ito ay isang rule-based clinical decision system — hindi machine learning model. Sinusuri nito ang iyong vitals gamit ang mga threshold mula sa ACC/AHA 2017, WHO & Asian-Pacific BMI Standards, at iba pa. Para sa impormasyon lamang — hindi diagnosis.',
    },
    {
      icon: 'document-text-outline' as const,
      q: lang === 'English' ? 'How do I read my results?' : 'Paano ko mababasa ang aking mga resulta?',
      a: lang === 'English'
        ? 'The Results page shows Vital Signs Cards with color-coded status badges (green = normal, orange = warning, red = danger). Below that is the AI Health Analysis with expandable condition cards showing the condition name, risk level, which vitals triggered it, and a detailed explanation.'
        : 'Ang Results page ay nagpapakita ng Vital Signs Cards na may color-coded status badges (berde = normal, dalandan = babala, pula = panganib). Sa ibaba ay ang AI Health Analysis na may mga expandable condition cards.',
    },
    {
      icon: 'lock-closed-outline' as const,
      q: lang === 'English' ? 'How is my data kept private?' : 'Paano napoprotektahan ang aking data?',
      a: lang === 'English'
        ? 'Your data is stored in Supabase with bcrypt password hashing, data isolation by user ID, HTTPS/TLS 1.3 encryption, and encrypted at rest. Your health data is never sold or shared with third parties. Only you and authorized HealthSense administrators can access your records.'
        : 'Ang iyong data ay nakaimbak sa Supabase na may bcrypt password hashing, data isolation sa pamamagitan ng user ID, HTTPS/TLS 1.3 encryption. Hindi kailanman ibinebenta o ibinabahagi ang iyong health data sa third parties.',
    },
    {
      icon: 'medical-outline' as const,
      q: lang === 'English' ? 'When should I see a doctor?' : 'Kailan ako dapat pumunta sa doktor?',
      a: lang === 'English'
        ? 'Seek IMMEDIATE emergency care if: SpO2 below 90%, temperature above 40°C, blood pressure at or above 180/120 mmHg, heart rate below 40 or above 150 bpm, or any HIGH RISK condition is flagged.\n\nSchedule a visit soon if: any MODERATE risk is flagged, SpO2 is 90–94%, or BMI is below 16 or above 30.\n\nThis system is a screening tool — not a diagnosis. Regular checkups are still essential.'
        : 'Humingi ng AGARANG emergency care kung: SpO2 mas mababa sa 90%, temperatura higit sa 40°C, presyon ng dugo 180/120 mmHg o mas mataas, heart rate mas mababa sa 40 o higit sa 150 bpm, o may HIGH RISK condition na na-flag.\n\nMag-schedule ng visit kung may MODERATE risk na na-flag.\n\nAng system na ito ay screening tool — hindi diagnosis.',
    },
  ]

  const calculateAge = (birthday: string) => {
    if (!birthday) return 'N/A'
    const birth = new Date(birthday)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          const cachedProfile = await AsyncStorage.getItem('hs_profile')
          if (!cachedProfile) { router.replace('/'); return }
          const p = JSON.parse(cachedProfile)
          setProfile(p)
          setLanguage(p.language || 'English')
          setPendingLanguage(p.language || 'English')
          setUnits(p.units?.toLowerCase() || 'metric')
          setLoading(false)
          return
        }

        const user = session.user

        // Load from cache first for instant display
        const cachedProfile = await AsyncStorage.getItem('hs_profile')
        if (cachedProfile) {
          const p = JSON.parse(cachedProfile)
          setProfile(p)
          setLanguage(p.language || 'English')
          setPendingLanguage(p.language || 'English')
          setUnits(p.units?.toLowerCase() || 'metric')
        }

        // Then fetch fresh from network
        try {
          const { data } = await supabase
            .from('profiles')
            .select('first_name, middle_name, last_name, birthday, sex, username, language, units, large_text')
            .eq('id', user.id)
            .single()
          if (data) {
            setProfile(data)
            setLanguage(data.language || 'English')
            setPendingLanguage(data.language || 'English')
            setUnits(data.units ? data.units.toLowerCase() as 'metric' | 'imperial' : 'metric')
            await AsyncStorage.setItem('hs_profile', JSON.stringify(data))
          }
        } catch {}

      } catch {
        const cachedProfile = await AsyncStorage.getItem('hs_profile')
        if (cachedProfile) {
          const p = JSON.parse(cachedProfile)
          setProfile(p)
          setLanguage(p.language || 'English')
          setPendingLanguage(p.language || 'English')
          setUnits(p.units?.toLowerCase() || 'metric')
        } else {
          router.replace('/')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const { error } = await supabase.from('profiles').update({
        language: pendingLanguage, units
      }).eq('id', session.user.id)
      if (error) throw error
      // Update cache
      const cached = await AsyncStorage.getItem('hs_profile')
      if (cached) {
        const p = JSON.parse(cached)
        await AsyncStorage.setItem('hs_profile', JSON.stringify({ ...p, language: pendingLanguage, units }))
      }
      setLanguage(pendingLanguage)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally { setSaving(false) }
  }

  const handleChangePassword = async () => {
    setPassError('')
    if (!oldPass || !newPass || !confirmPass) { setPassError('All fields are required.'); return }
    if (newPass !== confirmPass) { setPassError('New passwords do not match.'); return }
    if (newPass.length < 6) { setPassError('Password must be at least 6 characters.'); return }
    try {
      setPassLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('User email not found.')
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: oldPass })
      if (signInError) { setPassError('The current password is incorrect.'); return }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPass })
      if (updateError) throw updateError
      setShowPassModal(false)
      setOldPass(''); setNewPass(''); setConfirmPass('')
      Alert.alert('Success', 'Password updated successfully.')
    } catch (err: any) {
      setPassError(err.message || 'An unexpected error occurred.')
    } finally { setPassLoading(false) }
  }

  const lang = content[language]
  const faqs = getFaqs(language)

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf4ff' }}>
        <ActivityIndicator size="large" color="#139dc7" />
        <Text style={{ color: '#139dc7', fontWeight: '900', fontSize: 12, marginTop: 16, textTransform: 'uppercase', letterSpacing: 2 }}>Loading Settings</Text>
      </View>
    )
  }

  const fullName = `${profile?.first_name ?? ''} ${profile?.middle_name ? profile.middle_name + ' ' : ''}${profile?.last_name ?? ''}`.trim()

  return (
    <View style={{ flex: 1, backgroundColor: '#eaf4ff' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="arrow-back" size={16} color="#139dc7" />
            <Text style={{ color: '#139dc7', fontWeight: '700', fontSize: 14 }}>{lang.back}</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#0a4d61', fontStyle: 'italic' }}>{lang.title}</Text>
            <Text style={{ fontSize: 9, color: 'rgba(19,157,199,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2 }}>{lang.desc}</Text>
          </View>
        </View>

        {/* Personal Info */}
        <View style={{ marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <View style={{ width: 36, height: 36, backgroundColor: 'rgba(19,157,199,0.1)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="person-outline" size={20} color="#139dc7" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#0a4d61' }}>{lang.personal}</Text>
          </View>

          {/* Full name */}
          <View style={{ backgroundColor: '#139dc7', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <Text style={{ fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>{lang.fullName}</Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: 'white', lineHeight: 26 }}>{fullName || '—'}</Text>
          </View>

          {/* Birthdate | Age | Sex */}
          <View style={{ backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', borderRadius: 16, marginBottom: 12, flexDirection: 'row' }}>
            {[
              { label: lang.birthdate, value: profile?.birthday ? new Date(profile.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A' },
              { label: lang.age, value: profile ? String(calculateAge(profile.birthday)) : '—' },
              { label: lang.sex, value: profile?.sex || 'N/A' },
            ].map((item, i) => (
              <View key={i} style={{ flex: 1, padding: 12, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: 'rgba(19,157,199,0.1)' }}>
                <Text style={{ fontSize: 8, fontWeight: '900', color: 'rgba(19,157,199,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{item.label}</Text>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0a4d61' }}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Patient ID */}
          <View style={{ backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', borderRadius: 16, padding: 12, marginBottom: 12 }}>
            <Text style={{ fontSize: 8, fontWeight: '900', color: 'rgba(19,157,199,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{lang.patientId}</Text>
            <Text style={{ fontSize: 13, fontWeight: '900', color: '#0a4d61', fontVariant: ['tabular-nums'] }}>{profile?.username || '—'}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(19,157,199,0.05)', borderWidth: 1, borderColor: 'rgba(19,157,199,0.1)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 }}>
            <Ionicons name="lock-closed-outline" size={13} color="#139dc7" />
            <Text style={{ fontSize: 9, color: 'rgba(19,157,199,0.6)', fontWeight: '700', fontStyle: 'italic', flex: 1 }}>{lang.locked}</Text>
          </View>
        </View>

        {/* Preferences */}
        <View style={{ marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <View style={{ width: 36, height: 36, backgroundColor: 'rgba(19,157,199,0.1)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="settings-outline" size={20} color="#139dc7" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#0a4d61' }}>{lang.preferences}</Text>
          </View>

          {/* Units */}
          <Text style={{ fontSize: 9, fontWeight: '900', color: 'rgba(19,157,199,0.5)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, marginLeft: 4 }}>{lang.measurementUnits}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {(['metric', 'imperial'] as const).map(u => (
              <TouchableOpacity
                key={u}
                style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: units === u ? '#139dc7' : 'rgba(255,255,255,0.5)', borderColor: units === u ? '#139dc7' : 'rgba(255,255,255,0.8)' }}
                onPress={() => setUnits(u)}
              >
                <Text style={{ fontWeight: '900', fontSize: 10, textTransform: 'uppercase', color: units === u ? 'white' : '#139dc7' }}>
                  {u === 'metric' ? lang.metric : lang.imperial}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Language */}
          <Text style={{ fontSize: 9, fontWeight: '900', color: 'rgba(19,157,199,0.5)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, marginLeft: 4 }}>{lang.lang}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {(['English', 'Tagalog'] as const).map(l => (
              <TouchableOpacity
                key={l}
                style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: pendingLanguage === l ? '#139dc7' : 'rgba(255,255,255,0.5)', borderColor: pendingLanguage === l ? '#139dc7' : 'rgba(255,255,255,0.8)' }}
                onPress={() => setPendingLanguage(l)}
              >
                <Text style={{ fontWeight: '900', fontSize: 10, textTransform: 'uppercase', color: pendingLanguage === l ? 'white' : '#139dc7' }}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Change password */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(19,157,199,0.15)' }}
            onPress={() => setShowPassModal(true)}
          >
            <Ionicons name="lock-closed-outline" size={14} color="#139dc7" />
            <Text style={{ color: '#139dc7', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>{lang.updatePass}</Text>
          </TouchableOpacity>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={{ marginHorizontal: 20, height: 56, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: saved ? '#22c55e' : '#139dc7', marginBottom: 24, shadowColor: '#139dc7', shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 }}
          onPress={handleSave}
          disabled={saving || saved}
        >
          {saving
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: 'white', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 }}>
                {saved ? `✓ ${lang.saved}` : lang.save}
              </Text>
          }
        </TouchableOpacity>

        {/* FAQ Section */}
        <View style={{ marginHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <View style={{ width: 36, height: 36, backgroundColor: 'rgba(19,157,199,0.1)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="help-circle-outline" size={20} color="#139dc7" />
            </View>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#0a4d61' }}>{lang.faqTitle}</Text>
              <Text style={{ fontSize: 9, color: 'rgba(19,157,199,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2 }}>{lang.faqSub}</Text>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            {faqs.map((faq, i) => {
              const isOpen = expandedFaq === i
              return (
                <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20, borderWidth: 1, borderColor: isOpen ? 'rgba(19,157,199,0.25)' : 'rgba(255,255,255,0.9)', overflow: 'hidden' }}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}
                    onPress={() => setExpandedFaq(isOpen ? null : i)}
                    activeOpacity={0.8}
                  >
                    <View style={{ width: 32, height: 32, backgroundColor: 'rgba(19,157,199,0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Ionicons name={faq.icon} size={15} color="#139dc7" />
                    </View>
                    <Text style={{ flex: 1, fontWeight: '900', color: '#0a4d61', fontSize: 13, lineHeight: 18 }}>{faq.q}</Text>
                    <View style={{ width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: isOpen ? '#139dc7' : 'rgba(19,157,199,0.1)', flexShrink: 0 }}>
                      <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={12} color={isOpen ? 'white' : '#139dc7'} />
                    </View>
                  </TouchableOpacity>
                  {isOpen && (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                      <View style={{ height: 1, backgroundColor: 'rgba(19,157,199,0.1)', marginBottom: 12 }} />
                      {faq.a.split('\n\n').map((para, pi) => (
                        <View key={pi} style={{ marginBottom: pi < faq.a.split('\n\n').length - 1 ? 8 : 0 }}>
                          {para.split('\n').map((line, li) => (
                            <Text key={li} style={{ fontSize: 12, color: 'rgba(10,77,97,0.75)', lineHeight: 18, fontWeight: '500', marginLeft: line.startsWith('•') ? 8 : 0, marginTop: li > 0 ? 2 : 0 }}>
                              {line}
                            </Text>
                          ))}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        </View>

      </ScrollView>

      {/* Password Modal */}
      <Modal visible={showPassModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: 'white', paddingHorizontal: 24, paddingTop: 40 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#0a4d61' }}>{lang.passTitle}</Text>
              <Text style={{ color: 'rgba(19,157,199,0.5)', fontSize: 13, fontWeight: '500', marginTop: 2 }}>Ensure your account stays secure.</Text>
            </View>
            <TouchableOpacity
              style={{ width: 32, height: 32, backgroundColor: '#f1f5f9', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
              onPress={() => { setShowPassModal(false); setPassError(''); setOldPass(''); setNewPass(''); setConfirmPass('') }}
            >
              <Ionicons name="close" size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {[
            { label: lang.currPass, value: oldPass, set: setOldPass },
            { label: lang.newPassLabel, value: newPass, set: setNewPass },
            { label: lang.confirmPassLabel, value: confirmPass, set: setConfirmPass },
          ].map((f, i) => (
            <View key={i} style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 9, fontWeight: '900', color: 'rgba(19,157,199,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>{f.label}</Text>
              <TextInput
                style={{ height: 48, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: 'rgba(19,157,199,0.1)', borderRadius: 16, paddingHorizontal: 16, color: '#0a4d61', fontWeight: '700', fontSize: 14 }}
                secureTextEntry
                value={f.value}
                onChangeText={f.set}
                autoCapitalize="none"
              />
            </View>
          ))}

          {passError !== '' && (
            <View style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 }}>
              <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700' }}>⚠ {passError}</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <TouchableOpacity
              style={{ flex: 1, height: 48, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(19,157,199,0.2)', alignItems: 'center', justifyContent: 'center' }}
              onPress={() => { setShowPassModal(false); setPassError('') }}
            >
              <Text style={{ color: '#139dc7', fontWeight: '700', fontSize: 14 }}>{lang.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, height: 48, borderRadius: 16, backgroundColor: '#139dc7', alignItems: 'center', justifyContent: 'center' }}
              onPress={handleChangePassword}
              disabled={passLoading}
            >
              {passLoading
                ? <ActivityIndicator color="white" />
                : <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>{lang.update}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}