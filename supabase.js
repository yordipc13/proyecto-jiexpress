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

window.testSupabaseConnection = async function () {
  if (!window.supabaseClient) {
    throw new Error('Cliente de Supabase no disponible. Verifica el SDK y la configuración.');
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase respondió con HTTP ${response.status}: ${details}`);
  }

  console.info('Conexión con Supabase establecida y clave pública aceptada.');
  return true;
};