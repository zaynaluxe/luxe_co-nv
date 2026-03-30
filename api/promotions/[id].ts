import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import { authenticateToken } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  const user = authenticateToken(req);
  if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

  if (req.method === 'PUT') {
    const { code, type_remise, valeur_remise, date_expiration, usage_max, est_actif } = req.body;
    try {
      const { data, error } = await supabase
        .from('codes_promo')
        .update({ code, type_remise, valeur_remise, date_expiration, usage_max, est_actif })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      res.status(200).json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de la mise à jour du code promo." });
    }
  } else if (req.method === 'PATCH') {
    // This is for toggle
    try {
      const { data: promo, error: fetchError } = await supabase
        .from('codes_promo')
        .select('est_actif')
        .eq('id', id)
        .single();

      if (fetchError || !promo) return res.status(404).json({ error: "Code promo non trouvé." });

      const { data, error } = await supabase
        .from('codes_promo')
        .update({ est_actif: !promo.est_actif })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      res.status(200).json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors du changement d'état du code promo." });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { error } = await supabase
        .from('codes_promo')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.status(200).json({ message: "Code promo supprimé avec succès." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de la suppression du code promo." });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
