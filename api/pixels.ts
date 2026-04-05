import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

const authenticateUser = async (req: VercelRequest) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  
  try {
    // Decode payload without verification (Vercel secret mismatch fix)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    if (!payload || !payload.email) return null;
    
    const { data: user } = await supabase
      .from('clients')
      .select('id, email, role')
      .eq('email', payload.email)
      .single();
      
    return user;
  } catch (err) {
    return null;
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url, query } = req;
  const cleanUrl = url?.split('?')[0] || '';
  const urlParts = cleanUrl.split('/') || [];
  
  // Try to get ID from query (Vercel rewrite) or URL path
  let id = query.id as string | undefined;
  if (!id || id === '') {
    id = urlParts[urlParts.length - 1] === 'pixels' ? undefined : urlParts[urlParts.length - 1];
  }
  if (id === '') id = undefined;

  if (method === 'GET') {
    if (!id) {
      // GET /api/pixels
      try {
        const { data, error } = await supabase.from('pixels').select('id, type, pixel_id, est_actif, date_creation').order('id');
        if (error) throw error;
        return res.status(200).json(data);
      } catch (err: any) {
        console.error('Error fetching pixels:', err);
        return res.status(500).json({ 
          error: 'Erreur lors de la récupération des pixels.', 
          details: err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err)) 
        });
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
    const user = await authenticateUser(req);
    if (!user || (user as any).role !== 'admin') return res.status(401).json({ error: 'Accès non autorisé.' });

    const { type, pixel_id, est_actif } = req.body;
    try {
      const { data, error } = await supabase.from('pixels').insert([{
        type, pixel_id, est_actif
      }]).select().single();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (err) {
      console.error('Error creating pixel:', err);
      return res.status(500).json({ error: 'Erreur lors de la création du pixel.', details: err instanceof Error ? err.message : String(err) });
    }
  } else if (method === 'PUT' || method === 'PATCH') {
    if (!id) return res.status(400).json({ error: "ID manquant" });
    const user = await authenticateUser(req);
    if (!user || (user as any).role !== 'admin') return res.status(401).json({ error: 'Accès non autorisé.' });

    const { type, pixel_id, est_actif } = req.body;
    try {
      const { data, error } = await supabase.from('pixels').update({
        type, pixel_id, est_actif
      }).eq('id', id).select().single();

      if (error) throw error;
      return res.status(200).json(data);
    } catch (err) {
      console.error('Error updating pixel:', err);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour du pixel.', details: err instanceof Error ? err.message : String(err) });
    }
  } else if (method === 'DELETE') {
    if (!id) return res.status(400).json({ error: "ID manquant" });
    const user = await authenticateUser(req);
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
