import { Redirect } from 'expo-router';
export default function SupabaseTypesRoute() {
  return <Redirect href="/" />;
}
export type { Json, Database, Tables, TablesInsert, TablesUpdate, Enums, CompositeTypes } from '@/utils/supabase-types';
export { Constants } from '@/utils/supabase-types';
