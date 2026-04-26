import React from 'react';
import { motion } from 'motion/react';
import { Star, Eye, MessageCircle, Heart, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const MOCK_LISTINGS = [
  {
    id: '1',
    title: 'Scientific Calculator Casio fx-991EX',
    price: 850,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1554224155-1696413565d3?q=80&w=400&h=300&auto=format&fit=crop',
    seller: 'Arrianne',
    rating: 4.8,
    views: 124,
    condition: 'Used'
  },
  {
    id: '2',
    title: 'Psychology 101 Textbook - Like New',
    price: 450,
    category: 'Books',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400&h=300&auto=format&fit=crop',
    seller: 'Marco',
    rating: 4.9,
    views: 89,
    condition: 'New'
  },
  {
    id: '3',
    title: 'Ergonomic Desk Lamp',
    price: 320,
    category: 'Gadgets',
    image: 'https://images.unsplash.com/photo-1534073828943-f801091bb18c?q=80&w=400&h=300&auto=format&fit=crop',
    seller: 'Kobe',
    rating: 4.7,
    views: 56,
    condition: 'Used'
  },
  {
    id: '4',
    title: 'University Hoodie (Large)',
    price: 600,
    category: 'Uniforms',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=400&h=300&auto=format&fit=crop',
    seller: 'Jeric',
    rating: 4.5,
    views: 210,
    condition: 'Used'
  },
  {
    id: '5',
    title: 'Logitech Wireless Mouse',
    price: 750,
    category: 'Gadgets',
    image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?q=80&w=400&h=300&auto=format&fit=crop',
    seller: 'Sarah',
    rating: 5.0,
    views: 45,
    condition: 'Used'
  },
  {
    id: '6',
    title: 'Graphic Design Portfolio Case',
    price: 1200,
    category: 'Others',
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=400&h=300&auto=format&fit=crop',
    seller: 'Liam',
    rating: 4.8,
    views: 32,
    condition: 'New'
  },
  {
    id: '7',
    title: 'Engineering Mechanics Vol 1',
    price: 300,
    category: 'Books',
    image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=400&h=300&auto=format&fit=crop',
    seller: 'Vince',
    rating: 4.6,
    views: 156,
    condition: 'Used'
  },
  {
    id: '8',
    title: 'Canvas Painting Set (Used Once)',
    price: 550,
    category: 'Others',
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=400&h=300&auto=format&fit=crop',
    seller: 'Mona',
    rating: 4.9,
    views: 78,
    condition: 'Used'
  }
];

export const MarketplacePreview: React.FC = () => {
  return (
    <section className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#EF895F] mb-4 block">LIVE MARKETPREVIEW</span>
            <h2 className="text-4xl md:text-5xl font-black text-[#221F1E] tracking-tighter">Featured Campus Listings</h2>
          </div>
          <Link to="/login" className="text-sm font-black uppercase tracking-widest text-[#EF895F] hover:opacity-60 transition-opacity flex items-center gap-2">
            View full marketplace <ShieldCheck size={18} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {MOCK_LISTINGS.map((item, i) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/40 backdrop-blur-sm rounded-[32px] overflow-hidden border border-black/5 group hover:bg-white transition-all hover:shadow-xl hover:-translate-y-1"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-[#221F1E]">
                    {item.category}
                  </span>
                </div>
                <div className="absolute bottom-4 right-4 translate-y-10 group-hover:translate-y-0 transition-transform opacity-0 group-hover:opacity-100">
                   <div className="w-8 h-8 rounded-full bg-[#EF895F] text-white flex items-center justify-center shadow-lg">
                      <Heart size={14} />
                   </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-[#221F1E] text-sm line-clamp-1 flex-1">{item.title}</h3>
                  <p className="font-black text-[#EF895F] text-sm ml-2">₱{item.price}</p>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-5 h-5 rounded-full bg-[#221F1E]/10 flex items-center justify-center text-[8px] font-black uppercase">
                    {item.seller[0]}
                  </div>
                  <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider">{item.seller} · </span>
                  <div className="flex items-center text-amber-500 gap-0.5">
                    <Star size={10} fill="currentColor" />
                    <span className="text-[10px] font-black">{item.rating}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-black/5 flex justify-between items-center">
                   <div className="flex gap-3">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-black/30">
                        <Eye size={12} /> {item.views}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-black/30">
                        <MessageCircle size={12} /> 0
                      </div>
                   </div>
                   <Link to="/login" className="text-[9px] font-black uppercase tracking-widest text-[#EF895F] bg-[#EF895F]/5 px-4 py-1.5 rounded-full hover:bg-[#EF895F] hover:text-white transition-all">
                      INQUIRE
                   </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 text-center">
           <div className="inline-flex flex-col items-center">
              <p className="text-sm font-medium text-[#221F1E]/40 mb-6">Want to see more of the {320}+ active campus listings?</p>
              <Link to="/login" className="px-10 py-5 bg-[#221F1E] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl">
                 GET ACCESS NOW
              </Link>
           </div>
        </div>
      </div>
    </section>
  );
};
