import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase.ts';
import { authenticateToken } from './_lib/auth.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;

  // Check env vars for debugging
  if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
    console.error('API Categories Error: SUPABASE_URL is missing');
  }
  if (!process.env.SUPABASE_SERVICE_KEY && !process.env.SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_ANON_KEY) {
    console.error('API Categories Error: SUPABASE_KEY is missing');
  }

  if (method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('nom');

      if (error) {
        console.error('Supabase error fetching categories:', error);
        throw error;
      }
      return res.status(200).json(data);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      return res.status(500).json({ 
        error: 'Erreur lors de la récupération des catégories.', 
        details: err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err)) 
      });
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
