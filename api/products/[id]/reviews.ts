import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('avis')
      .select(`
        *,
        clients (nom, prenom)
      `)
      .eq('produit_id', id)
      .eq('est_approuve', true)
      .order('date_avis', { ascending: false });

    if (error) throw error;

    const flattenedData = data.map((a: any) => ({
      ...a,
      nom: a.clients?.nom,
      prenom: a.clients?.prenom
    }));

    res.status(200).json(flattenedData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des avis." });
  }
}
