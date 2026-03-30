import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase';
import { authenticateToken } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  const user = authenticateToken(req);
  if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

  if (req.method === 'GET') {
    try {
      const { data: order, error: orderError } = await supabase
        .from('commandes')
        .select(`
          *,
          clients (nom, prenom, telephone, email)
        `)
        .eq('id', id)
        .single();

      if (orderError || !order) return res.status(404).json({ error: "Commande non trouvée." });

      const { data: items, error: itemsError } = await supabase
        .from('lignes_commande')
        .select(`
          *,
          produits (nom),
          variantes_produits (valeur_variante)
        `)
        .eq('commande_id', id);

      if (itemsError) throw itemsError;

      const responseData = {
        ...order,
        client_display_name: order.clients ? `${order.clients.prenom} ${order.clients.nom}` : order.adresse_livraison,
        client_display_phone: order.telephone_contact || order.clients?.telephone,
        client_email: order.clients?.email,
        items: items.map((i: any) => ({
          ...i,
          produit_nom: i.produits?.nom,
          couleur: i.variantes_produits?.valeur_variante
        }))
      };

      res.status(200).json(responseData);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de la récupération des détails de la commande." });
    }
  } else if (req.method === 'PATCH') {
    const { statut } = req.body;
    try {
      const { data, error } = await supabase
        .from('commandes')
        .update({ statut })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      res.status(200).json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de la mise à jour du statut." });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
