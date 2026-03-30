import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase';
import { authenticateToken } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('pixels')
        .select('*')
        .eq('est_actif', true);

      if (error) throw error;
      res.status(200).json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de la récupération des pixels." });
    }
  } else if (req.method === 'POST') {
    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

    const { type, pixel_id } = req.body;
    try {
      // Désactiver l'ancien pixel du même type
      await supabase
        .from('pixels')
        .update({ est_actif: false })
        .eq('type', type);

      // Insérer le nouveau pixel
      const { data, error } = await supabase
        .from('pixels')
        .insert([{ type, pixel_id, est_actif: true }])
        .select()
        .single();

      if (error) throw error;
      res.status(200).json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de la sauvegarde du pixel." });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
