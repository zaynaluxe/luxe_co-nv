import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase.ts';
import { authenticateToken } from './_lib/auth.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url } = req;
  const cleanUrl = url?.split('?')[0] || '';
  const urlParts = cleanUrl.split('/') || [];
  const id = urlParts[urlParts.length - 1] === 'pixels' ? null : urlParts[urlParts.length - 1];

  if (method === 'GET') {
    if (!id) {
      // GET /api/pixels
      try {
        const { data, error } = await supabase.from('pixels').select('*').order('nom');
        if (error) throw error;
        return res.status(200).json(data);
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur lors de la récupération des pixels.' });
      }
    } else {
      // GET /api/pixels/:id
      try {
        const { data, error } = await supabase.from('pixels').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Pixel non trouvé.' });
        return res.status(200).json(data);
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur lors de la récupération du pixel.' });
      }
    }
  } else if (method === 'POST') {
    const user = authenticateToken(req);
    if (!user || (user as any).role !== 'admin') return res.status(401).json({ error: 'Accès non autorisé.' });

    const { nom, plateforme, pixel_id, est_actif } = req.body;
    try {
      const { data, error } = await supabase.from('pixels').insert([{
        nom, plateforme, pixel_id, est_actif
      }]).select().single();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erreur lors de la création du pixel.' });
    }
  } else if (method === 'DELETE') {
    if (!id) return res.status(400).json({ error: "ID manquant" });
    const user = authenticateToken(req);
    if (!user || (user as any).role !== 'admin') return res.status(401).json({ error: 'Accès non autorisé.' });

    try {
      const { error } = await supabase.from('pixels').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ message: 'Pixel supprimé.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erreur lors de la suppression du pixel.' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
