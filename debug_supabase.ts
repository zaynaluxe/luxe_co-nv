import { supabase } from './api/_lib/supabase';

async function check() {
  const { data, error } = await supabase.from('produits').select('*').limit(1);
  console.log('Data:', data);
  console.log('Error:', error);
  
  const { data: cols, error: colError } = await supabase.rpc('get_table_info', { table_name: 'produits' });
  console.log('Cols:', cols);
  console.log('ColError:', colError);
}

check();
