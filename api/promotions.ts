import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase';
import { authenticateToken } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = authenticateToken(req);
  if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('codes_promo')
        .select('*')
        .order('date_expiration', { ascending: false });

      if (error) throw error;
      res.status(200).json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de la récupération des promotions." });
    }
  } else if (req.method === 'POST') {
    const { code, type_remise, valeur_remise, date_expiration, usage_max } = req.body;
    try {
      const { data, error } = await supabase
        .from('codes_promo')
        .insert([{ code, type_remise, valeur_remise, date_expiration, usage_max }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de la création du code promo." });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
