import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Footer } from './Footer';
import { ArrowLeft, Send, Mail, MapPin, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

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
            Get In Touch
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black text-[#221F1E] tracking-tighter leading-[0.9] mb-8"
          >
            We're listening,<br/>fellow student.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-[#221F1E]/60 leading-relaxed font-medium max-w-2xl mx-auto"
          >
            Have questions about verification? Found a bug? Or just want to suggest a new feature? Our support team (of students) is ready to help.
          </motion.p>
        </div>
      </header>

      <section className="pb-32 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Mail, label: "Email Support", value: "support@campusmarket.edu" },
                { icon: MessageCircle, label: "Response Time", value: "Within 24 Hours" },
                { icon: MapPin, label: "Office", value: "Student Union, Campus" }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + (i * 0.1) }}
                  className="bg-white/40 p-6 rounded-3xl border border-black/5"
                >
                  <item.icon className="text-[#EF895F] mb-4" size={20} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">{item.label}</p>
                  <p className="text-sm font-bold text-[#221F1E]">{item.value}</p>
                </motion.div>
              ))}
            </div>
            
            <div className="bg-[#221F1E] text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
               <div className="relative z-10">
                  <h3 className="text-2xl font-black mb-4">Direct Channel</h3>
                  <p className="text-white/60 text-sm leading-relaxed mb-6">If you need immediate assistance during active trading hours, we recommend using our official Discord server linked in the student portal.</p>
                  <div className="flex items-center gap-2 text-[#EF895F] font-black text-xs uppercase tracking-widest cursor-pointer hover:translate-x-2 transition-transform">
                     JOIN DISCORD <ArrowLeft size={16} className="rotate-180" />
                  </div>
               </div>
               {/* Abstract background shape */}
               <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#EF895F] rounded-full opacity-20 blur-3xl"></div>
            </div>
          </div>

          {/* Contact Form */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-10 md:p-12 rounded-[48px] shadow-xl border border-black/5"
          >
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10">
                <div className="w-20 h-20 bg-[#EF895F]/10 text-[#EF895F] rounded-full flex items-center justify-center mb-6">
                  <Send size={32} />
                </div>
                <h3 className="text-2xl font-black text-[#221F1E] mb-2">Message Received!</h3>
                <p className="text-[#221F1E]/60 text-sm">Thanks for reaching out. A member of our team will get back to you shortly.</p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="mt-8 text-xs font-black uppercase tracking-widest text-[#EF895F] hover:opacity-60 transition-opacity"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-2">Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="John Doe"
                      className="w-full bg-[#f9f9f9] border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#EF895F]/20 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-2">University Email</label>
                    <input 
                      type="email" 
                      required
                      placeholder="john@edu.com"
                      className="w-full bg-[#f9f9f9] border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#EF895F]/20 transition-all outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-2">Subject</label>
                  <select className="w-full bg-[#f9f9f9] border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#EF895F]/20 transition-all outline-none appearance-none">
                    <option>General Inquiry</option>
                    <option>Verification Support</option>
                    <option>Technical Issue</option>
                    <option>Partnership</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-2">Message</label>
                  <textarea 
                    rows={5}
                    required
                    placeholder="Tell us what's on your mind..."
                    className="w-full bg-[#f9f9f9] border-none rounded-3xl p-6 text-sm focus:ring-2 focus:ring-[#EF895F]/20 transition-all outline-none resize-none"
                  ></textarea>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-[#EF895F] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#EF895F]/20 hover:scale-[0.98] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <Send size={16} /> Send Message
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
