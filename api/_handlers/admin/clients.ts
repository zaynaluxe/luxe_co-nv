import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import { authenticateToken } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = authenticateToken(req);
  if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

  try {
    const { data, error } = await supabase
      .from('clients')
      .select('id, nom, prenom, email, telephone, ville_defaut, date_inscription')
      .order('date_inscription', { ascending: false });

    if (error) throw error;

    const flattenedData = data.map((c: any) => ({
      ...c,
      ville: c.ville_defaut
    }));

    res.status(200).json(flattenedData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des clients." });
  }
}
