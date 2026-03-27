import { useEffect, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  ScrollView, Switch, Alert, TextInput, Modal
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../utils/supabaseClient'

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

  // Password modal
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
      largeDisplay: 'Large Display', largeDisplayDesc: 'Bigger text for easier reading',
      measurementUnits: 'Measurement Units', lang: 'Language',
      metric: 'kg, cm, °C', imperial: 'lb, in, °F',
      updatePass: 'Update Security Password',
      save: 'Synchronize Profile', saving: 'Saving...', saved: 'Changes Applied',
      locked: 'Identity data is locked for security.',
      passTitle: 'Update Password', currPass: 'Current Password',
      newPassLabel: 'New Password', confirmPassLabel: 'Confirm New Password',
      cancel: 'Cancel', update: 'Update Password',
    },
    Tagalog: {
      back: 'Bumalik', title: 'Ayos ng Account', desc: 'Pamahalaan ang profile at mga kagustuhan',
      personal: 'Impormasyon ng Personal', preferences: 'Kagustuhan',
      fullName: 'Buong Pangalan', birthdate: 'Kapanganakan', age: 'Edad', sex: 'Kasarian', patientId: 'Patient ID',
      largeDisplay: 'Malaking Display', largeDisplayDesc: 'Mas malaking teksto para sa mas madaling pagbabasa',
      measurementUnits: 'Yunit ng Sukat', lang: 'Wika',
      metric: 'kg, cm, °C', imperial: 'lb, in, °F',
      updatePass: 'I-update ang Password',
      save: 'I-sync ang Profile', saving: 'Sine-save...', saved: 'Nailapat na',
      locked: 'Naka-lock ang pagkakakilanlan para sa seguridad.',
      passTitle: 'I-update ang Password', currPass: 'Kasalukuyang Password',
      newPassLabel: 'Bagong Password', confirmPassLabel: 'Kumpirmahin ang Bagong Password',
      cancel: 'Kanselahin', update: 'I-update',
    },
  }

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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/'); return }
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
      }
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('profiles').update({
        language: pendingLanguage, units
      }).eq('id', user.id)
      if (error) throw error
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eaf4ff]">
        <ActivityIndicator size="large" color="#139dc7" />
        <Text className="text-[#139dc7] font-black text-sm mt-4 uppercase tracking-widest">Loading Settings</Text>
      </View>
    )
  }

  const fullName = `${profile?.first_name ?? ''} ${profile?.middle_name ? profile.middle_name + ' ' : ''}${profile?.last_name ?? ''}`.trim()

  return (
    <View className="flex-1 bg-[#eaf4ff]">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View className="px-5 pt-14 pb-4 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-[#139dc7] font-bold text-sm">← {lang.back}</Text>
          </TouchableOpacity>
          <View className="items-end">
            <Text className="text-xl font-black text-[#0a4d61] italic">{lang.title}</Text>
            <Text className="text-[9px] text-[#139dc7]/40 font-bold uppercase tracking-widest">{lang.desc}</Text>
          </View>
        </View>

        {/* Personal Info */}
        <View className="mx-5 bg-white/70 rounded-3xl border border-white shadow-sm p-5 mb-4">
          <View className="flex-row items-center gap-3 mb-4">
            <View className="w-9 h-9 bg-[#139dc7]/10 rounded-2xl items-center justify-center">
              <Ionicons name="person-outline" size={22} color="#139dc7" />
            </View>
            <Text className="text-base font-black text-[#0a4d61]">{lang.personal}</Text>
          </View>

          {/* Full name hero */}
          <View className="bg-[#139dc7] rounded-2xl p-4 mb-3">
            <Text className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-0.5">{lang.fullName}</Text>
            <Text className="text-xl font-black text-white leading-tight">{fullName || '—'}</Text>
          </View>

          {/* Birthdate | Age | Sex — single card */}
          <View className="bg-white/60 border border-white rounded-2xl mb-3 overflow-hidden">
            <View className="flex-row divide-x divide-[#139dc7]/10">
              <View className="flex-1 p-3">
                <Text className="text-[8px] font-black text-[#139dc7]/50 uppercase tracking-widest mb-1">{lang.birthdate}</Text>
                <Text className="text-sm font-black text-[#0a4d61]">
                  {profile?.birthday ? new Date(profile.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                </Text>
              </View>
              <View className="flex-1 p-3">
                <Text className="text-[8px] font-black text-[#139dc7]/50 uppercase tracking-widest mb-1">{lang.age}</Text>
                <Text className="text-sm font-black text-[#0a4d61]">{profile ? calculateAge(profile.birthday) : '—'}</Text>
              </View>
              <View className="flex-1 p-3">
                <Text className="text-[8px] font-black text-[#139dc7]/50 uppercase tracking-widest mb-1">{lang.sex}</Text>
                <Text className="text-sm font-black text-[#0a4d61]">{profile?.sex || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Patient ID */}
          <View className="bg-white/60 border border-white rounded-2xl p-3 mb-3">
            <Text className="text-[8px] font-black text-[#139dc7]/50 uppercase tracking-widest mb-1">{lang.patientId}</Text>
            <Text className="text-sm font-black text-[#0a4d61]" style={{ fontFamily: 'monospace' }}>{profile?.username || '—'}</Text>
          </View>

          <View className="flex-row items-center gap-2 bg-[#139dc7]/5 border border-[#139dc7]/10 rounded-2xl px-3 py-2.5">
            <Ionicons name="lock-closed-outline" size={14} color="#139dc7" />
            <Text className="text-[9px] text-[#139dc7]/60 font-bold italic flex-1">{lang.locked}</Text>
          </View>
        </View>

        {/* Preferences */}
        <View className="mx-5 bg-white/70 rounded-3xl border border-white shadow-sm p-5 mb-4">
          <View className="flex-row items-center gap-3 mb-4">
            <View className="w-9 h-9 bg-[#139dc7]/10 rounded-2xl items-center justify-center">
              <Ionicons name="settings-outline" size={22} color="#139dc7" />
            </View>
            <Text className="text-base font-black text-[#0a4d61]">{lang.preferences}</Text>
          </View>


          {/* Units */}
          <View className="mb-4">
            <Text className="text-[9px] font-black text-[#139dc7]/50 uppercase tracking-widest mb-2 ml-1">{lang.measurementUnits}</Text>
            <View className="flex-row gap-2">
              {(['metric', 'imperial'] as const).map(u => (
                <TouchableOpacity
                  key={u}
                  className="flex-1 h-11 rounded-xl border-2 items-center justify-center"
                  style={{
                    backgroundColor: units === u ? '#139dc7' : 'rgba(255,255,255,0.5)',
                    borderColor: units === u ? '#139dc7' : 'rgba(255,255,255,0.8)',
                  }}
                  onPress={() => setUnits(u)}
                >
                  <Text
                    className="font-black text-[10px] uppercase"
                    style={{ color: units === u ? 'white' : '#139dc7' }}
                  >
                    {u === 'metric' ? lang.metric : lang.imperial}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Language */}
          <View className="mb-4">
            <Text className="text-[9px] font-black text-[#139dc7]/50 uppercase tracking-widest mb-2 ml-1">{lang.lang}</Text>
            <View className="flex-row gap-2">
              {(['English', 'Tagalog'] as const).map(l => (
                <TouchableOpacity
                  key={l}
                  className="flex-1 h-11 rounded-xl border-2 items-center justify-center"
                  style={{
                    backgroundColor: pendingLanguage === l ? '#139dc7' : 'rgba(255,255,255,0.5)',
                    borderColor: pendingLanguage === l ? '#139dc7' : 'rgba(255,255,255,0.8)',
                  }}
                  onPress={() => setPendingLanguage(l)}
                >
                  <Text
                    className="font-black text-[10px] uppercase"
                    style={{ color: pendingLanguage === l ? 'white' : '#139dc7' }}
                  >
                    {l}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Change password */}
          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 py-3 rounded-2xl border border-[#139dc7]/15"
            onPress={() => setShowPassModal(true)}
          >
            <Text className="text-[#139dc7] font-black text-[10px] uppercase tracking-widest"><Ionicons name="lock-closed-outline" size={14} color="#139dc7" /> {lang.updatePass}</Text>
          </TouchableOpacity>
        </View>

        {/* Save button */}
        <TouchableOpacity
          className="mx-5 h-14 rounded-3xl items-center justify-center shadow-xl"
          style={{ backgroundColor: saved ? '#22c55e' : '#139dc7' }}
          onPress={handleSave}
          disabled={saving || saved}
        >
          {saving
            ? <ActivityIndicator color="white" />
            : <Text className="text-white font-black text-xs uppercase tracking-widest">
                {saved ? `✓ ${lang.saved}` : lang.save}
              </Text>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* Password Modal */}
      <Modal visible={showPassModal} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-white px-6 pt-10">
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-xl font-black text-[#0a4d61]">{lang.passTitle}</Text>
              <Text className="text-[#139dc7]/50 text-sm font-medium mt-0.5">Ensure your account stays secure.</Text>
            </View>
            <TouchableOpacity
              className="w-8 h-8 bg-slate-100 rounded-xl items-center justify-center"
              onPress={() => { setShowPassModal(false); setPassError(''); setOldPass(''); setNewPass(''); setConfirmPass('') }}
            >
              <Text className="text-slate-400 font-bold">✕</Text>
            </TouchableOpacity>
          </View>

          {[
            { label: lang.currPass, value: oldPass, set: setOldPass },
            { label: lang.newPassLabel, value: newPass, set: setNewPass },
            { label: lang.confirmPassLabel, value: confirmPass, set: setConfirmPass },
          ].map((f, i) => (
            <View key={i} className="mb-4">
              <Text className="text-[9px] font-black text-[#139dc7]/40 uppercase tracking-widest mb-1.5">{f.label}</Text>
              <TextInput
                className="h-12 bg-slate-50 border border-[#139dc7]/10 rounded-2xl px-4 text-[#0a4d61] font-bold text-sm"
                secureTextEntry
                value={f.value}
                onChangeText={f.set}
                autoCapitalize="none"
              />
            </View>
          ))}

          {passError !== '' && (
            <View className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 mb-4">
              <Text className="text-red-500 text-xs font-bold">⚠ {passError}</Text>
            </View>
          )}

          <View className="flex-row gap-3 mt-2">
            <TouchableOpacity
              className="flex-1 h-12 rounded-2xl border border-[#139dc7]/20 items-center justify-center"
              onPress={() => { setShowPassModal(false); setPassError('') }}
            >
              <Text className="text-[#139dc7] font-bold text-sm">{lang.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 h-12 rounded-2xl bg-[#139dc7] items-center justify-center"
              onPress={handleChangePassword}
              disabled={passLoading}
            >
              {passLoading
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-black text-sm">{lang.update}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}