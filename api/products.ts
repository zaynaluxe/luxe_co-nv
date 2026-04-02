import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase.ts';
import { authenticateToken, cloudinary } from './_lib/auth.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url, query } = req;
  const cleanUrl = url?.split('?')[0] || '';
  const urlParts = cleanUrl.split('/') || [];
  
  // Try to get ID from query (Vercel rewrite) or URL path
  let id = query.id as string | undefined;
  if (!id) {
    id = urlParts[urlParts.length - 1] === 'products' ? undefined : urlParts[urlParts.length - 1];
  }

  if (method === 'GET') {
    if (!id) {
      // GET /api/products
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
        
        const flattenedData = data.map((p: any) => ({
          ...p,
          prix: p.prix_base,
          image_url: p.image_principale_url,
          categorie: Array.isArray(p.categories) ? p.categories[0]?.nom : p.categories?.nom
        }));

        return res.status(200).json(flattenedData);
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur lors de la récupération des produits.' });
      }
    } else {
      // GET /api/products/:id
      try {
        const cleanId = id.toString().replace(/\/$/, '');
        const isNumeric = !isNaN(Number(cleanId));
        const orFilter = isNumeric 
          ? `slug.eq."${cleanId}",id.eq.${cleanId}` 
          : `slug.eq."${cleanId}"`;
        
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
          .or(orFilter)
          .maybeSingle();

        if (error) throw error;
        if (!product) return res.status(404).json({ error: "Produit non trouvé." });

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

        return res.status(200).json(responseData);
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erreur lors de la récupération du produit." });
      }
    }
  } else if (method === 'POST') {
    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

    const { nom, slug, description, prix_base, categorie_id, images_base64, images_urls: existing_urls, sections, texte_alignement, variantes, est_actif, est_en_vedette } = req.body;
    
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
          texte_alignement: texte_alignement || 'left',
          est_actif: est_actif !== undefined ? est_actif : true,
          est_en_vedette: est_en_vedette !== undefined ? est_en_vedette : false
        }])
        .select()
        .single();

      if (error) throw error;

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

      return res.status(201).json(product);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erreur lors de la création du produit.' });
    }
  } else if (method === 'PUT') {
    if (!id) return res.status(400).json({ error: "ID manquant" });
    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

    const { nom, description, prix_base, categorie_id, est_actif, est_en_vedette, images_urls, sections, texte_alignement, variantes } = req.body;
    try {
      const image_principale_url = images_urls && images_urls.length > 0 ? images_urls[0] : "";
      
      const { data: product, error } = await supabase
        .from('produits')
        .update({
          nom, 
          description, 
          prix_base, 
          categorie_id,
          est_actif, 
          est_en_vedette, 
          image_principale_url, 
          images_urls: images_urls || [], 
          sections: sections || [], 
          texte_alignement: texte_alignement || 'left'
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (variantes && Array.isArray(variantes)) {
        await supabase
          .from('variantes_produits')
          .delete()
          .eq('produit_id', id);

        const variantsToInsert = [];
        for (const v of variantes) {
          let image_variante_url = v.image_variante_url || "";
          if (v.image_base64) {
            const uploadRes = await cloudinary.uploader.upload(v.image_base64, { folder: "luxe_and_co/variants" });
            image_variante_url = uploadRes.secure_url;
          }
          variantsToInsert.push({
            produit_id: id,
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

      return res.status(200).json(product);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Erreur lors de la mise à jour du produit." });
    }
  } else if (method === 'DELETE') {
    if (!id) return res.status(400).json({ error: "ID manquant" });
    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

    try {
      const { data: product, error: fetchError } = await supabase
        .from('produits')
        .select('image_principale_url, images_urls')
        .eq('id', id)
        .single();

      if (fetchError || !product) return res.status(404).json({ error: "Produit non trouvé." });

      const allUrls = [
        product.image_principale_url,
        ...(Array.isArray(product.images_urls) ? product.images_urls : [])
      ].filter(Boolean);

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
          console.error("Erreur Cloudinary:", cloudinaryErr);
        }
      }

      const { error: deleteError } = await supabase
        .from('produits')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      return res.status(200).json({ message: "Produit supprimé avec succès." });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Erreur lors de la suppression du produit." });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
