export const MOCK_PRODUCTS = [
  {
    id: 1,
    nom: "Collier Éclat d'Or",
    slug: "collier-eclat-dor",
    description: "Un collier élégant en acier inoxydable 316L avec une finition dorée éclatante.",
    prix_base: 299,
    categorie: "Bijoux",
    image_url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800",
    variantes: [
      { id: 101, couleur: "Or", prix_supp: 0, stock: 10, image_url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800" },
      { id: 102, couleur: "Argent", prix_supp: 0, stock: 5, image_url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800" }
    ]
  },
  {
    id: 2,
    nom: "Bracelet Infini",
    slug: "bracelet-infini",
    description: "Bracelet délicat symbolisant l'éternité, parfait pour un usage quotidien.",
    prix_base: 199,
    categorie: "Bijoux",
    image_url: "https://images.unsplash.com/photo-1573408302185-9127fe5a9200?w=800",
    variantes: [
      { id: 201, couleur: "Or Rose", prix_supp: 0, stock: 15, image_url: "https://images.unsplash.com/photo-1573408302185-9127fe5a9200?w=800" }
    ]
  },
  {
    id: 3,
    nom: "Montre Élégance Noire",
    slug: "montre-elegance-noire",
    description: "Une montre sophistiquée avec un bracelet en cuir noir et un cadran minimaliste.",
    prix_base: 599,
    categorie: "Montres",
    image_url: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800",
    variantes: [
      { id: 301, couleur: "Noir", prix_supp: 0, stock: 8, image_url: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800" }
    ]
  },
  {
    id: 4,
    nom: "Bague Perle Rare",
    slug: "bague-perle-rare",
    description: "Bague ajustable ornée d'une perle d'eau douce naturelle.",
    prix_base: 249,
    categorie: "Bijoux",
    image_url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800",
    variantes: [
      { id: 401, couleur: "Blanc", prix_supp: 0, stock: 12, image_url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800" }
    ]
  }
];

export const MOCK_CATEGORIES = [
  { id: 1, nom: "Nouveautés", slug: "nouveautes" },
  { id: 2, nom: "Bijoux", slug: "bijoux" },
  { id: 3, nom: "Montres", slug: "montres" },
  { id: 4, nom: "Accessoires", slug: "accessoires" }
];

export const MOCK_ORDERS = [
  {
    id: 1,
    numero_commande: "CMD-12345",
    client_display_name: "Zayna Luxe",
    client_display_phone: "0600000000",
    total_ttc: 498,
    statut: "livree",
    date_commande: new Date().toISOString()
  }
];

export const MOCK_PIXELS = [
  { id: 1, type: "facebook", pixel_id: "123456789", est_actif: true },
  { id: 2, type: "tiktok", pixel_id: "987654321", est_actif: false }
];
