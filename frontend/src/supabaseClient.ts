import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client initialization.
 * Ensure you have set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
)