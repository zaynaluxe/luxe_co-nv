import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('CRITICAL: Supabase environment variables are missing.');
      console.error('SUPABASE_URL:', !!supabaseUrl);
      console.error('SUPABASE_KEY:', !!supabaseKey);
      throw new Error('SUPABASE_URL and a valid key (SERVICE_KEY or ANON_KEY) are required.');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseInstance;
};

// Export a proxy that initializes the client on first access
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    return (getSupabase() as any)[prop];
  }
});
