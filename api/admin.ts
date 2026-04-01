import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase.ts';
import { authenticateToken, cloudinary } from './_lib/auth.ts';
import bcrypt from "bcryptjs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url } = req;
  const cleanUrl = url?.split('?')[0] || '';
  const urlParts = cleanUrl.split('/') || [];
  const resource = urlParts[3]; // /api/admin/RESOURCE
  const id = urlParts[4]; // /api/admin/RESOURCE/ID

  if (resource === 'setup') {
    // POST /api/admin/setup
    if (method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { email, mot_de_passe, nom, prenom } = req.body;
    try {
      const { data: existingAdmin } = await supabase.from('clients').select('id').eq('email', email).maybeSingle();
      if (existingAdmin) return res.status(400).json({ error: 'Un administrateur existe déjà.' });

      const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
      const { data: admin, error } = await supabase.from('clients').insert([{
        email, mot_de_passe: hashedPassword, nom, prenom
      }]).select().single();

      if (error) throw error;
      return res.status(201).json(admin);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erreur lors de la configuration de l\'admin.' });
    }
  }

  const user = authenticateToken(req);
  if (!user || (user as any).role !== 'admin') return res.status(401).json({ error: 'Accès non autorisé.' });

  if (resource === 'stats') {
    // GET /api/admin/stats
    try {
      const { data: orders } = await supabase.from('commandes').select('total_ttc, date_commande, statut');
      const { data: clients } = await supabase.from('clients').select('id');
      const { data: products } = await supabase.from('produits').select('id');

      const totalRevenue = orders?.reduce((acc, o) => acc + (o.total_ttc || 0), 0) || 0;
      const ordersCount = orders?.length || 0;
      const clientsCount = clients?.length || 0;
      const productsCount = products?.length || 0;

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];
        const dayRevenue = orders?.filter(o => o.date_commande.startsWith(dateStr)).reduce((acc, o) => acc + (o.total_ttc || 0), 0) || 0;
        return { date: dateStr, revenue: dayRevenue };
      });

      return res.status(200).json({ totalRevenue, ordersCount, clientsCount, productsCount, last7Days });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erreur lors de la récupération des stats.' });
    }
  } else if (resource === 'orders') {
    if (!id) {
      // GET /api/admin/orders
      try {
        const { data, error } = await supabase.from('commandes').select(`*, clients(nom, prenom, telephone, ville_defaut, adresse_defaut)`).order('date_commande', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur lors de la récupération des commandes.' });
      }
    } else {
      if (method === 'GET') {
        // GET /api/admin/orders/:id
        try {
          const { data, error } = await supabase.from('commandes').select(`*, clients(nom, prenom, telephone, ville_defaut, adresse_defaut), lignes_commande(*, produits(nom, image_principale_url))`).eq('id', id).single();
          if (error) throw error;
          return res.status(200).json(data);
        } catch (err) {
          console.error(err);
          return res.status(500).json({ error: 'Erreur lors de la récupération de la commande.' });
        }
      } else if (method === 'PATCH' || method === 'PUT') {
        // PATCH/PUT /api/admin/orders/:id
        const { statut } = req.body;
        try {
          const { data, error } = await supabase.from('commandes').update({ statut }).eq('id', id).select().single();
          if (error) throw error;
          return res.status(200).json(data);
        } catch (err) {
          console.error(err);
          return res.status(500).json({ error: 'Erreur lors de la mise à jour de la commande.' });
        }
      }
    }
  } else if (resource === 'clients') {
    // GET /api/admin/clients
    try {
      const { data, error } = await supabase.from('clients').select('*').order('nom');
      if (error) throw error;
      return res.status(200).json(data);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erreur lors de la récupération des clients.' });
    }
  } else if (resource === 'products') {
    // GET /api/admin/products
    try {
      const { data, error } = await supabase.from('produits').select(`*, categories(nom)`).order('nom');
      if (error) throw error;
      return res.status(200).json(data);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erreur lors de la récupération des produits.' });
    }
  } else {
    return res.status(404).json({ error: 'Resource not found' });
  }
}
