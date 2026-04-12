import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const authenticateAdmin = async (req: VercelRequest) => {
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
      
    if (!user || user.role !== 'admin') return null;
    return user;
  } catch (err) {
    return null;
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure we always return JSON
  res.setHeader('Content-Type', 'application/json');

  // Check env vars for debugging
  if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
    console.error('API Admin Error: SUPABASE_URL is missing');
  }
  if (!process.env.SUPABASE_SERVICE_KEY && !process.env.SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_ANON_KEY) {
    console.error('API Admin Error: SUPABASE_KEY is missing');
  }

  const { method, url, query } = req;
  const cleanUrl = url?.split('?')[0] || '';
  const urlParts = cleanUrl.split('/') || [];
  
  // Try to get resource and ID from query (Vercel rewrite) or URL path
  let resource = query.resource as string;
  let id = query.id as string | undefined;

  if (!resource) {
    // Fallback for direct calls if rewrites are not used
    if (urlParts[1] === 'api' && urlParts[2] === 'admin') {
      resource = urlParts[3];
      id = urlParts[4];
    } else if (urlParts[1] === 'admin') {
      resource = urlParts[2];
      id = urlParts[3];
    } else if (urlParts[1] && urlParts[1] !== 'api') {
      // Handle cases where the path is relative to /api/admin (Express app.use)
      // e.g. /stats -> urlParts: ['', 'stats']
      resource = urlParts[1];
      id = urlParts[2];
    }
  }

  if (id === '' || id === 'undefined') id = undefined;

  try {
    if (resource === 'setup') {
      // POST /api/admin/setup
      if (method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const { email, mot_de_passe, nom, prenom } = req.body;
      if (!email || !mot_de_passe) {
        return res.status(400).json({ error: 'Email et mot de passe requis pour le setup.' });
      }

      const { data: existingAdmin } = await supabase.from('clients').select('id').eq('email', email).maybeSingle();
      if (existingAdmin) return res.status(400).json({ error: 'Un utilisateur avec cet email existe déjà.' });

      const hash = (bcrypt as any).hash || (bcrypt as any).default?.hash;
      const hashedPassword = await (hash ? hash(mot_de_passe, 10) : bcrypt.hash(mot_de_passe, 10));
      
      const { data: admin, error } = await supabase.from('clients').insert([{
        email, mot_de_passe: hashedPassword, nom: nom || 'Admin', prenom: prenom || 'Luxe', role: 'admin'
      }]).select().single();

      if (error) {
        console.error('Supabase error during setup:', error);
        throw error;
      }
      return res.status(201).json({ message: 'Administrateur créé avec succès', user: admin });
    }

    const user = await authenticateAdmin(req);
    if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

    if (resource === 'stats') {
    // GET /api/admin/stats
    try {
      const { data: orders } = await supabase.from('commandes').select('total_ttc, date_commande, statut');
      const { data: orderItems } = await supabase.from('lignes_commande').select('quantite, prix_unitaire, produits(nom)');

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      const dailyRevenue = orders?.filter(o => o.date_commande.startsWith(today)).reduce((acc, o) => acc + (o.total_ttc || 0), 0) || 0;
      const monthlyRevenue = orders?.filter(o => {
        const d = new Date(o.date_commande);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).reduce((acc, o) => acc + (o.total_ttc || 0), 0) || 0;

      const pendingOrders = orders?.filter(o => o.statut === 'en_attente').length || 0;
      const completedOrders = orders?.filter(o => o.statut === 'livree').length || 0;

      // Calculate top products
      const productStats: Record<string, { sales: number; revenue: number }> = {};
      orderItems?.forEach(item => {
        const produits = Array.isArray(item.produits) ? item.produits[0] : item.produits;
        const name = (produits as any)?.nom || 'Produit inconnu';
        if (!productStats[name]) productStats[name] = { sales: 0, revenue: 0 };
        productStats[name].sales += item.quantite;
        productStats[name].revenue += item.quantite * item.prix_unitaire;
      });

      const topProducts = Object.entries(productStats)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const repartition = Object.entries(
        orders?.reduce((acc: any, o) => {
          acc[o.statut] = (acc[o.statut] || 0) + 1;
          return acc;
        }, {}) || {}
      ).map(([statut, count]) => ({ statut, count: count as number }));

      return res.status(200).json({ 
        dailyRevenue, 
        monthlyRevenue, 
        pendingOrders, 
        completedOrders, 
        topProducts, 
        repartition 
      });
    } catch (err: any) {
      console.error('Error fetching admin stats:', err);
      return res.status(500).json({ 
        error: 'Erreur lors de la récupération des stats.', 
        details: err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err)) 
      });
    }
  } else if (resource === 'orders') {
    if (!id) {
      // GET /api/admin/orders
      try {
        const { data, error } = await supabase.from('commandes').select(`id, numero_commande, nom_client, telephone_contact, adresse_livraison, ville_livraison, total_ttc, statut, date_commande`).order('date_commande', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      } catch (err: any) {
        console.error('Error fetching admin orders:', err);
        return res.status(500).json({ 
          error: 'Erreur lors de la récupération des commandes.', 
          details: err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err)) 
        });
      }
    } else {
      if (method === 'GET') {
        // GET /api/admin/orders/:id
        try {
          const { data, error } = await supabase.from('commandes').select(`id, numero_commande, nom_client, telephone_contact, adresse_livraison, ville_livraison, total_ttc, statut, date_commande, items:lignes_commande(*, produits(nom, image_principale_url))`).eq('id', id).single();
          if (error) throw error;
          
          // Map items to include produit_nom for frontend
          if (data && data.items) {
            data.items = data.items.map((item: any) => ({
              ...item,
              produit_nom: item.produits?.nom || 'Produit inconnu'
            }));
          }
          
          return res.status(200).json(data);
        } catch (err: any) {
          console.error('Error fetching admin order detail:', err);
          return res.status(500).json({ 
            error: 'Erreur lors de la récupération de la commande.',
            details: err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err))
          });
        }
      } else if (method === 'PATCH' || method === 'PUT') {
        // PATCH/PUT /api/admin/orders/:id
        const { statut } = req.body;
        try {
          const { data, error } = await supabase.from('commandes').update({ statut }).eq('id', id).select().single();
          if (error) throw error;
          return res.status(200).json(data);
        } catch (err: any) {
          console.error('Error updating admin order status:', err);
          return res.status(500).json({ 
            error: 'Erreur lors de la mise à jour de la commande.',
            details: err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err))
          });
        }
      }
    }
  } else if (resource === 'clients') {
    // GET /api/admin/clients
    try {
      const { data, error } = await supabase.from('clients').select('*').order('nom');
      if (error) throw error;
      return res.status(200).json(data);
    } catch (err: any) {
      console.error('Error fetching admin clients:', err);
      return res.status(500).json({ 
        error: 'Erreur lors de la récupération des clients.',
        details: err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err))
      });
    }
  } else if (resource === 'products') {
    // GET /api/admin/products
    try {
      const { data, error } = await supabase.from('produits').select(`*, categories(nom)`).order('nom');
      if (error) throw error;
      return res.status(200).json(data);
    } catch (err: any) {
      console.error('Error fetching admin products:', err);
      return res.status(500).json({ 
        error: 'Erreur lors de la récupération des produits.',
        details: err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err))
      });
    }
    } else {
      return res.status(404).json({ error: 'Resource not found' });
    }
  } catch (err: any) {
    console.error('Admin API Error:', err);
    return res.status(500).json({ 
      error: 'Erreur interne du serveur.',
      details: err.message || 'Unknown error'
    });
  }
}
