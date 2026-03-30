import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import { authenticateToken } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = authenticateToken(req) as any;
  if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

  try {
    const { data, error } = await supabase
      .from('commandes')
      .select('*')
      .eq('client_id', user.id)
      .order('date_commande', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération de vos commandes." });
  }
}
