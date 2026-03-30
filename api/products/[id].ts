import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import { authenticateToken, cloudinary } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let { id } = req.query;
  if (Array.isArray(id)) id = id[0];
  
  const productId = isNaN(Number(id)) ? id : Number(id);

  if (req.method === 'GET') {
    try {
      // For GET, we still use slug as the primary identifier for public routes
      const { data: product, error } = await supabase
        .from('produits')
        .select(`
          id, 
          nom, 
          description, 
          prix_base, 
          slug, 
          image_principale_url, 
          images_urls,
          sections,
          texte_alignement,
          categories (nom)
        `)
        .eq('slug', id)
        .single();

      if (error) return res.status(404).json({ error: "Produit non trouvé." });

      const { data: variantes, error: varError } = await supabase
        .from('variantes_produits')
        .select(`
          id, 
          valeur_variante, 
          prix_supplementaire, 
          stock, 
          image_variante_url
        `)
        .eq('produit_id', product.id);

      if (varError) throw varError;

      const responseData = {
        ...product,
        image_url: product.image_principale_url,
        categorie: Array.isArray(product.categories) ? product.categories[0]?.nom : (product.categories as any)?.nom,
        variantes: variantes.map((v: any) => ({
          ...v,
          couleur: v.valeur_variante,
          prix_supp: v.prix_supplementaire,
          image_url: v.image_variante_url
        }))
      };

      res.status(200).json(responseData);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de la récupération du produit." });
    }
  } else if (req.method === 'PUT') {
    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

    const { nom, description, prix_base, est_actif, est_en_vedette, images_urls, sections, texte_alignement } = req.body;
    try {
      const image_principale_url = images_urls && images_urls.length > 0 ? images_urls[0] : "";
      
      const { data, error } = await supabase
        .from('produits')
        .update({
          nom, 
          description, 
          prix_base, 
          est_actif, 
          est_en_vedette, 
          image_principale_url, 
          images_urls: images_urls || [], 
          sections: sections || [], 
          texte_alignement: texte_alignement || 'left'
        })
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;
      res.status(200).json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de la mise à jour du produit." });
    }
  } else if (req.method === 'DELETE') {
    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

    try {
      // 1. Récupérer les URLs des images du produit avant suppression
      const { data: product, error: fetchError } = await supabase
        .from('produits')
        .select('image_principale_url, images_urls')
        .eq('id', productId)
        .single();

      if (fetchError || !product) {
        console.error("Delete error - Product not found or error fetching:", JSON.stringify(fetchError), "ID:", productId, "Type of ID:", typeof productId);
        return res.status(404).json({ error: "Produit non trouvé.", details: fetchError });
      }

      const allUrls = [
        product.image_principale_url,
        ...(Array.isArray(product.images_urls) ? product.images_urls : [])
      ].filter(Boolean);

      // 2. Supprimer les images de Cloudinary
      for (const url of allUrls) {
        try {
          const parts = url.split('/');
          const uploadIndex = parts.findIndex(p => p === 'upload');
          if (uploadIndex !== -1 && parts.length > uploadIndex + 2) {
            const publicIdWithExt = parts.slice(uploadIndex + 2).join('/');
            const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
            await cloudinary.uploader.destroy(publicId);
          }
        } catch (cloudinaryErr) {
          console.error("Erreur Cloudinary lors de la suppression de l'image:", cloudinaryErr);
        }
      }

      // 3. Supprimer le produit de la base de données
      const { error: deleteError } = await supabase
        .from('produits')
        .delete()
        .eq('id', productId);

      if (deleteError) throw deleteError;
      
      res.status(200).json({ message: "Produit et images supprimés avec succès." });
    } catch (err) {
      console.error("Erreur lors de la suppression complète du produit:", err);
      res.status(500).json({ error: "Erreur lors de la suppression du produit." });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
