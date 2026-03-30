import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { data, error } = await supabase.from('produits').select('*').limit(5);
    res.status(200).json({ data, error });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
