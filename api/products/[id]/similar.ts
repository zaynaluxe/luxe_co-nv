import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: product, error: fetchError } = await supabase
      .from('produits')
      .select('categorie_id')
      .eq('id', id)
      .single();

    if (fetchError || !product) return res.status(404).json({ error: "Produit non trouvé." });
    
    const { data: similar, error: similarError } = await supabase
      .from('produits')
      .select(`
        id, 
        nom, 
        prix_base, 
        slug, 
        image_principale_url, 
        categories (nom)
      `)
      .eq('categorie_id', product.categorie_id)
      .neq('id', id)
      .eq('est_actif', true)
      .order('date_creation', { ascending: false })
      .limit(4);

    if (similarError) throw similarError;

    const flattenedData = similar.map((p: any) => ({
      ...p,
      prix: p.prix_base,
      image_url: p.image_principale_url,
      categorie: p.categories?.nom
    }));

    res.status(200).json(flattenedData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des produits similaires." });
  }
}
