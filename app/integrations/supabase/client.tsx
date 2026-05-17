import { Redirect } from 'expo-router';
// This file must not be navigated to directly.
export default function SupabaseClientRoute() {
  return <Redirect href="/" />;
}
export { supabase } from '@/utils/supabase';
export type { Json, Database, Tables, TablesInsert, TablesUpdate, Enums, CompositeTypes } from '@/utils/supabase-types';
export { Constants } from '@/utils/supabase-types';
