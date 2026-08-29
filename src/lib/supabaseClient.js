import { createClient } from '@supabase/supabase-js';

// REPLACE THESE WITH YOUR ACTUAL SUPABASE KEYS
// 1. Go to https://supabase.com/
// 2. Create a New Project
// 3. Go to Settings -> API
const SUPABASE_URL = 'https://pxzkmwrbqtgyojsephtn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4emttd3JicXRneW9qc2VwaHRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MDg4MjAsImV4cCI6MjA4MTI4NDgyMH0.GzBeOlCbMUcDG2EC8RS7TEJsVFcrU3BX3bEM-Mn3PV4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
