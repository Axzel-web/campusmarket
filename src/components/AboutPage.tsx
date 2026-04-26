import React from 'react';
import { motion } from 'motion/react';
import { Footer } from './Footer';
import { ArrowLeft, Target, Users, ShieldCheck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#D0CBC7] selection:bg-[#EF895F] selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-[#D0CBC7]/80 backdrop-blur-xl border-b border-black/5">
        <Link to="/" className="text-xl font-black tracking-tighter text-[#221F1E]">CAMPUSMARKET.</Link>
        <Link to="/" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#221F1E] hover:opacity-60 transition-opacity">
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </nav>

      {/* Hero Section */}
      <header className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[10px] font-black uppercase tracking-[0.3em] text-[#EF895F] mb-6 block"
          >
            Behind the Blueprint
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black text-[#221F1E] tracking-tighter leading-[0.9] mb-8"
          >
            Empowering students to trade smarter.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-[#221F1E]/60 leading-relaxed font-medium max-w-2xl mx-auto"
          >
            CampusMarket is more than a marketplace. It's a high-trust network designed specifically for the unique needs of university life.
          </motion.p>
        </div>
      </header>

      {/* Mission & Vision */}
      <section className="py-20 px-6 bg-white/40 border-y border-black/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-12 h-12 bg-[#EF895F] rounded-2xl flex items-center justify-center text-white mb-6">
              <Target size={24} />
            </div>
            <h2 className="text-3xl font-black text-[#221F1E] mb-6 tracking-tight">Our Mission</h2>
            <p className="text-[#221F1E]/70 leading-relaxed font-medium">
              We aim to reduce student waste and financial strain by creating the most efficient peer-to-peer ecosystem on campus. We believe that everything a student needs already exists within their own community—it just needs a better way to find a new owner.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-12 h-12 bg-[#221F1E] rounded-2xl flex items-center justify-center text-white mb-6">
              <Users size={24} />
            </div>
            <h2 className="text-3xl font-black text-[#221F1E] mb-6 tracking-tight">Our Community</h2>
            <p className="text-[#221F1E]/70 leading-relaxed font-medium">
              Safety is our bedrock. By requiring university email verification, we've built a "closed-loop" environment where accountability is built-in. Every interaction happens between peers, fostering a culture of mutual respect and sustainable commerce.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black text-[#221F1E] tracking-tighter">Core Values</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: ShieldCheck,
                title: "Radical Trust",
                desc: "Verified profiles and campus-only meetups mean you can trade with total peace of mind."
              },
              {
                icon: Zap,
                title: "Frictionless UI",
                desc: "AI-powered listing creation and instant messaging make selling as fast as snapping a photo."
              },
              {
                icon: Users,
                title: "Sustainable Impact",
                desc: "Every second-hand trade extends an item's lifecycle and reduces carbon-heavy individual shipping."
              }
            ].map((value, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/50 backdrop-blur-sm p-8 rounded-[32px] border border-black/5 hover:bg-white transition-all group"
              >
                <div className="w-10 h-10 bg-[#EF895F]/10 text-[#EF895F] rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#EF895F] group-hover:text-white transition-colors">
                  <value.icon size={20} />
                </div>
                <h3 className="text-xl font-bold text-[#221F1E] mb-4">{value.title}</h3>
                <p className="text-sm text-[#221F1E]/60 leading-relaxed">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
