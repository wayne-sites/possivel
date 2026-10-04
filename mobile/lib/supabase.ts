import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://nwymsiuwiqyvvmdagzeg.supabase.co';
const fallbackAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53eW1zaXV3aXF5dnZtZGFnemVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NDk1MTEsImV4cCI6MjEwMTEyNTUxMX0.PRlMlBncRxJDcbYtteGkQM86vcDlTSyPexsQB402I6Y';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || fallbackUrl;
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || fallbackAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: { headers: { 'x-client-info': 'possivel-mobile/0.2.0' } },
});

export const functionsBaseUrl = `${supabaseUrl}/functions/v1`;
