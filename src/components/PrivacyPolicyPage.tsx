import React from 'react';
import { motion } from 'motion/react';
import { Footer } from './Footer';
import { ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PrivacyPolicyPage: React.FC = () => {
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
        <div className="max-w-3xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-[#EF895F] mx-auto mb-8 shadow-sm"
          >
            <Shield size={32} />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-black text-[#221F1E] tracking-tighter leading-none mb-6"
          >
            Privacy & Data.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-[#221F1E]/60 font-medium"
          >
            Last Updated: April 26, 2024
          </motion.p>
        </div>
      </header>

      <section className="pb-32 px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-3xl mx-auto bg-white rounded-[48px] p-10 md:p-16 shadow-xl border border-black/5 prose prose-stone"
        >
          <div className="space-y-12 text-[#221F1E]">
            <div>
              <h2 className="text-2xl font-black mb-4 tracking-tight">1. Introduction</h2>
              <p className="text-[#221F1E]/70 leading-relaxed font-medium">CampusMarket ("we", "us", or "our") respects your privacy and is committed to protecting your personal data. This privacy policy informs you about how we look after your personal data when you visit our website and tells you about your privacy rights and how the law protects you.</p>
            </div>

            <div>
              <h2 className="text-2xl font-black mb-4 tracking-tight">2. Data We Collect</h2>
              <p className="text-[#221F1E]/70 leading-relaxed font-medium mb-4">When using CampusMarket, we collect specific data points to ensure a safe trading environment:</p>
              <ul className="list-disc pl-5 space-y-2 text-[#221F1E]/70 font-medium font-sans">
                <li><strong>Identity Data:</strong> Full name, university ID number, and course details.</li>
                <li><strong>Contact Data:</strong> University email address and optional social media links for communication.</li>
                <li><strong>Authentication Data:</strong> We use Google Sign-In for secure authentication. We receive your name, email address, and profile picture from Google.</li>
                <li><strong>Marketplace Data:</strong> Details of items you list, messages sent within the platform, and user reviews.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-black mb-4 tracking-tight">3. Google Sign-In & Data Usage</h2>
              <p className="text-[#221F1E]/70 leading-relaxed font-medium">Our platform utilizes Google Firebase for authentication. By signing in with Google, you authorize us to access basic profile information provided by Google. This data is used solely for the purpose of creating and managing your student account on CampusMarket. We do not sell this data to third parties.</p>
            </div>

            <div>
              <h2 className="text-2xl font-black mb-4 tracking-tight">4. University Verification</h2>
              <p className="text-[#221F1E]/70 leading-relaxed font-medium">To protect our community, we require students to upload a photo of their student ID. This visual data is stored securely in Firebase Storage and is visible only to our internal moderators for the purpose of verifying your student status. Verified data is never shared publicly.</p>
            </div>

            <div>
              <h2 className="text-2xl font-black mb-4 tracking-tight">5. Cookies & Tracking</h2>
              <p className="text-[#221F1E]/70 leading-relaxed font-medium">We use cookies to maintain your login session and enhance your experience. We may also use Google AdSense and Google Analytics to serve relevant advertisements and understand site traffic. These third-party services use cookies to track anonymous usage data.</p>
            </div>

            <div>
               <h2 className="text-2xl font-black mb-4 tracking-tight">6. Your Rights</h2>
               <p className="text-[#221F1E]/70 leading-relaxed font-medium">You have the right to request access to, correction of, or deletion of your personal data at any time through your profile settings or by contacting our support team.</p>
            </div>

            <div className="pt-8 border-t border-black/5">
               <p className="text-xs text-[#221F1E]/40 font-black uppercase tracking-widest leading-loose">
                  If you have any questions about this Privacy Policy, please contact us at support@campusmarket.edu.
               </p>
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};
