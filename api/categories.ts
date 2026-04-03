import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase.js';
import { authenticateToken } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;

  if (method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('nom');

      if (error) throw error;
      return res.status(200).json(data);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erreur lors de la récupération des catégories.' });
    }
  } else if (method === 'POST') {
    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

    const { nom, slug, description, image_url } = req.body;
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ nom, slug, description, image_url }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erreur lors de la création de la catégorie.' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
