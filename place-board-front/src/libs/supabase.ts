import { createClient } from '@supabase/supabase-js';

// 읽기, Realtime, Presence, 카카오 로그인, 사진 업로드용 (anon key)
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
