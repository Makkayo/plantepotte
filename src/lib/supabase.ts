import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const SUPABASE_URL = 'https://ebjbxfwtwrahuokydvtj.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViamJ4Znd0d3JhaHVva3lkdnRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDgxOTksImV4cCI6MjA4ODgyNDE5OX0.25yREg6vMLUPNoebopUX-TeMWlwKjtssRQLGa2BEQC0';

export const supabase = createClient<Database>(SUPABASE_URL, ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
