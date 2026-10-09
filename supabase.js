const SUPABASE_URL = 'https://swpvtfjbseftynnhflfi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7Ig-tiFQ1S7zt_wna6tL5A_0UXQ3eUi';

if (!window.supabase || typeof window.supabase.createClient !== 'function') {
  window.supabaseClient = null;
  console.warn('Supabase no está disponible: falta cargar el SDK antes de este archivo.');
} else if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  window.supabaseClient = null;
  console.warn('Supabase no está configurado: faltan URL o clave pública.');
} else {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
