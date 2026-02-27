import { SUPABASE_ENVIRONMENT } from "../../environments/suprabase.environment";
export const supabaseConfig = {
  url: SUPABASE_ENVIRONMENT.supabaseUrl,
  anonKey: SUPABASE_ENVIRONMENT.supabaseAnonKey,
};
