import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase';
import { authenticateToken, cloudinary } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const { data, error } = await supabase
        .from('produits')
        .select(`
          id, 
          nom, 
          prix_base, 
          slug, 
          image_principale_url, 
          categories (nom)
        `)
        .eq('est_actif', true)
        .order('date_creation', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      // Flatten the categories.nom to categorie
      const flattenedData = data.map((p: any) => ({
        ...p,
        prix: p.prix_base,
        image_url: p.image_principale_url,
        categorie: p.categories?.nom
      }));

      res.status(200).json(flattenedData);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur lors de la récupération des produits.' });
    }
  } else if (req.method === 'POST') {
    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

    const { nom, slug, description, prix_base, categorie_id, images_base64, images_urls: existing_urls, sections, texte_alignement, variantes } = req.body;
    
    try {
      let images_urls: string[] = Array.isArray(existing_urls) ? existing_urls : [];
      if (images_base64 && Array.isArray(images_base64)) {
        for (const base64 of images_base64) {
          const uploadRes = await cloudinary.uploader.upload(base64, { folder: "luxe_and_co/products" });
          images_urls.push(uploadRes.secure_url);
        }
      }

      const image_principale_url = images_urls.length > 0 ? images_urls[0] : "";

      const { data: product, error } = await supabase
        .from('produits')
        .insert([{
          nom, 
          slug, 
          description, 
          prix_base, 
          categorie_id, 
          image_principale_url, 
          images_urls, 
          sections: sections || [], 
          texte_alignement: texte_alignement || 'left'
        }])
        .select()
        .single();

      if (error) throw error;

      // Handle variants if provided
      if (variantes && Array.isArray(variantes)) {
        const variantsToInsert = [];
        for (const v of variantes) {
          let image_variante_url = v.image_variante_url || "";
          if (v.image_base64) {
            const uploadRes = await cloudinary.uploader.upload(v.image_base64, { folder: "luxe_and_co/variants" });
            image_variante_url = uploadRes.secure_url;
          }
          variantsToInsert.push({
            produit_id: product.id,
            valeur_variante: v.valeur_variante,
            prix_supplementaire: v.prix_supplementaire || 0,
            stock: v.stock || 0,
            image_variante_url
          });
        }
        if (variantsToInsert.length > 0) {
          const { error: varError } = await supabase
            .from('variantes_produits')
            .insert(variantsToInsert);
          if (varError) throw varError;
        }
      }

      res.status(201).json(product);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur lors de la création du produit.' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
