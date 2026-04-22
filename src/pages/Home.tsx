import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ShieldCheck, Truck, RotateCcw, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatPrice } from '../utils';
import { supabase } from '../lib/supabase';

interface Product {
  id: number;
  nom: string;
  prix: number;
  slug: string;
  image_url: string;
  categorie: string;
}

const Home: React.FC = () => {
  const [categoryGroups, setCategoryGroups] = useState<{name: string, products: Product[]}[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  const scroll = (id: string, direction: 'left' | 'right') => {
    const el = document.getElementById(id);
    if (el) {
      const scrollAmount = direction === 'left' ? -600 : 600;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const slides = [
    {
      image: 'https://res.cloudinary.com/dznwuewea/image/upload/v1776028497/bijoux_2_ech5tt.jpg',
      badge: 'COLLECTION PRINTEMPS 2026',
      title1: 'ÉLÉGANCE',
      title2: 'INALTÉRABLE',
      description: 'Découvrez nos bijoux en acier inoxydable 316L. Conçus pour durer, pensés pour briller.',
      button: 'DÉCOUVRIR LES BIJOUX',
      link: '/boutique?cat=Accessoires'
    },
    {
      image: 'https://res.cloudinary.com/dznwuewea/image/upload/v1776028498/montre_wzaoa1.jpg',
      badge: 'NOUVELLE COLLECTION',
      title1: 'MONTRES',
      title2: 'ÉLÉGANTES',
      description: 'Des montres en acier inoxydable pour homme et femme. Style et précision au quotidien.',
      button: 'VOIR LES MONTRES',
      link: '/boutique?cat=Montres'
    },
    {
      image: 'https://res.cloudinary.com/dznwuewea/image/upload/v1776028497/sac_et_accessoires_twu3jv.jpg',
      badge: 'TENDANCE 2026',
      title1: 'SACS &',
      title2: 'ACCESSOIRES',
      description: 'Des sacs et accessoires haut de gamme pour compléter votre style.',
      button: 'DÉCOUVRIR',
      link: '/boutique'
    },
    {
      image: 'https://res.cloudinary.com/dznwuewea/image/upload/v1776028982/Sara_s_Imitation_Jewelry_Cosmetics_brnzjz.jpg',
      badge: 'BEAUTÉ & STYLE',
      title1: 'PARFUMS &',
      title2: 'COSMÉTIQUES',
      description: 'Une sélection exclusive de parfums et cosmétiques pour sublimer votre quotidien.',
      button: 'EXPLORER',
      link: '/boutique'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
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
          .order('date_creation', { ascending: false });

        if (error) throw error;
        
        const groups: Record<string, Product[]> = {};
        data?.forEach((p: any) => {
          const catName = Array.isArray(p.categories) ? p.categories[0]?.nom : p.categories?.nom || 'Autres';
          if (!groups[catName]) groups[catName] = [];
          groups[catName].push({
            id: p.id,
            nom: p.nom,
            prix: p.prix_base,
            slug: p.slug,
            image_url: p.image_principale_url,
            categorie: catName
          });
        });

        const groupedArray = Object.entries(groups).map(([name, products]) => ({
          name,
          products
        }));

        setCategoryGroups(groupedArray);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="bg-[#050505] text-white">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 z-0"
          >
            <div 
              className="w-full h-full bg-cover bg-center transition-transform duration-[8000ms] ease-out scale-110"
              style={{ 
                backgroundImage: `url(${slides[currentSlide].image})`,
              }}
            >
              <div className="absolute inset-0 bg-black/55"></div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-[#C9A227] uppercase tracking-[0.5em] text-xs sm:text-sm mb-6 font-medium">
                {slides[currentSlide].badge}
              </p>
              <h1 className="text-[2.5rem] sm:text-7xl md:text-8xl font-serif text-white tracking-widest uppercase mb-8 leading-tight">
                {slides[currentSlide].title1} <br /> <span className="text-[#C9A227]">{slides[currentSlide].title2}</span>
              </h1>
              <p className="text-gray-400 text-sm sm:text-base uppercase tracking-widest mb-12 max-w-2xl mx-auto leading-relaxed px-4">
                {slides[currentSlide].description}
              </p>
              <div className="px-4">
                <Link 
                  to={slides[currentSlide].link} 
                  className="inline-block w-full sm:w-auto bg-[#C9A227] text-black px-12 py-5 uppercase tracking-[0.3em] font-bold text-sm hover:bg-[#b08e22] transition-all transform hover:scale-105 text-center"
                >
                  {slides[currentSlide].button}
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Dots */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-3">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentSlide === index ? 'bg-[#C9A227] w-8' : 'bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 text-[#C9A227]/50 hidden sm:block"
        >
          <div className="w-[1px] h-12 bg-gradient-to-b from-[#C9A227] to-transparent"></div>
        </motion.div>
      </section>

      {/* Category Sections */}
      {loading ? (
        <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-white/5 w-48 mb-10"></div>
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-[150px] md:w-[200px] aspect-[3/4] bg-white/5 shrink-0"></div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        categoryGroups.map((group, groupIdx) => {
          const showArrowsDesktop = group.products.length > 5;
          const showArrowsMobile = group.products.length > 2;
          const useTwoRowsDesktop = group.products.length >= 6;

          return (
            <section key={groupIdx} className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-b border-white/5 last:border-0 relative overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl md:text-2xl font-serif tracking-[0.2em] uppercase">{group.name}</h2>
                <Link to={`/boutique?cat=${group.name}`} className="text-[10px] uppercase tracking-widest text-[#C9A227] hover:text-white transition-colors">
                  Voir tout →
                </Link>
              </div>

              <div className="relative group/carousel">
                {/* Navigation Arrows */}
                <button 
                  onClick={() => scroll(`carousel-${groupIdx}`, 'left')}
                  className={`absolute -left-2 top-[40%] -translate-y-1/2 z-20 bg-black/80 border border-white/10 p-1.5 md:p-2 rounded-full transition-opacity items-center justify-center hover:bg-[#C9A227] hover:text-black 
                    ${showArrowsMobile ? 'flex' : 'hidden'} 
                    ${showArrowsDesktop ? 'md:flex md:opacity-0 md:group-hover/carousel:opacity-100' : 'md:hidden'}`}
                  aria-label="Défiler à gauche"
                >
                  <ChevronLeft size={18} className="md:w-5 md:h-5" />
                </button>
                <button 
                  onClick={() => scroll(`carousel-${groupIdx}`, 'right')}
                  className={`absolute -right-2 top-[40%] -translate-y-1/2 z-20 bg-black/80 border border-white/10 p-1.5 md:p-2 rounded-full transition-opacity items-center justify-center hover:bg-[#C9A227] hover:text-black
                    ${showArrowsMobile ? 'flex' : 'hidden'} 
                    ${showArrowsDesktop ? 'md:flex md:opacity-0 md:group-hover/carousel:opacity-100' : 'md:hidden'}`}
                  aria-label="Défiler à droite"
                >
                  <ChevronRight size={18} className="md:w-5 md:h-5" />
                </button>

                <div 
                  id={`carousel-${groupIdx}`}
                  className="flex overflow-x-auto gap-4 scroll-smooth snap-x snap-mandatory"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <div 
                    className={`grid gap-4 grid-flow-col ${useTwoRowsDesktop ? 'grid-rows-1 md:grid-rows-2' : 'grid-rows-1'}`}
                  >
                    {group.products.map((product) => (
                      <div 
                        key={product.id} 
                        className="w-[150px] md:w-[200px] scroll-snap-align-start snap-start shrink-0 group/item"
                      >
                        <Link to={`/produit/${product.slug || product.id}`} className="block relative aspect-[3/4] overflow-hidden bg-black border border-white/5">
                          <img 
                            src={product.image_url || null} 
                            alt={product.nom} 
                            className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover/item:bg-black/0 transition-colors"></div>
                          <div className="absolute bottom-0 left-0 w-full p-4 translate-y-full group-hover/item:translate-y-0 transition-transform duration-300 bg-black/60 backdrop-blur-sm hidden md:block">
                            <button className="w-full bg-white text-black py-2 uppercase tracking-widest text-[10px] font-bold">
                              Voir le produit
                            </button>
                          </div>
                        </Link>
                        <div className="mt-4 text-center">
                          <h3 className="text-[10px] md:text-xs uppercase tracking-widest font-medium mb-1 truncate group-hover/item:text-[#C9A227] transition-colors">
                            {product.nom}
                          </h3>
                          <p className="text-[10px] md:text-sm font-mono text-[#C9A227]">{formatPrice(product.prix)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        })
      )}

      <section className="py-24 bg-[#1a1a1a] border-y border-[#C9A227]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-2 sm:gap-8 lg:gap-16">
            {[
              { 
                icon: ShieldCheck, 
                title: 'Acier 316L Premium', 
                desc: 'Nos bijoux sont hypoallergéniques, ne noircissent pas et résistent à l\'eau.' 
              },
              { 
                icon: Truck, 
                title: 'Livraison Partout au Maroc', 
                desc: 'Recevez vos bijoux en 24h à 48h. Livraison gratuite dès 500 MAD d\'achat.' 
              },
              { 
                icon: RotateCcw, 
                title: 'Retour 30 Jours', 
                desc: 'Pas satisfait ? Vous avez 30 jours pour changer d\'avis et nous retourner l\'article.' 
              },
            ].map((item, i) => (
              <div key={i} className="text-center space-y-2 md:space-y-4">
                <div className="w-8 h-8 md:w-16 md:h-16 bg-black border border-[#C9A227]/20 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-6 group hover:border-[#C9A227] transition-colors">
                  <item.icon className="text-[#C9A227] w-4 h-4 md:w-6 md:h-6" />
                </div>
                <h3 className="text-[0.65rem] md:text-lg font-serif uppercase tracking-widest leading-tight">{item.title}</h3>
                <p className="text-gray-500 text-[0.65rem] md:text-sm leading-relaxed max-w-xs mx-auto uppercase tracking-wider">
                  {item.desc.replace('500 MAD', formatPrice(500))}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Presentation Sections */}
      {/* Section 1: BIJOUX */}
      <section className="bg-[#0a0a0a] py-[60px] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="w-full md:w-1/2 h-[350px] md:h-[500px] overflow-hidden flex-shrink-0"
            >
              <img 
                src="https://res.cloudinary.com/dznwuewea/image/upload/v1775676251/bijoux_ru6bqh.jpg" 
                alt="Bijoux de luxe en acier inoxydable" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="w-full md:w-1/2 flex flex-col justify-center items-center text-center space-y-4 md:space-y-6"
            >
              <h2 className="text-2xl md:text-4xl font-serif tracking-widest uppercase text-white">BIJOUX EN ACIER INOXYDABLE 316L</h2>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed uppercase tracking-wider">
                Nos bijoux sont hypoallergéniques, ne noircissent pas, résistent à l'eau et au quotidien. Parfaits pour toutes les occasions.
              </p>
              <div>
                <Link 
                  to="/boutique?cat=Accessoires" 
                  className="inline-block bg-[#C9A227] text-black px-8 py-4 md:px-10 md:py-4 uppercase tracking-widest font-bold text-xs hover:bg-[#b08e22] transition-colors"
                >
                  VOIR LES BIJOUX
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 2: MONTRES */}
      <section className="bg-[#111111] py-[60px] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16">
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="w-full md:w-1/2 h-[350px] md:h-[500px] overflow-hidden flex-shrink-0"
            >
              <img 
                src="https://res.cloudinary.com/dznwuewea/image/upload/v1775676251/montres_eszuie.jpg" 
                alt="Montre élégante de prestige" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="w-full md:w-1/2 flex flex-col justify-center items-center text-center space-y-4 md:space-y-6"
            >
              <h2 className="text-2xl md:text-4xl font-serif tracking-widest uppercase text-white">MONTRES ÉLÉGANTES</h2>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed uppercase tracking-wider">
                Des montres en acier inoxydable alliant style et précision. Pour l'homme et la femme qui veulent marquer leur présence.
              </p>
              <div>
                <Link 
                  to="/boutique?cat=Montres" 
                  className="inline-block bg-[#C9A227] text-black px-8 py-4 md:px-10 md:py-4 uppercase tracking-widest font-bold text-xs hover:bg-[#b08e22] transition-colors"
                >
                  VOIR LES MONTRES
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 3: ACCESSOIRES */}
      <section className="bg-[#0a0a0a] py-[60px] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="w-full md:w-1/2 h-[350px] md:h-[500px] overflow-hidden flex-shrink-0"
            >
              <img 
                src="https://res.cloudinary.com/dznwuewea/image/upload/v1775676251/accessoires_ce7wmq.jpg" 
                alt="Coffret cadeau accessoires de mode" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="w-full md:w-1/2 flex flex-col justify-center items-center text-center space-y-4 md:space-y-6"
            >
              <h2 className="text-2xl md:text-4xl font-serif tracking-widest uppercase text-white">ACCESSOIRES & PLUS</h2>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed uppercase tracking-wider">
                Découvrez notre collection complète : sacs, parfums, cosmétiques et vêtements. Tout ce dont vous avez besoin pour un style complet.
              </p>
              <div>
                <Link 
                  to="/boutique" 
                  className="inline-block bg-[#C9A227] text-black px-8 py-4 md:px-10 md:py-4 uppercase tracking-widest font-bold text-xs hover:bg-[#b08e22] transition-colors"
                >
                  VOIR TOUT
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-24 px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-3xl font-serif uppercase tracking-widest">Rejoignez le Cercle LUXE & CO</h2>
          <p className="text-gray-500 uppercase tracking-widest text-xs leading-relaxed">
            Inscrivez-vous pour recevoir nos offres exclusives et être informé des nouvelles collections en avant-première.
          </p>
          <form className="flex flex-col sm:flex-row gap-4">
            <input 
              type="email" 
              placeholder="VOTRE ADRESSE EMAIL" 
              className="flex-1 bg-black border border-white/10 p-4 text-xs uppercase tracking-widest focus:border-[#C9A227] outline-none transition-colors"
            />
            <button className="bg-[#C9A227] text-black px-8 py-4 uppercase tracking-widest font-bold text-xs hover:bg-[#b08e22] transition-colors">
              S'inscrire
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default Home;
