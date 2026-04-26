import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#221F1E] text-white py-16 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2">
          <Link to="/" className="text-2xl font-black tracking-tighter text-[#EF895F] mb-6 block">CAMPUSMARKET.</Link>
          <p className="text-white/90 text-sm max-w-sm leading-relaxed mb-6">
            Connecting students across campus for safe, sustainable, and affordable trading. 
            Built by students, for the university community.
          </p>
          <div className="flex gap-4">
             {/* Simple social icons placeholders */}
             <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#EF895F] transition-colors cursor-pointer">
                <span className="text-[10px] font-bold">IG</span>
             </div>
             <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#EF895F] transition-colors cursor-pointer">
                <span className="text-[10px] font-bold">TW</span>
             </div>
             <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#EF895F] transition-colors cursor-pointer">
                <span className="text-[10px] font-bold">FB</span>
             </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest mb-6 text-[#EF895F]">Platform</h4>
          <ul className="space-y-4 text-sm text-white/90">
            <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
            <li><a href="#about" className="hover:text-white transition-colors">The Story</a></li>
            <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
            <li><Link to="/market" className="hover:text-white transition-colors">Marketplace</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest mb-6 text-[#EF895F]">Support</h4>
          <ul className="space-y-4 text-sm text-white/90">
            <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
            <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link to="/privacy" className="hover:text-white transition-colors">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[10px] text-white/80 uppercase tracking-widest font-black">
          © 2026 CAMPUSMARKET. ALL RIGHTS RESERVED.
        </p>
        <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-white/80">
            <span className="hover:text-white cursor-pointer transition-colors">Status</span>
            <span className="hover:text-white cursor-pointer transition-colors">Security</span>
            <span className="hover:text-white cursor-pointer transition-colors">API</span>
        </div>
      </div>
    </footer>
  );
};
