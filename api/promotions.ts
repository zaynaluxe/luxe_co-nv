import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

const verifyToken = (token: string) => {
  try {
    return (jwt as any).default ? (jwt as any).default.verify(token, JWT_SECRET) : jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

const authenticateToken = (req: VercelRequest) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  return verifyToken(token);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url, query } = req;
  const cleanUrl = url?.split('?')[0] || '';
  const urlParts = cleanUrl.split('/') || [];
  
  // Try to get ID from query (Vercel rewrite) or URL path
  let id = query.id as string | undefined;
  if (!id || id === '') {
    id = urlParts[urlParts.length - 1] === 'promotions' ? undefined : urlParts[urlParts.length - 1];
  }
  if (id === '') id = undefined;

  if (method === 'GET') {
    if (!id) {
      // GET /api/promotions
      try {
        const { data, error } = await supabase.from('codes_promo').select('*').order('code');
        if (error) throw error;
        return res.status(200).json(data);
      } catch (err: any) {
        console.error('Error fetching promotions:', err);
        return res.status(500).json({ 
          error: 'Erreur lors de la récupération des promotions.', 
          details: err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err)) 
        });
      }
    } else {
      // GET /api/promotions/:id (check code validity)
      try {
        const { data, error } = await supabase.from('codes_promo').select('*').eq('code', id).eq('est_actif', true).maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Code promo invalide ou expiré.' });

        const now = new Date();
        if (data.date_expiration && new Date(data.date_expiration) < now) {
          return res.status(400).json({ error: 'Code promo expiré.' });
        }
        if (data.nombre_utilisations_max && data.nombre_utilisations_actuel >= data.nombre_utilisations_max) {
          return res.status(400).json({ error: 'Code promo épuisé.' });
        }

        return res.status(200).json(data);
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur lors de la vérification du code promo.' });
      }
    }
  } else if (method === 'POST') {
    const user = authenticateToken(req);
    if (!user || (user as any).role !== 'admin') return res.status(401).json({ error: 'Accès non autorisé.' });

    const { code, type_remise, valeur_remise, date_expiration, nombre_utilisations_max } = req.body;
    try {
      const { data, error } = await supabase.from('codes_promo').insert([{
        code, type_remise, valeur_remise, date_expiration, nombre_utilisations_max
      }]).select().single();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erreur lors de la création du code promo.' });
    }
  } else if (method === 'PUT') {
    if (!id) return res.status(400).json({ error: "ID manquant" });
    const user = authenticateToken(req);
    if (!user || (user as any).role !== 'admin') return res.status(401).json({ error: 'Accès non autorisé.' });

    const { code, type_remise, valeur_remise, date_expiration, nombre_utilisations_max, est_actif } = req.body;
    try {
      const { data, error } = await supabase.from('codes_promo').update({
        code, type_remise, valeur_remise, date_expiration, nombre_utilisations_max, est_actif
      }).eq('id', id).select().single();

      if (error) throw error;
      return res.status(200).json(data);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour du code promo.' });
    }
  } else if (method === 'DELETE') {
    if (!id) return res.status(400).json({ error: "ID manquant" });
    const user = authenticateToken(req);
    if (!user || (user as any).role !== 'admin') return res.status(401).json({ error: 'Accès non autorisé.' });

    try {
      const { error } = await supabase.from('codes_promo').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ message: 'Code promo supprimé.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erreur lors de la suppression du code promo.' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
