// =============================================================================
// PLN SURVEY APP - Supabase Client Configuration
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase credentials
const SUPABASE_URL = 'https://kpsilvibobjvqxanugto.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtwc2lsdmlib2JqdnF4YW51Z3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NTUxMjEsImV4cCI6MjA4MjAzMTEyMX0.7W2JMeVnezluKTlNvHI-_FmfatDYHawUGSXf-ooY0so';

// Create Supabase client with offline session support
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,           // Persist session to AsyncStorage
        autoRefreshToken: true,          // Auto-refresh token when online
        persistSession: true,            // Enable session persistence
        detectSessionInUrl: false,       // Not needed for mobile apps
    }
});

// Storage bucket name for photos
export const PHOTO_BUCKET = 'survey-photos';

