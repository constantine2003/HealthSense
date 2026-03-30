import 'react-native-url-polyfill/auto'
import * as SecureStore from 'expo-secure-store'
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return await SecureStore.getItemAsync(key)
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(key, value)
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key)
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})