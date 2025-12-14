
import { createClient } from '@supabase/supabase-js';

// Vui lòng tạo file .env tại thư mục gốc và thêm:
// VITE_SUPABASE_URL=your_supabase_project_url
// VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Allow runtime configuration via LocalStorage (for deploying without rebuilding)
const localUrl = localStorage.getItem('supabase_url');
const localKey = localStorage.getItem('supabase_key');

const supabaseUrl = envUrl || localUrl;
const supabaseKey = envKey || localKey;

export const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export const isConfigured = !!supabase;
