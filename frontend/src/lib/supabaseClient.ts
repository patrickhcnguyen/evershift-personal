import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        "Missing environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be defined"
    );
}

const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
        db: {
            schema: "public"
        },
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'pkce'
        }
    }
);

export default supabase;