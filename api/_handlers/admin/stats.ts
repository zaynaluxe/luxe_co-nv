import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import { authenticateToken } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = authenticateToken(req);
  if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

  try {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    // 1) CA du jour
    const { data: caJourRes } = await supabase
      .from('commandes')
      .select('total_ttc')
      .gte('date_commande', today)
      .neq('statut', 'annulee');
    const ca_jour = caJourRes?.reduce((acc, curr) => acc + parseFloat(curr.total_ttc), 0) || 0;

    // 2) CA du mois
    const { data: caMoisRes } = await supabase
      .from('commandes')
      .select('total_ttc')
      .gte('date_commande', firstDayOfMonth)
      .neq('statut', 'annulee');
    const ca_mois = caMoisRes?.reduce((acc, curr) => acc + parseFloat(curr.total_ttc), 0) || 0;

    // 3) Commandes en attente
    const { count: attente } = await supabase
      .from('commandes')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'en_attente');

    // 4) Livraisons réussies
    const { count: livrees } = await supabase
      .from('commandes')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'livree');

    // 5) Top 5 produits (Simplified logic for Supabase)
    const { data: topProduitsRes } = await supabase
      .from('lignes_commande')
      .select(`
        quantite,
        prix_unitaire,
        produits (nom)
      `)
      .limit(100); // Fetch some and aggregate in memory for simplicity

    const productStats: any = {};
    topProduitsRes?.forEach((item: any) => {
      const name = item.produits?.nom;
      if (!productStats[name]) productStats[name] = { name, sales: 0, revenue: 0 };
      productStats[name].sales += item.quantite;
      productStats[name].revenue += item.quantite * item.prix_unitaire;
    });

    const top_produits = Object.values(productStats)
      .sort((a: any, b: any) => b.sales - a.sales)
      .slice(0, 5);

    // 6) Répartition commandes
    const { data: repartitionRes } = await supabase
      .from('commandes')
      .select('statut');
    
    const repartitionStats: any = {};
    repartitionRes?.forEach((r: any) => {
      repartitionStats[r.statut] = (repartitionStats[r.statut] || 0) + 1;
    });

    const repartition_statut = Object.entries(repartitionStats).map(([statut, count]) => ({
      statut,
      count
    }));

    res.status(200).json({
      ca_jour,
      ca_mois,
      commandes_attente: attente || 0,
      livraisons_reussies: livrees || 0,
      top_produits,
      repartition_statut
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des statistiques." });
  }
}
