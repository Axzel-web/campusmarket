import React, { useState, useEffect, useContext, createContext, useRef } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate,
  Link,
  useLocation
} from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  PlusCircle, 
  MessageSquare, 
  User, 
  Search, 
  Heart, 
  ShoppingBag, 
  ChevronRight,
  Camera,
  LogOut,
  ArrowLeft,
  Filter,
  Star,
  ShieldCheck,
  Send,
  Sparkles,
  BarChart3,
  Archive,
  AlertCircle,
  X,
  Trash2,
  CheckCircle,
  Zap
} from 'lucide-react';
import { SpiderCursor } from "./components/ui/spider-cursor";
import { UserProfile, Listing, Chat, ChatMessage, Review, SellerApplication, Transaction } from './types';
import { cn, compressImage } from './lib/utils';
import { generateListingDetails } from './services/geminiService';
import { uploadAvatar, uploadStudentId, syncUserProfileToSupabase } from './services/userService';
import LandingPage from './components/LandingPage';
import { SellerDashboard } from './components/SellerDashboard';
import { LoadingAnimation } from './components/LoadingAnimation';
import { AboutPage } from './components/AboutPage';
import { ContactPage } from './components/ContactPage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { supabase } from './lib/supabase';
import { uploadProductImage } from './services/productService';
import { SpotlightTutorial } from './components/SpotlightTutorial';

import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where,
  orderBy, 
  addDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  deleteDoc,
  getDocFromServer,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './lib/firebase';

// --- Error Helper ---

interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

const handleFirestoreError = (error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null) => {
  if (error.code === 'permission-denied') {
    const info: FirestoreErrorInfo = {
      error: error.message,
      operationType,
      path,
      authInfo: {
        userId: auth.currentUser?.uid || 'unauthenticated',
        email: auth.currentUser?.email || '',
        emailVerified: auth.currentUser?.emailVerified || false,
        isAnonymous: auth.currentUser?.isAnonymous || false,
        providerInfo: auth.currentUser?.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || '',
          email: p.email || ''
        })) || []
      }
    };
    throw new Error(JSON.stringify(info));
  }
  throw error;
};

// --- Mock Backend / Context ---
// Since Firebase setup is having issues, we'll use a local state with persistence
// to ensure the app is usable. We switch to Firebase as soon as ready.

interface AppContextType {
  user: UserProfile | null;
  loading: boolean;
  listings: Listing[];
  myListings: Listing[];
  favorites: string[];
  reviews: Review[];
  chats: Chat[];
  messages: ChatMessage[];
  transactions: Transaction[];
  search: string;
  listingsLoading: boolean;
  setSearch: (query: string) => void;
  login: () => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<UserProfile>) => void;
  addListing: (listing: Omit<Listing, 'id' | 'createdAt' | 'sellerId' | 'sellerName' | 'views' | 'inquiries' | 'status'>, imageFiles: File[]) => Promise<void>;
  updateListing: (listingId: string, data: Partial<Listing>) => Promise<void>;
  deleteListing: (listingId: string) => Promise<void>;
  markAsSold: (listingId: string) => Promise<void>;
  toggleFavorite: (listingId: string) => void;
  createChat: (listing: Listing) => Promise<string>;
  sendMessage: (chatId: string, text: string) => void;
  deleteMessage: (chatId: string, messageId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  createTransaction: (listing: Listing, paymentMethod: Transaction['paymentMethod']) => Promise<string | undefined>;
  updateTransactionStatus: (transactionId: string, status: Transaction['status']) => Promise<void>;
  replyToReview: (reviewId: string, text: string) => void;
  archiveReview: (reviewId: string) => void;
  reportReview: (reviewId: string, reason: string) => void;
  sellerApplication: SellerApplication | null;
  submitSellerApplication: (data: Omit<SellerApplication, 'userId' | 'status' | 'createdAt'>) => Promise<void>;
  notifications: {id: string, message: string, type: 'info' | 'success' | 'error'}[];
  removeNotification: (id: string) => void;
  addNotification: (message: string, type: 'info' | 'success' | 'error') => void;
  isSupabaseConnected: boolean;
  aiDraft: any | null;
  setAiDraft: (draft: any | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

// --- Components ---

const Navbar = () => {
  const { user, search, setSearch } = useApp();
  const [showSearch, setShowSearch] = useState(false);
  const [localSearch, setLocalSearch] = useState(search);
  const location = useLocation();

  // Handle debouncing search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(localSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, setSearch]);

  // Sync local search if search state is updated externally
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  if (!user) return null;

  return (
    <header id="navbar" className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-border-main z-50">
      <div className="max-w-[1280px] mx-auto h-full flex items-center px-4 md:px-6 justify-between">
        <div className="flex items-center gap-4 md:gap-8 flex-1">
          {!showSearch && (
            <Link to="/market" className="text-xl md:text-2xl font-extrabold text-brand-primary tracking-tight whitespace-nowrap">CampusMarket</Link>
          )}
          
          <div className={cn(
            "relative transition-all duration-300",
            showSearch ? "flex-1 block" : "hidden md:block w-full max-w-[400px]"
          )}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input 
              type="text" 
              placeholder="Search items or sellers..." 
              value={localSearch}
              autoFocus={showSearch}
              onBlur={() => localSearch === '' && setShowSearch(false)}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-bg-light rounded-full border border-border-main focus:outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all text-sm"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-5 ml-4">
          {!showSearch && (
            <button 
              onClick={() => setShowSearch(true)}
              className="md:hidden text-text-muted hover:text-brand-primary transition-colors p-2"
            >
              <Search size={20} />
            </button>
          )}
          <Link to="/messages" className="text-text-muted hover:text-brand-primary transition-colors p-2"><MessageSquare size={20} /></Link>
          <Link to="/favorites" className="hidden sm:flex text-text-muted hover:text-brand-primary transition-colors relative p-2">
            <Heart size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-primary rounded-full"></span>
          </Link>
          <Link to="/profile" className="w-8 h-8 rounded-full bg-accent-subtle border border-border-main flex items-center justify-center font-semibold text-brand-primary text-sm uppercase overflow-hidden">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              user.fullName[0]
            )}
          </Link>
        </div>
      </div>
    </header>
  );
};

const Sidebar = () => {
  const location = useLocation();
  const { user } = useApp();
  
  const navItems = [
    { icon: ShoppingBag, label: 'Home Feed', path: '/market' },
    { icon: Filter, label: 'Categories', path: '/categories' },
    { icon: Heart, label: 'Favorites', path: '/favorites' },
    { icon: Archive, label: 'My Orders', path: '/purchases' },
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
    ...(user?.role === 'seller' ? [{ icon: BarChart3, label: 'Reviews', path: '/dashboard' }] : []),
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: ShieldCheck, label: 'Verification', path: '/verify' },
  ];

  return (
    <aside id="sidebar-nav" className="w-[240px] bg-white border-r border-border-main p-6 sticky top-16 h-[calc(100vh-64px)] hidden md:flex flex-col flex-shrink-0">
      <nav className="flex-1">
        {navItems.map(({ icon: Icon, label, path }) => (
          <Link
            key={path}
            to={path}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all mb-1",
              location.pathname === path 
                ? "bg-accent-subtle text-brand-primary shadow-sm" 
                : "text-text-muted hover:bg-bg-light hover:text-text-main"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="uiverse-card p-4 rounded-2xl text-white mt-auto relative group transition-all hover:scale-[1.02]">
        <div className="uiverse-border rounded-2xl"></div>
        <div className="relative z-10">
          <p className="font-black text-xs mb-1 tracking-tight">Campus University</p>
          <p className="text-[9px] opacity-70 font-bold uppercase tracking-widest leading-none">Verified Campus Only Environment</p>
        </div>
      </div>
    </aside>
  );
};

const RecentChatItem = ({ chat, currentUserId }: { chat: Chat, currentUserId: string }) => {
  const [partnerName, setPartnerName] = useState<string>(chat.sellerName || chat.listingTitle);
  const [partner, setPartner] = useState<any>(null);

  useEffect(() => {
    const partnerId = chat.participants.find(p => p !== currentUserId);
    if (partnerId) {
      getDoc(doc(db, 'users', partnerId)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setPartnerName(data.fullName);
          setPartner(data);
        }
      });
    }
  }, [chat, currentUserId]);

  return (
    <Link 
      to={`/chat/${chat.id}`}
      className="flex items-center gap-3 group cursor-pointer hover:bg-bg-light p-1.5 rounded-xl transition-all"
    >
      <div className="w-9 h-9 rounded-xl bg-accent-subtle flex-shrink-0 flex items-center justify-center text-brand-primary font-black text-xs border border-border-main overflow-hidden shadow-sm">
        {partner?.avatarUrl ? (
            <img src={partner.avatarUrl} alt={partnerName} className="w-full h-full object-cover" />
        ) : (
            partnerName[0]
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black text-text-main group-hover:text-brand-primary transition-colors truncate leading-none mb-1">
          {partnerName}
        </p>
        <p className="text-[9px] text-text-muted truncate font-bold uppercase tracking-wider opacity-60">
          {chat.listingTitle}
        </p>
      </div>
    </Link>
  );
};

const RightPanel = () => {
  const { user, listings, setAiDraft, addNotification, chats } = useApp();
  const navigate = useNavigate();
  const [quickDesc, setQuickDesc] = useState('');
  const [generating, setGenerating] = useState(false);

  const recentChats = [...chats]
    .sort((a, b) => {
      const timeA = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : (a.lastMessageAt || 0);
      const timeB = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : (b.lastMessageAt || 0);
      return timeB - timeA;
    })
    .slice(0, 3);

  const handleGenerateAI = async () => {
    if (!quickDesc.trim()) {
      addNotification("Please enter a short description first.", "info");
      return;
    }

    if (quickDesc.length < 5) {
      addNotification("Please provide a bit more detail (at least 5 characters).", "info");
      return;
    }

    setGenerating(true);
    addNotification("AI is crafting your listing...", "info");
    
    try {
      const draft = await generateListingDetails(quickDesc);
      setAiDraft(draft);
      addNotification("Listing details generated! Redirecting...", "success");
      navigate('/sell');
    } catch (error) {
      console.error(error);
      addNotification("AI Assistant is busy right now. Please try again or list manually.", "error");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <aside className="w-[300px] bg-white border-l border-border-main p-6 sticky top-16 h-[calc(100vh-64px)] hidden lg:flex flex-col gap-6 overflow-y-auto flex-shrink-0 no-scrollbar">
      {/* Seller Hub / Verification Widget */}
      <div id="seller-hub-widget" className={cn(
        "rounded-xl p-4 border",
        user?.isVerified ? "bg-white border-border-main" : 
        user?.verificationStatus === 'pending' ? "bg-amber-50 border-amber-200" :
        "bg-accent-yellow border-border-yellow"
      )}>
        <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-3 flex items-center gap-1.5 font-sans">
          <ShieldCheck size={14} className={user?.isVerified ? "text-green-500" : user?.verificationStatus === 'pending' ? "text-amber-500" : "text-brand-primary"} /> 
          Seller Dashboard
        </h3>
        {user?.verificationStatus === 'pending' ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Pending Approval
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">Your student ID is under review. We'll notify you once you're approved to sell.</p>
          </div>
        ) : user?.verificationStatus === 'rejected' ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-red-600">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> Application Rejected
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed mb-2">There was an issue with your ID. Please check your profile for details.</p>
            <button 
              onClick={() => navigate('/verify')}
              className="w-full py-2 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 transition-colors"
            >
              Update and Resubmit
            </button>
          </div>
        ) : user?.isVerified ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-text-main">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Verified Seller
            </div>
            <p className="text-[11px] text-text-muted">You have {listings.filter(l => l.sellerId === user.id).length} active listings.</p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="w-full py-2 border border-border-main text-xs font-bold rounded-lg hover:bg-bg-light transition-colors mt-2"
            >
              Seller Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-text-main">
              <span className="w-2 h-2 rounded-full bg-brand-primary"></span> Ready to sell?
            </div>
            <p className="text-[11px] text-text-muted">Complete verification to start posting items to Campus University.</p>
            <button 
              onClick={() => navigate('/verify')}
              className="w-full py-2 border border-border-main text-xs font-bold rounded-lg hover:bg-bg-light transition-colors mt-2"
            >
              Become a Seller
            </button>
          </div>
        )}
      </div>

      {/* Recently Messaged Widget */}
      {user && recentChats.length > 0 && (
        <div className="mt-auto pt-6 border-t border-border-main">
          <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-4 font-sans">
            Recently Messaged
          </h3>
            <div className="space-y-4">
            {recentChats.map(chat => (
              <div key={chat.id}>
                <RecentChatItem chat={chat} currentUserId={user.id} />
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};

const ListingCard = ({ listing }: { listing: Listing }) => {
  const { toggleFavorite, favorites } = useApp();
  const isFavorite = favorites.includes(listing.id);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl overflow-hidden border border-border-main group cursor-pointer flex flex-col h-full"
    >
      <Link to={`/listing/${listing.id}`} className="flex-1 flex flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-bg-light">
          {listing.isFeatured && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-amber-400 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-lg shadow-lg z-10 flex items-center gap-1">
                <Sparkles size={8} fill="currentColor" /> Featured
            </div>
          )}
          {listing.images.length > 0 ? (
            <img 
              src={listing.images[0]} 
              loading="lazy"
              alt={listing.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-bg-light gap-2">
              <div className="w-8 h-8 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
              <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest animate-pulse">Loading...</span>
            </div>
          )}
          <button 
            onClick={(e) => {
              e.preventDefault();
              toggleFavorite(listing.id);
            }}
            className={cn(
              "absolute top-2 right-2 p-1.5 rounded-full backdrop-blur transition-colors",
              isFavorite ? "bg-brand-primary text-white" : "bg-white/80 text-text-muted hover:bg-white"
            )}
          >
            <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="p-3 flex flex-col flex-1">
          <p className="text-brand-primary font-bold text-base">₱{listing.price.toLocaleString()}</p>
          <h3 className="font-medium text-text-main text-[13px] line-clamp-2 mt-0.5 leading-snug">{listing.title}</h3>
          <div className="text-[10px] text-text-muted mt-auto pt-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
               <div className="w-5 h-5 rounded-full bg-accent-subtle flex-shrink-0 flex items-center justify-center font-bold text-brand-primary text-[8px] uppercase border border-border-main overflow-hidden">
                {listing.sellerAvatar ? (
                  <img src={listing.sellerAvatar} alt={listing.sellerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  listing.sellerName[0]
                )}
              </div>
              <span className="truncate">{listing.sellerName}</span>
            </div>
            {listing.sellerRating && (
              <span className="flex items-center gap-0.5 text-amber-500 flex-shrink-0">
                <Star size={10} fill="currentColor" /> {listing.sellerRating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const MobileTabs = () => {
  const location = useLocation();
  const navItems = [
    { icon: ShoppingBag, label: 'Shop', path: '/market' },
    { icon: PlusCircle, label: 'Sell', path: '/sell' },
    { icon: MessageSquare, label: 'Chat', path: '/messages' },
    { icon: User, label: 'User', path: '/profile' },
  ];

  const activeIndex = navItems.findIndex(item => item.path === location.pathname);

  return (
    <div id="mobile-tabs" className="md:hidden fixed bottom-2 left-0 right-0 z-50 flex justify-center px-4 pb-safe pointer-events-none">
      <div className="relative w-full max-w-[440px] h-16 bg-white shadow-[0_-5px_25px_rgba(0,0,0,0.08)] rounded-3xl flex pointer-events-auto overflow-visible">
        {/* Magic Indicator */}
        <motion.div 
          className="absolute top-[-50%] w-16 h-16 bg-brand-primary rounded-full border-[6px] border-[#f3f4f6] shadow-xl z-0"
          initial={false}
          animate={{
            left: `calc(${activeIndex * 25}% + 12.5% - 32px)`,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
        >
          {/* Side Curves to create the gap effect */}
          <div className="absolute top-1/2 left-[-22px] w-5 h-5 bg-transparent rounded-tr-[22px] shadow-[2px_-12px_0_0_#f3f4f6]"></div>
          <div className="absolute top-1/2 right-[-22px] w-5 h-5 bg-transparent rounded-tl-[22px] shadow-[-2px_-12px_0_0_#f3f4f6]"></div>
        </motion.div>

        {navItems.map(({ icon: Icon, label, path }, idx) => {
          const isActive = location.pathname === path;
          return (
            <Link 
              id={idx === 1 ? "sell-tab" : undefined}
              key={path} 
              to={path}
              className="relative z-10 flex-1 h-full flex flex-col items-center justify-center"
            >
              <motion.div
                animate={{
                  y: isActive ? -32 : 0,
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  scale: isActive ? 1.1 : 1
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </motion.div>
              <motion.span
                initial={false}
                animate={{
                  opacity: isActive ? 1 : 0,
                  y: isActive ? 4 : 20,
                  scale: isActive ? 1 : 0.5
                }}
                className="absolute bottom-2 text-[9px] font-black uppercase tracking-wider text-text-main"
                transition={{ duration: 0.3 }}
              >
                {label}
              </motion.span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

// --- Pages ---

const CategoriesPage = () => {
  const { listings } = useApp();
  const categories = ['Gadgets', 'Books', 'Uniforms', 'Services', 'Others'];

  return (
    <div className="flex-1 px-6 py-6 overflow-y-auto no-scrollbar">
      <h1 className="text-2xl font-bold text-text-main mb-6">Browse Categories</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => (
          <div key={cat} className="p-6 bg-white rounded-2xl border border-border-main hover:border-brand-primary group cursor-pointer transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg text-text-main group-hover:text-brand-primary transition-colors">{cat}</h3>
              <ChevronRight size={18} className="text-text-muted group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-text-muted font-medium">
              {listings.filter(l => l.category === cat).length} active listings
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const FavoritesPage = () => {
  const { listings, favorites } = useApp();
  const favoriteListings = listings.filter(l => favorites.includes(l.id));

  return (
    <div className="flex-1 px-6 py-6 overflow-y-auto no-scrollbar">
      <h1 className="text-2xl font-bold text-text-main mb-6">Your Favorites</h1>
      {favoriteListings.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
          {favoriteListings.map(listing => (
            <div key={listing.id}>
              <ListingCard listing={listing} />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <Heart className="mx-auto text-text-muted mb-3 opacity-20" size={48} />
          <p className="text-text-muted text-sm font-medium">You haven't saved any items yet.</p>
          <Link to="/" className="text-brand-primary text-xs font-bold hover:underline mt-2 inline-block">Browse Marketplace</Link>
        </div>
      )}
    </div>
  );
};

const ListingSkeleton = () => (
    <div className="bg-white rounded-xl overflow-hidden border border-border-main flex flex-col h-full animate-pulse">
        <div className="aspect-[4/3] bg-bg-light" />
        <div className="p-3 space-y-2">
            <div className="h-5 bg-bg-light rounded w-1/3" />
            <div className="h-4 bg-bg-light rounded w-full" />
            <div className="h-3 bg-bg-light rounded w-1/2 mt-auto" />
        </div>
    </div>
);

const HomePage = () => {
  const { listings, search, listingsLoading } = useApp();
  const [activeCategory, setActiveCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);
  
  const categories = ['All', 'Gadgets', 'Books', 'Uniforms', 'Services', 'Others'];

  const matchedSellers = React.useMemo(() => {
    if (!search || search.length < 2) return [];
    const uniqueSellers = new Map<string, {id: string, name: string, avatar?: string}>();
    listings.forEach(l => {
      if (l.sellerName.toLowerCase().includes(search.toLowerCase())) {
        uniqueSellers.set(l.sellerId, {id: l.sellerId, name: l.sellerName, avatar: l.sellerAvatar});
      }
    });
    return Array.from(uniqueSellers.values());
  }, [listings, search]);

  const filteredListings = listings.filter(l => {
    const matchesSearch = l.title.toLowerCase().includes(search.toLowerCase()) ||
                          l.category.toLowerCase().includes(search.toLowerCase()) ||
                          l.sellerName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || l.category === activeCategory;
    
    // Price Filter
    const price = l.price;
    const matchesMinPrice = minPrice === '' || price >= Number(minPrice);
    const matchesMaxPrice = maxPrice === '' || price <= Number(maxPrice);
    
    // Rating Filter
    const rating = l.sellerRating || 5; // Default to 5 if not set
    const matchesRating = rating >= minRating;

    return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice && matchesRating;
  });

  return (
    <div className="flex-1 px-6 py-6 overflow-y-auto no-scrollbar">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-main">Marketplace</h2>
          <div className="flex items-center gap-4 text-[13px] font-medium text-text-muted">
             <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-lg border",
                showFilters || minPrice || maxPrice || minRating > 0 
                  ? "border-brand-primary text-brand-primary bg-accent-subtle" 
                  : "border-border-main hover:border-brand-primary hover:text-brand-primary"
              )}
            >
              <Filter size={14} /> Filters
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-border-main mb-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6">
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 block">Price Range (₱)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      placeholder="Min" 
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-border-main rounded-lg text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
                    />
                    <span className="text-text-muted">-</span>
                    <input 
                      type="number" 
                      placeholder="Max" 
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-border-main rounded-lg text-xs focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 block">Seller Rating</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setMinRating(minRating === star ? 0 : star)}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all border",
                          star <= minRating 
                            ? "bg-amber-50 border-amber-200 text-amber-500 shadow-sm" 
                            : "bg-white border-border-main text-text-muted hover:border-text-muted"
                        )}
                      >
                        <Star size={14} fill={star <= minRating ? "currentColor" : "none"} />
                      </button>
                    ))}
                    <span className="text-[10px] font-medium text-text-muted ml-1">
                      {minRating > 0 ? `${minRating}+ Stars` : 'Any'}
                    </span>
                  </div>
                </div>

                <div className="flex items-end">
                  <button 
                    onClick={() => {
                      setMinPrice('');
                      setMaxPrice('');
                      setMinRating(0);
                    }}
                    className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-wider"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-5 py-2 rounded-full text-xs font-bold transition-all border whitespace-nowrap",
                activeCategory === cat 
                  ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                  : "bg-white text-text-muted border-border-main hover:border-brand-primary hover:text-brand-primary"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {search.length >= 2 && matchedSellers.length > 0 && (
        <div className="mb-8">
          <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-4">Users Found</h3>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {matchedSellers.map(seller => (
              <Link 
                key={seller.id} 
                to={`/profile/${seller.id}`}
                className="flex-shrink-0 flex flex-col items-center gap-2 group"
              >
                <div className="w-16 h-16 rounded-2xl bg-accent-subtle border border-border-main flex items-center justify-center text-brand-primary text-xl font-black group-hover:border-brand-primary group-hover:shadow-lg transition-all overflow-hidden">
                  {seller.avatar ? (
                    <img src={seller.avatar} alt={seller.name} className="w-full h-full object-cover" />
                  ) : (
                    seller.name[0]
                  )}
                </div>
                <span className="text-[10px] font-bold text-text-main truncate w-16 text-center">{seller.name}</span>
              </Link>
            ))}
          </div>
          <div className="h-px bg-border-main w-full mb-2 opacity-50"></div>
        </div>
      )}

      <div id="market-grid" className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        {listingsLoading ? (
            Array(6).fill(0).map((_, i) => <ListingSkeleton key={i} />)
        ) : filteredListings.length > 0 ? (
          filteredListings.map(listing => (
            <div key={listing.id}>
              <ListingCard listing={listing} />
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center">
            <ShoppingBag className="mx-auto text-text-muted mb-3 opacity-20" size={48} />
            <p className="text-text-muted text-sm font-medium">No items found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const LoginPage = () => {
  const { login, user } = useApp();
  const [loggingIn, setLoggingIn] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (user) return <Navigate to="/market" replace />;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoggingIn(true);
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      console.error(err);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoggingIn(true);
    try {
      await login();
    } finally {
      setLoggingIn(false);
    }
  };

  const themeBackground = "#f3f4f6";
  const themePrimaryColor = "#EF895F";
  const themeColor = "#000000";
  const isDarkTheme = false;

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden transition-colors duration-500 font-sans"
      style={{ backgroundColor: themeBackground, color: themeColor }}
    >
      <div className="relative w-full max-w-[420px] z-10 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative backdrop-blur-2xl border rounded-[2rem] p-5 sm:p-7 md:p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            borderColor: 'rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Header Section - More Compact */}
          <div className="flex flex-col items-center mb-4 sm:mb-6">
            <Link to="/" className="absolute top-4 left-4 p-2 bg-black/5 rounded-full hover:bg-black/10 transition-all text-black">
              <ArrowLeft size={18} />
            </Link>
            <div className="w-full max-w-[120px] sm:max-w-[150px] mb-3">
              <img 
                src="https://raw.githubusercontent.com/hicodersofficial/glassmorphism-login-form/master/assets/illustration.png" 
                alt="CampusMarket" 
                className="w-full h-auto drop-shadow-xl animate-float"
              />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-center tracking-[0.15em] uppercase leading-none" style={{ color: themeColor }}>
              {mode === 'signup' ? 'Sign Up' : 'Sign In'}
            </h1>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3 sm:space-y-4">
            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={loggingIn}
              className="w-full py-3.5 rounded-xl border-2 flex items-center justify-center gap-3 hover:brightness-95 transition-all text-xs font-black tracking-[2px] disabled:opacity-50 uppercase mb-4 shadow-lg"
              style={{ 
                backgroundColor: '#FFFFFF',
                color: '#000000',
                borderColor: '#000000'
              }}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Sign in with Google
            </button>

            <div className="relative flex items-center my-4">
              <div className="flex-grow border-t border-current opacity-10"></div>
              <span className="flex-shrink px-3 text-[8px] font-black opacity-30 uppercase tracking-[2px]">OR EMAIL</span>
              <div className="flex-grow border-t border-current opacity-10"></div>
            </div>

            <div className="group">
              <input 
                type="email" 
                required
                placeholder="UNIVERSITY EMAIL"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-3 sm:py-3.5 px-4 rounded-xl outline-none text-[11px] sm:text-xs font-bold tracking-widest placeholder:text-black placeholder:opacity-50 backdrop-blur-md transition-all border shadow-sm focus:border-black focus:bg-white/40"
                style={{ 
                  color: themeColor,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(0, 0, 0, 0.1)'
                }}
              />
            </div>
            <div className="group">
              <input 
                type="password" 
                required
                placeholder="PASSWORD"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-3 sm:py-3.5 px-4 rounded-xl outline-none text-[11px] sm:text-xs font-bold tracking-widest placeholder:text-black placeholder:opacity-50 backdrop-blur-md transition-all border shadow-sm focus:border-black focus:bg-white/40"
                style={{ 
                  color: themeColor,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(0, 0, 0, 0.1)'
                }}
              />
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-[9px] font-black text-center uppercase tracking-wider" 
                style={{ color: '#C62828' }}
              >
                {error}
              </motion.p>
            )}

            <button 
              type="submit"
              disabled={loggingIn}
              className="w-full py-3.5 rounded-xl text-xs sm:text-sm font-black tracking-[2px] transition-all duration-300 hover:brightness-110 active:scale-95 shadow-lg disabled:opacity-50 mt-1 border-2 border-black"
              style={{ backgroundColor: themePrimaryColor, color: '#000000' }}
            >
              {loggingIn ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : (
                mode === 'signup' ? 'REGISTER' : 'ENTER'
              )}
            </button>
          </form>

          <footer className="mt-4 flex flex-col items-center">
            <div className="flex justify-between w-full text-[8px] sm:text-[9px] font-bold tracking-widest px-1" style={{ color: themeColor, opacity: 0.7 }}>
              <button 
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="hover:opacity-100 transition-opacity uppercase underline underline-offset-4"
              >
                {mode === 'login' ? 'Create Account' : 'Back to Login'}
              </button>
              <button className="hover:opacity-100 transition-opacity uppercase font-sans">Forgot?</button>
            </div>
          </footer>
        </motion.div>
      </div>

      <div className="fixed top-8 left-8 sm:left-auto sm:right-10 text-[9px] font-black tracking-[4px] opacity-30 uppercase">
        <span className="hidden sm:inline">Plsp University • Marketplace • </span> 2026 
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const { user, logout, listings, updateProfile, addNotification } = useApp();
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!user) return null;

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      addNotification("Updating your profile picture...", "info");
      
      const compressed = await compressImage(file);
      const url = await uploadAvatar(compressed, user.id);
      
      await updateProfile({ avatarUrl: url });
      addNotification("Profile picture updated successfully!", "success");
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      addNotification(error.message || "Failed to update profile picture", "error");
    } finally {
      setUploading(false);
    }
  };

  const userListingsCount = listings.filter(l => l.sellerId === user.id).length;

  const settingsItems = [
    { icon: User, label: 'Edit Profile Settings', path: '/edit-profile', desc: 'Update your personal info' },
    { icon: Sparkles, label: 'Redo Onboarding', path: '#', onClick: () => { localStorage.removeItem('campusListingTutorialSeen'); navigate('/onboarding'); }, desc: 'Re-run the welcome induction' },
    { icon: Zap, label: 'View App Tutorial', path: '#', onClick: () => { localStorage.removeItem('campusListingTutorialSeen'); navigate('/market'); }, desc: 'Show the spotlight highlights again' },
    { icon: Heart, label: 'Manage Favorites', path: '/favorites', desc: 'Items you have saved' },
    { icon: ShoppingBag, label: 'Transaction History', path: '/purchases', desc: 'Your orders and sales' },
    { icon: ShieldCheck, label: 'Privacy & Security', path: '/settings', desc: 'Account protection' },
  ];

  return (
    <div className="flex-1 px-4 py-8 overflow-y-auto no-scrollbar bg-[#f8fafc]">
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        {/* Header Section */}
        <div className="flex items-end justify-between px-2">
          <div>
            <h1 className="text-3xl font-black text-text-main tracking-tight">Your Account</h1>
            <p className="text-text-muted text-sm font-medium">Manage your campus activities</p>
          </div>
          <button 
            onClick={logout} 
            className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-2xl transition-all text-xs font-bold border border-red-100 bg-white shadow-sm"
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>

        {/* Profile Card Magic */}
        <div className="bg-white rounded-[32px] overflow-hidden border border-border-main shadow-sm relative">
          <div className="h-24 bg-gradient-to-r from-brand-primary to-[#f4a27e] opacity-90"></div>
          <div className="px-8 pb-8">
            <div className="relative flex flex-col md:flex-row items-center md:items-end gap-6 -mt-12 mb-6">
              <div 
                className="w-28 h-28 rounded-3xl bg-white p-1 shadow-xl relative z-10 cursor-pointer group"
                onClick={handleAvatarClick}
              >
                <div className="w-full h-full rounded-2xl bg-accent-subtle border-4 border-white flex items-center justify-center text-brand-primary text-4xl font-black transition-transform group-hover:scale-105 overflow-hidden">
                  {uploading ? (
                    <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                  ) : user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    user.fullName[0]
                  )}
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera size={24} />
                  </div>
                </div>
                {user.isVerified && (
                  <div className="absolute -bottom-1 -right-1 bg-brand-primary text-white p-1.5 rounded-full border-4 border-white shadow-lg z-20">
                    <ShieldCheck size={14} fill="currentColor" />
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              <div className="flex-1 text-center md:text-left pb-2">
                <h2 className="text-2xl font-black text-text-main leading-tight flex items-center justify-center md:justify-start gap-2">
                  {user.fullName}
                </h2>
                <p className="text-text-muted text-sm font-bold flex items-center justify-center md:justify-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary"></span>
                  {user.courseAndYear || 'Student Buyer'}
                </p>
              </div>
              <div className="hidden md:flex gap-2 pb-2">
                 <button 
                   onClick={() => navigate('/onboarding')}
                   className="px-5 py-2.5 bg-brand-primary text-white rounded-2xl text-xs font-bold hover:opacity-90 transition-all shadow-sm"
                 >
                   Redo Onboarding
                 </button>
                 <button 
                   onClick={() => navigate('/edit-profile')}
                   className="px-5 py-2.5 bg-bg-light border border-border-main rounded-2xl text-xs font-bold text-text-main hover:bg-white transition-all shadow-sm"
                 >
                   Edit Profile
                 </button>
              </div>
            </div>

            {user.bio && (
              <div className="mb-8 p-4 bg-bg-light rounded-2xl border border-border-main text-sm text-text-main italic relative">
                <Sparkles className="absolute -top-3 -right-3 text-brand-primary opacity-20" size={24} />
                "{user.bio}"
              </div>
            )}

            {/* Quick Stats Bento */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Active Ads', value: userListingsCount, icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-50' },
                { label: 'Sold Items', value: '0', icon: CheckCircle, color: 'text-brand-primary', bg: 'bg-accent-subtle' },
                { label: 'Rating', value: '5.0', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
              ].map((stat, i) => (
                <div key={i} className="p-4 rounded-2xl border border-border-main bg-white hover:border-brand-primary transition-colors group cursor-default">
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2 mx-auto md:mx-0", stat.bg, stat.color)}>
                    <stat.icon size={16} />
                  </div>
                  <p className="text-lg font-black text-text-main leading-tight md:text-left text-center">{stat.value}</p>
                  <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider md:text-left text-center">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Main Action - Verification */}
          {!user.isVerified && user.verificationStatus === 'none' ? (
            <motion.div 
              whileHover={{ y: -4 }}
              onClick={() => navigate('/verify')}
              className="p-6 bg-brand-primary rounded-[32px] text-white relative overflow-hidden shadow-xl shadow-brand-primary/20 cursor-pointer group"
            >
              <div className="relative z-10">
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-wider mb-3">Become a Seller</span>
                <h3 className="font-black text-xl mb-1">Get Student Verified</h3>
                <p className="text-white/80 text-xs mb-6 max-w-[200px] font-medium">Join 500+ active student sellers on CampusMarket tonight.</p>
                <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-brand-primary rounded-xl font-black text-xs shadow-lg group-hover:scale-105 transition-transform">
                  Start Application <ArrowLeft className="rotate-180" size={16} />
                </div>
              </div>
              <ShieldCheck className="absolute -bottom-6 -right-6 w-40 h-40 text-black/10 -rotate-12 transition-transform group-hover:rotate-0 duration-700" />
            </motion.div>
          ) : user.verificationStatus === 'pending' ? (
            <div className="p-6 bg-amber-50 rounded-[32px] border border-amber-200 text-amber-800">
               <h3 className="font-black text-xl mb-1">Review in Progress</h3>
               <p className="text-xs font-medium opacity-80 mb-6">We're verifying your ID. This typically takes 12-24 hours.</p>
               <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-xl text-[10px] font-black uppercase border border-amber-200">
                 <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                 Status: Under Review
               </div>
            </div>
          ) : (
            <motion.div 
              whileHover={{ y: -4 }}
              className="p-6 bg-text-main rounded-[32px] text-white relative overflow-hidden shadow-xl shadow-black/10 cursor-pointer group"
              onClick={() => navigate('/dashboard')}
            >
              <div className="relative z-10">
                <h3 className="font-black text-xl mb-1">Seller Hub</h3>
                <p className="text-white/60 text-xs mb-6">Manage your orders and listings profile.</p>
                <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white rounded-xl font-black text-xs shadow-lg">
                  Dashboard <ChevronRight size={16} />
                </div>
              </div>
              <BarChart3 className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5 -rotate-6" />
            </motion.div>
          )}

          {/* Secondary Action - Perks */}
          <div className="p-6 bg-accent-subtle rounded-[32px] border border-border-main flex flex-col justify-between group">
            <div>
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand-primary shadow-sm mb-4">
                <Sparkles size={20} />
              </div>
              <h3 className="font-black text-lg text-brand-primary mb-1">Student Perks</h3>
              <p className="text-text-muted text-xs font-medium">Unlock exclusive campus deals and group features.</p>
            </div>
            <button className="mt-6 text-brand-primary text-xs font-black flex items-center gap-1 group-hover:translate-x-1 transition-transform uppercase tracking-wider">
              Explore Now <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Global Settings List */}
        <div className="pt-4">
          <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] pl-4 mb-4">Account Settings</h3>
          <div className="grid grid-cols-1 gap-2">
            {settingsItems.map(({ icon: Icon, label, path, desc, onClick }) => {
              const content = (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-bg-light flex items-center justify-center text-text-muted group-hover:bg-brand-primary group-hover:text-white transition-all shadow-sm">
                      <Icon size={20} />
                    </div>
                    <div className="text-left">
                      <span className="font-black text-text-main text-sm block leading-none mb-1">{label}</span>
                      <span className="text-[10px] text-text-muted font-medium">{desc}</span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-bg-light flex items-center justify-center text-text-muted opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0 -translate-x-2">
                    <ChevronRight size={14} />
                  </div>
                </>
              );

              if (onClick) {
                return (
                  <button 
                    key={label}
                    onClick={onClick}
                    className={cn(
                      "flex w-full items-center justify-between p-4 bg-white rounded-2xl border border-border-main hover:border-brand-primary group transition-all cursor-pointer",
                      label === "View App Tutorial" && "hidden lg:flex"
                    )}
                  >
                    {content}
                  </button>
                );
              }

              return (
                <Link 
                  key={path}
                  to={path}
                  className="flex items-center justify-between p-4 bg-white rounded-2xl border border-border-main hover:border-brand-primary group transition-all"
                >
                  {content}
                </Link>
              );
            })}
          </div>

          {/* Developer Reset - Hidden for normal users */}
          {['xeliboyydagents@gmail.com', 'axzelbaril460@gmail.com'].includes(user.email.toLowerCase()) && (
            <div className="mt-8 pt-6 border-t border-dashed border-border-main flex flex-col items-center gap-3">
              <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">Developer Environment</p>
              <button 
                onClick={async () => {
                   if (window.confirm('Reset your verification status for testing?')) {
                     await updateProfile({ 
                       role: 'buyer', 
                       isVerified: false, 
                       verificationStatus: 'none' 
                     });
                     addNotification('Account reset for verification testing.', 'info');
                     navigate('/verify');
                   }
                }}
                className="px-6 py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100 hover:bg-red-100 active:scale-95 transition-all shadow-sm"
              >
                Reset Verification Status
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PublicProfilePage = () => {
    const { id } = useParams<{ id: string }>();
    const { listings, user: currentUser } = useApp();
    const [seller, setSeller] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        const fetchSeller = async () => {
            try {
                const docRef = doc(db, 'users', id);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setSeller({ ...snap.data(), id: snap.id } as UserProfile);
                }
            } catch (err) {
                console.error("Error fetching seller profile:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSeller();
    }, [id]);

    if (loading) return <div className="p-20 text-center text-text-muted">Loading profile...</div>;
    if (!seller) return <div className="p-20 text-center text-text-muted">User not found.</div>;

    const sellerListings = listings.filter(l => l.sellerId === seller.id);

    return (
        <div className="flex-1 px-4 py-8 overflow-y-auto no-scrollbar bg-[#f8fafc]">
            <div className="max-w-3xl mx-auto space-y-6 pb-20">
                <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl border border-border-main hover:bg-bg-light transition-colors mb-2 inline-flex items-center gap-2 text-sm font-medium">
                    <ArrowLeft size={18} /> Back
                </button>

                <div className="bg-white rounded-[32px] overflow-hidden border border-border-main shadow-sm relative">
                    <div className="h-24 bg-gradient-to-r from-brand-primary to-[#f4a27e] opacity-90"></div>
                    <div className="px-8 pb-8">
                        <div className="relative flex flex-col md:flex-row items-center md:items-end gap-6 -mt-12 mb-6">
                            <div className="w-28 h-28 rounded-3xl bg-white p-1 shadow-xl relative z-10 overflow-hidden">
                                <div className="w-full h-full rounded-2xl bg-accent-subtle border-4 border-white flex items-center justify-center text-brand-primary text-4xl font-black">
                                    {seller.avatarUrl ? (
                                        <img src={seller.avatarUrl} alt={seller.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                        seller.fullName[0]
                                    )}
                                </div>
                                {seller.isVerified && (
                                    <div className="absolute -bottom-1 -right-1 bg-brand-primary text-white p-1.5 rounded-full border-4 border-white shadow-lg z-20">
                                        <ShieldCheck size={14} fill="currentColor" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 text-center md:text-left pb-2">
                                <h2 className="text-2xl font-black text-text-main">
                                    {seller.fullName}
                                </h2>
                                <p className="text-text-muted text-sm font-bold flex items-center justify-center md:justify-start gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary"></span>
                                    {seller.courseAndYear || 'Verified Student'}
                                </p>
                            </div>
                        </div>

                        {seller.bio && (
                            <div className="mb-8 p-4 bg-bg-light rounded-2xl border border-border-main text-sm text-text-main italic">
                                "{seller.bio}"
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl border border-border-main bg-white">
                                <p className="text-lg font-black text-text-main">{sellerListings.length}</p>
                                <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Active Listings</p>
                            </div>
                            <div className="p-4 rounded-2xl border border-border-main bg-white">
                                <p className="text-lg font-black text-text-main">5.0</p>
                                <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Seller Rating</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-text-main mb-4">Store Listings</h3>
                    {sellerListings.length > 0 ? (
                        <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
                            {sellerListings.map(listing => (
                                <div key={listing.id}>
                                    <ListingCard listing={listing} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-border-main text-text-muted text-sm">
                            No active listings from this seller yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const VerificationPage = () => {
  const { user, submitSellerApplication } = useApp();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    courseAndYear: user?.courseAndYear || '',
    universityEmail: user?.universityEmail || '',
    studentId: '',
    bio: user?.bio || '',
    contactDetails: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
        alert("Please upload your Student ID photo.");
        return;
    }

    setSubmitting(true);
    try {
      await submitSellerApplication({
        fullName: formData.fullName,
        school: formData.courseAndYear,
        contactLink: formData.contactDetails,
        photoURL: '', // Handled by providing selectedFile
      }, selectedFile);
      navigate('/profile');
    } catch (err) {
      console.error(err);
      alert("Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  if (user?.role === 'seller' || user?.verificationStatus === 'approved') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-bg-light">
        <div className="bg-white p-10 rounded-[40px] border border-border-main shadow-xl max-w-sm w-full space-y-6">
          <div className="w-24 h-24 bg-accent-subtle text-brand-primary rounded-full flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck size={48} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-text-main leading-tight mb-2">You're Verified!</h2>
            <p className="text-text-muted text-sm font-medium">Your student identity has been verified. You have full access to the seller tools and marketplace features.</p>
          </div>
          <div className="pt-4 space-y-3">
            <Link to="/sell" className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-primary text-white rounded-2xl font-black shadow-lg shadow-brand-primary/20 hover:translate-y-[-2px] transition-all">
              <ShoppingBag size={18} /> Post an Item
            </Link>
            <button onClick={() => navigate('/dashboard')} className="w-full py-3.5 bg-bg-light text-text-main border border-border-main rounded-2xl font-bold hover:bg-white transition-all">
              Seller Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (user?.verificationStatus === 'pending') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-bg-light">
        <div className="bg-white p-10 rounded-[40px] border border-border-main shadow-xl max-w-sm w-full space-y-6">
          <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Sparkles size={48} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-text-main leading-tight mb-2">Review in Progress</h2>
            <p className="text-text-muted text-sm font-medium">We're reviewing your student verification. This typically takes 12-24 hours. We'll notify you once you're approved!</p>
          </div>
          <button onClick={() => navigate('/profile')} className="w-full py-3.5 bg-brand-primary text-white rounded-2xl font-black shadow-lg shadow-brand-primary/20">
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-6 py-6 overflow-y-auto no-scrollbar">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl border border-border-main hover:bg-bg-light transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-text-main">Student Verification</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-border-main shadow-sm space-y-6">
            <div className="bg-accent-subtle p-4 rounded-xl border border-brand-primary/10 mb-2">
              <p className="text-brand-primary text-xs font-bold flex items-center gap-2">
                <ShieldCheck size={14} /> Student Identity Verification
              </p>
              <p className="text-text-muted text-[11px] mt-1 leading-relaxed">
                To keep CampusMarket safe for everyone, we require all sellers to verify their student status. Your ID photo is encrypted and only used for verification.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1">Legal Full Name</label>
                <input 
                  required
                  className="w-full h-12 px-4 rounded-xl bg-bg-light border border-border-main focus:bg-white focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all outline-none text-sm font-medium"
                  value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1">University Email (Gmail supported)</label>
                <input 
                  required
                  type="email"
                  placeholder="name@gmail.com"
                  className="w-full h-12 px-4 rounded-xl bg-bg-light border border-border-main focus:bg-white focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all outline-none text-sm font-medium"
                  value={formData.universityEmail}
                  onChange={e => setFormData({...formData, universityEmail: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1">Course & Year</label>
                <input 
                  required
                  placeholder="e.g. BSCS - 4th Year"
                  className="w-full h-12 px-4 rounded-xl bg-bg-light border border-border-main focus:bg-white focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all outline-none text-sm font-medium"
                  value={formData.courseAndYear}
                  onChange={e => setFormData({...formData, courseAndYear: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1">Student ID Number</label>
                <input 
                  required
                  placeholder="23-10223"
                  className="w-full h-12 px-4 rounded-xl bg-bg-light border border-border-main focus:bg-white focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all outline-none text-sm font-medium"
                  value={formData.studentId}
                  onChange={e => setFormData({...formData, studentId: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1">Short Seller Bio</label>
              <textarea 
                placeholder="Tell buyers about yourself or what you typically sell..."
                className="w-full p-4 rounded-xl bg-bg-light border border-border-main focus:bg-white focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all min-h-[80px] outline-none text-sm font-medium"
                value={formData.bio}
                onChange={e => setFormData({...formData, bio: e.target.value})}
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1">Snap your Student ID</label>
              <div className="relative h-56 rounded-2xl bg-bg-light border-2 border-dashed border-border-main flex flex-col items-center justify-center gap-3 group cursor-pointer hover:bg-white hover:border-brand-primary/50 transition-all overflow-hidden">
                {previewUrl ? (
                  <img src={previewUrl} alt="ID Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-border-main text-text-muted group-hover:text-brand-primary transition-colors">
                      <Camera size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-text-main">Take Photo or Upload</p>
                      <p className="text-[10px] text-text-muted mt-1">Ensure your name and photo are visible</p>
                    </div>
                  </>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1">Contact Link (Optional)</label>
              <textarea 
                placeholder="e.g. Phone number or Messenger URL"
                className="w-full p-4 rounded-xl bg-bg-light border border-border-main focus:bg-white focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all min-h-[100px] outline-none text-sm font-medium"
                value={formData.contactDetails}
                onChange={e => setFormData({...formData, contactDetails: e.target.value})}
              ></textarea>
            </div>
          </div>

          <button 
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-brand-primary text-white rounded-2xl font-black shadow-xl shadow-brand-primary/20 hover:bg-brand-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </form>
      </div>
    </div>
  );
};

const SellPage = () => {
  const { user, addListing, aiDraft, setAiDraft } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    description: '',
    category: 'Gadgets',
    condition: 'Used' as 'New' | 'Used',
    quantity: '1',
    location: '',
    contactMethod: '',
    isFeatured: false,
    tags: [] as string[]
  });

  useEffect(() => {
    if (aiDraft) {
      setFormData(prev => ({
        ...prev,
        title: aiDraft.title || prev.title,
        price: aiDraft.suggestedPrice?.toString() || prev.price,
        description: aiDraft.description || prev.description,
        category: aiDraft.category || prev.category,
        tags: aiDraft.tags || prev.tags
      }));
      // Clear the draft after using it
      setAiDraft(null);
    }
  }, [aiDraft, setAiDraft]);

  const isApprovedSeller = user?.role === 'seller' && user?.verificationStatus === 'approved';

  if (!isApprovedSeller) {
    return (
      <div className="h-[calc(100vh-64px)] flex flex-col items-center justify-center p-6 text-center bg-white">
        <div className="w-20 h-20 bg-accent-subtle text-brand-primary rounded-3xl flex items-center justify-center mb-6">
          <ShieldCheck size={40} />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-text-main">Complete Seller Verification</h1>
        <p className="text-text-muted mb-8 max-w-sm">To keep CampusMarket safe, only verified students can sell products. Complete your verification to start listing.</p>
        <Link to="/verify" className="px-8 py-3 bg-brand-primary text-white rounded-xl font-bold shadow-lg scale-100 active:scale-95 transition-all">
          Go to Verification
        </Link>
      </div>
    );
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setImageFiles(prev => [...prev, ...files]);
    
    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (imageFiles.length === 0) {
      alert("Please upload at least one product image.");
      return;
    }
    
    addListing({
      title: formData.title,
      price: Number(formData.price),
      description: formData.description,
      category: formData.category,
      condition: formData.condition,
      quantity: Number(formData.quantity),
      location: formData.location,
      contactMethod: formData.contactMethod,
      isFeatured: formData.isFeatured,
      tags: formData.tags,
      images: [] // images handled inside addListing
    }, imageFiles);
    
    // Auto-navigate immediately to Home Feed for "instant" feel
    navigate('/market');
  };

  return (
    <div className="flex-1 px-6 py-6 overflow-y-auto no-scrollbar max-w-4xl mx-auto w-full">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-text-main">Post New Item</h1>
          <p className="text-text-muted text-sm font-medium mt-1">List your product in the campus marketplace.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 pb-10">
        {/* Images Selection */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-border-main shadow-sm space-y-4">
          <label className="block text-xs font-black text-text-muted uppercase tracking-widest ml-1">Product Images</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {previews.map((src, index) => (
              <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-border-main group">
                <img src={src} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Archive size={14} />
                </button>
              </div>
            ))}
            {previews.length < 4 && (
              <label className="relative aspect-square rounded-2xl bg-bg-light border-2 border-dashed border-border-main flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white hover:border-brand-primary/50 transition-all text-text-muted hover:text-brand-primary">
                <Camera size={24} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Add Photo</span>
                <input type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} />
              </label>
            )}
          </div>
          <p className="text-[10px] text-text-muted font-medium italic">Tip: Bright, clear photos help items sell 2x faster.</p>
        </div>

        {/* Basic Details */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-border-main shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-2 ml-1">Product Name</label>
              <input 
                required
                className="w-full h-12 px-4 rounded-xl bg-bg-light border border-border-main focus:bg-white focus:ring-2 focus:ring-brand-primary/10 transition-all font-bold outline-none"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-2 ml-1">Category</label>
              <select 
                className="w-full h-12 px-4 rounded-xl bg-bg-light border border-border-main focus:bg-white transition-all outline-none font-bold"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                {['Gadgets', 'Books', 'Uniforms', 'Services', 'Others'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-2 ml-1">Price (₱)</label>
              <input 
                required
                type="number"
                className="w-full h-12 px-4 rounded-xl bg-bg-light border border-border-main focus:bg-white transition-all font-black outline-none text-brand-primary"
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-2 ml-1">Condition</label>
              <div className="flex gap-2">
                {(['New', 'Used'] as const).map((cond) => (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => setFormData({...formData, condition: cond})}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl border font-bold text-xs transition-all",
                      formData.condition === cond 
                        ? "bg-brand-primary text-white border-brand-primary shadow-md"
                        : "bg-bg-light text-text-muted border-border-main hover:border-brand-primary"
                    )}
                  >
                    {cond}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-2 ml-1">Quantity</label>
              <input 
                required
                type="number"
                min="1"
                className="w-full h-12 px-4 rounded-xl bg-bg-light border border-border-main focus:bg-white transition-all font-bold outline-none"
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-2 ml-1">Campus Meetup Location</label>
            <input 
              required
              placeholder="e.g. Near PLSP Gate 1 or Student Center"
              className="w-full h-12 px-4 rounded-xl bg-bg-light border border-border-main focus:bg-white transition-all font-medium outline-none"
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-2 ml-1">Contact Method</label>
            <input 
              required
              placeholder="e.g. In-app chat, Messenger link, or Phone Number"
              className="w-full h-12 px-4 rounded-xl bg-bg-light border border-border-main focus:bg-white transition-all font-medium outline-none"
              value={formData.contactMethod}
              onChange={e => setFormData({...formData, contactMethod: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-text-muted uppercase tracking-widest mb-2 ml-1">Item Description</label>
            <textarea 
              required
              className="w-full p-4 rounded-2xl bg-bg-light border border-border-main focus:bg-white transition-all min-h-[150px] outline-none font-medium leading-relaxed"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            ></textarea>
          </div>
        </div>

        {/* Monetization & Feature */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-border-main shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-text-main uppercase tracking-tight">Boost Your Listing</h3>
              <p className="text-[10px] text-text-muted font-bold mt-1">Featured products appear at the top of the marketplace.</p>
            </div>
            <button 
              type="button"
              onClick={() => setFormData({...formData, isFeatured: !formData.isFeatured})}
              className={cn(
                "w-12 h-6 rounded-full transition-all relative",
                formData.isFeatured ? "bg-brand-primary" : "bg-border-main"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                formData.isFeatured ? "right-1" : "left-1"
              )} />
            </button>
          </div>

          <div className="pt-6 border-t border-border-main/50 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-muted font-bold">List Price</span>
              <span className="text-text-main font-black">₱{Number(formData.price || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-muted font-bold">Platform Fee (5%)</span>
              <span className="text-red-500 font-bold">-₱{(Number(formData.price || 0) * 0.05).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-dashed border-border-main text-base">
              <span className="text-text-main font-black">You'll Receive</span>
              <span className="text-brand-primary font-black">₱{(Number(formData.price || 0) * 0.95).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-brand-primary text-white rounded-2xl font-black shadow-xl shadow-brand-primary/20 hover:bg-brand-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Posting...</span>
            </>
          ) : (
            <>Post Product for Sale</>
          )}
        </button>
      </form>
    </div>
  );
};

  const ListingDetail = () => {
    const { id } = useParams<{ id: string }>();
    const { listings, user, favorites, toggleFavorite, createChat, deleteListing, markAsSold, createTransaction } = useApp();
    const navigate = useNavigate();
    const listing = listings.find(l => l.id === id);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [buying, setBuying] = useState(false);
    const isFavorite = listing ? favorites.includes(listing.id) : false;
  
    useEffect(() => {
      if (id && user && listing) {
        // Increment views
        const listingRef = doc(db, 'listings', id);
        updateDoc(listingRef, {
          views: increment(1)
        }).catch(console.error);
      }
    }, [id, user?.id]);

    const handleBuy = async () => {
        if (!listing) return;
        
        const fee = listing.price * 0.05;
        const sellerGets = listing.price - fee;

        if (!window.confirm(
            `Transaction Breakdown:\n\n` +
            `Product Price: ₱${listing.price.toLocaleString()}\n` +
            `Platform Fee (5%): ₱${fee.toLocaleString()}\n` +
            `Seller Receives: ₱${sellerGets.toLocaleString()}\n\n` +
            `Are you sure you want to commit to buying "${listing.title}"?`
        )) return;
        
        setBuying(true);
        try {
            const tid = await createTransaction(listing, 'cash_on_meetup');
            if (tid) {
                navigate('/purchases');
            }
        } finally {
            setBuying(false);
        }
    };
  
    if (!listing) return null;

  const handleMessage = async () => {
    const chatId = await createChat(listing);
    if (chatId) {
      navigate(`/chat/${chatId}`);
    }
  };

  const images = listing.images.length > 0 ? listing.images : [`https://picsum.photos/seed/${listing.id}/800/800`];

  return (
    <div className="flex-1 px-4 py-8 md:px-8 overflow-y-auto no-scrollbar bg-white min-h-screen">
       <div className="max-w-5xl mx-auto space-y-8 pb-20">
        <header className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="group p-2 flex items-center gap-2 text-sm font-black text-text-muted hover:text-brand-primary transition-colors uppercase tracking-widest">
                <div className="w-8 h-8 rounded-full bg-bg-light border border-border-main flex items-center justify-center group-hover:bg-accent-subtle group-hover:border-brand-primary transition-all">
                    <ArrowLeft size={16} />
                </div>
                Back to Market
            </button>
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => toggleFavorite(listing.id)}
                    className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center transition-all border shadow-sm",
                        isFavorite 
                            ? "bg-red-50 border-red-100 text-red-500 shadow-red-100" 
                            : "bg-white border-border-main text-text-muted hover:border-red-200 hover:text-red-400"
                    )}
                >
                    <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
                </button>
                <button className="w-11 h-11 rounded-2xl bg-white border border-border-main flex items-center justify-center text-text-muted hover:text-brand-primary transition-all shadow-sm">
                    <Archive size={20} />
                </button>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Visuals - 7/12 cols */}
            <div className="lg:col-span-7 space-y-6">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="aspect-[4/5] md:aspect-square rounded-[40px] overflow-hidden bg-bg-light border border-border-main relative group shadow-2xl shadow-black/5"
                >
                    <img 
                        src={images[activeImageIndex]} 
                        alt={listing.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute top-6 left-6 flex flex-col gap-2">
                        <span className="px-4 py-1.5 bg-white/90 backdrop-blur-md text-brand-primary rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 shadow-xl">
                            {listing.category}
                        </span>
                        <span className="px-4 py-1.5 bg-text-main/90 backdrop-blur-md text-white rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-xl">
                            {listing.condition}
                        </span>
                    </div>
                </motion.div>
            
                {images.length > 1 && (
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                        {images.map((img, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveImageIndex(idx)}
                                className={cn(
                                    "w-20 h-20 rounded-2xl flex-shrink-0 overflow-hidden border-2 transition-all relative",
                                    activeImageIndex === idx 
                                        ? "border-brand-primary ring-4 ring-brand-primary/10" 
                                        : "border-transparent opacity-50 hover:opacity-100"
                                )}
                            >
                                <img src={img} alt={`${listing.title} ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                {activeImageIndex === idx && (
                                    <div className="absolute inset-0 bg-brand-primary/10"></div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Info - 5/12 cols */}
            <div className="lg:col-span-5 flex flex-col pt-2">
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-text-main tracking-tight leading-tight mb-4">{listing.title}</h1>
                    <div className="flex items-end gap-3">
                        <span className="text-4xl font-black text-brand-primary">₱{listing.price.toLocaleString()}</span>
                        <span className="text-text-muted text-sm font-bold mb-1.5 uppercase tracking-wider">Fixed Price</span>
                    </div>
                </div>

                <Link to={`/profile/${listing.sellerId}`} className="group p-5 bg-bg-light rounded-[32px] flex items-center justify-between border border-border-main transition-all hover:bg-white hover:border-brand-primary/30 mb-8 relative">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center font-black text-brand-primary border border-border-main shadow-sm text-2xl uppercase overflow-hidden">
                            {listing.sellerAvatar ? (
                                <img src={listing.sellerAvatar} alt={listing.sellerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                listing.sellerName[0]
                            )}
                        </div>
                        <div>
                            <p className="font-extrabold text-text-main text-base group-hover:text-brand-primary transition-colors">{listing.sellerName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <ShieldCheck size={14} className="text-brand-primary" />
                                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Verified Seller</p>
                            </div>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full border border-border-main flex items-center justify-center text-text-muted group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary transition-all">
                        <ChevronRight size={20} />
                    </div>
                </Link>

                {/* Stats Bento */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-accent-subtle/50 rounded-2xl border border-brand-primary/10">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1 opacity-60">Visual Interest</p>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-text-main">{listing.views}</span>
                            <span className="text-xs font-bold text-text-muted uppercase">Views</span>
                        </div>
                    </div>
                    <div className="p-4 bg-accent-subtle/50 rounded-2xl border border-brand-primary/10">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1 opacity-60">Availability</p>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-text-main">{listing.quantity}</span>
                            <span className="text-xs font-bold text-text-muted uppercase">Units</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-3">
                        <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Listing Details</h3>
                        <p className="text-text-main text-sm font-medium leading-relaxed whitespace-pre-wrap bg-white p-6 rounded-3xl border border-border-main shadow-sm">
                            {listing.description}
                        </p>
                    </div>

                    {listing.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {listing.tags.map(tag => (
                                <span key={tag} className="px-4 py-2 bg-bg-light border border-border-main text-text-muted rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-white hover:text-brand-primary transition-colors cursor-pointer">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-auto pt-10">
                    {user?.id !== listing.sellerId ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button 
                                onClick={handleMessage}
                                className="w-full py-5 bg-white border-2 border-brand-primary text-brand-primary rounded-[24px] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-sm hover:bg-bg-light active:scale-[0.98] transition-all"
                            >
                                <MessageSquare size={20} /> Chat First
                            </button>
                            <button 
                                onClick={handleBuy}
                                disabled={buying || listing.status === 'sold'}
                                className="w-full py-5 bg-brand-primary text-white rounded-[24px] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-brand-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {buying ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <ShoppingBag size={20} />
                                )}
                                {listing.status === 'sold' ? 'Sold Out' : 'Buy Now'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl flex items-start gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm flex-shrink-0">
                                    <AlertCircle size={20} />
                                </div>
                                <div>
                                    <p className="text-[11px] text-amber-800 font-extrabold uppercase tracking-widest mb-0.5">Seller Dashboard</p>
                                    <p className="text-xs text-amber-700 font-medium opacity-80 leading-snug">This is your listing. Keep track of views and status here.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => {
                                        if (window.confirm('Are you sure you want to delete this listing?')) {
                                            deleteListing(listing.id);
                                            navigate('/market');
                                        }
                                    }}
                                    className="py-4 border border-red-200 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-50 transition-all shadow-sm"
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                                <button 
                                    onClick={() => markAsSold(listing.id)}
                                    disabled={listing.status === 'sold'}
                                    className="py-4 bg-brand-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 hover:bg-brand-primary-hover disabled:opacity-50 transition-all"
                                >
                                    <CheckCircle size={16} /> {listing.status === 'sold' ? 'Sold Out' : 'Mark Sold'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
       </div>
    </div>
  );
};

// --- App Provider ---

const toMillis = (timestamp: any): number => {
  if (!timestamp) return Date.now();
  if (typeof timestamp === 'number') return timestamp;
  if (timestamp.toMillis) return timestamp.toMillis();
  return Date.now();
};

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [fbUser, setFbUser] = useState<any>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sellerApplication, setSellerApplication] = useState<SellerApplication | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages] = useState<ChatMessage[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [aiDraft, setAiDraft] = useState<any | null>(null);
  const [notifications, setNotifications] = useState<{id: string, message: string, type: 'info' | 'success' | 'error'}[]>([]);

  const addNotification = (message: string, type: 'info' | 'success' | 'error') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    if (type === 'success') {
      setTimeout(() => removeNotification(id), 5000);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Connection Test
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error.message?.includes('the client is offline') || error.message?.includes('Failed to fetch')) {
          console.error("Firebase connection failed. This might be a network issue or missing configuration.", error);
        }
      }
    };
    testConnection();
  }, []);

  // Sync Auth State
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, (fUser) => {
      setFbUser(fUser);
      if (!fUser) {
        setUser(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Sync User Profile Real-time
  useEffect(() => {
    if (!fbUser) return;
    
    const userRef = doc(db, 'users', fbUser.uid);
    const unsubscribe = onSnapshot(userRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        
        setUser({ 
          ...data, 
          role: typeof data.role === 'string' ? data.role.trim() : data.role,
          verificationStatus: typeof data.verificationStatus === 'string' ? data.verificationStatus.trim() : data.verificationStatus,
          createdAt: toMillis(data.createdAt), 
          id: fbUser.uid 
        } as UserProfile);
      } else {
        // Create initial profile if it doesn't exist
        const profileData = {
          email: fbUser.email || '',
          fullName: fbUser.displayName || 'CAMPUS STUDENT',
          courseAndYear: '',
          role: 'buyer',
          isVerified: false,
          onboarded: false,
          verificationStatus: 'none',
          createdAt: serverTimestamp()
        };
        await setDoc(userRef, profileData);
        syncUserProfileToSupabase(fbUser.uid, profileData);
      }
      setLoading(false);
    }, (err) => {
      console.error("Profile sync error:", err);
      setLoading(false);
    });

    return unsubscribe;
  }, [fbUser]);

  // Sync Listings
  useEffect(() => {
    if (!user) {
      setListings([]);
      return;
    }
    const q = query(
      collection(db, 'listings'), 
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ 
        ...d.data(), 
        id: d.id, 
        createdAt: toMillis(d.data().createdAt) 
      } as Listing));
      
      // Prioritize featured listings
      const sortedData = [...data].sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return 0;
      });

      setListings(sortedData);
      setListingsLoading(false);
    }, (error) => {
      console.error("Listings sync error:", error);
      setListingsLoading(false);
    });
    return unsubscribe;
  }, [user]);

  // Sync My Listings (for Dashboard - includes all statuses)
  useEffect(() => {
    if (!user) {
      setMyListings([]);
      return;
    }
    const q = query(
      collection(db, 'listings'), 
      where('sellerId', '==', user.id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ 
        ...d.data(), 
        id: d.id, 
        createdAt: toMillis(d.data().createdAt) 
      } as Listing));
      setMyListings(data);
    }, (error) => {
      console.error("My Listings sync error:", error);
    });
    return unsubscribe;
  }, [user]);

  // Sync Favorites
  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }
    const q = collection(db, 'users', user.id, 'favorites');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFavorites(snapshot.docs.map(d => d.id));
    }, (error) => {
      console.error("Favorites sync error:", error);
    });
    return unsubscribe;
  }, [user]);

  // Sync Reviews
  useEffect(() => {
    if (!user) {
      setReviews([]);
      return;
    }
    const q = query(
      collection(db, 'reviews'),
      where('sellerId', '==', user.id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        ...d.data(),
        id: d.id,
        createdAt: toMillis(d.data().createdAt),
        approvedAt: toMillis(d.data().approvedAt)
      } as Review));
      setReviews(data);
    }, (error) => {
      console.error("Reviews sync error:", error);
    });
    return unsubscribe;
  }, [user]);

  // Sync Seller Application
  useEffect(() => {
    if (!user) {
      setSellerApplication(null);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'sellerApplications', user.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSellerApplication({ 
          ...data, 
          status: typeof data.status === 'string' ? data.status.trim() : data.status,
          createdAt: toMillis(data.createdAt), 
          userId: user.id 
        } as SellerApplication);
      } else {
        setSellerApplication(null);
      }
    }, (error) => {
       handleFirestoreError(error, 'get', `sellerApplications/${user.id}`);
    });
    return unsubscribe;
  }, [user]);

  // Sync Chats
  useEffect(() => {
    if (!user) {
      setChats([]);
      return;
    }
    const q = query(
      collection(db, 'chats'), 
      where('participants', 'array-contains', user.id),
      orderBy('lastMessageAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(d => ({ 
          ...d.data(), 
          id: d.id, 
          lastMessageAt: toMillis(d.data().lastMessageAt) 
        } as Chat))
        .filter(c => !c.archivedBy?.includes(user.id));
      setChats(data);
    }, (error) => {
      handleFirestoreError(error, 'list', 'chats');
    });
    return unsubscribe;
  }, [user]);

  // Sync Transactions
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      return;
    }
    const q = query(
      collection(db, 'transactions'),
      where('participants', 'array-contains', user.id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        ...d.data(),
        id: d.id,
        createdAt: toMillis(d.data().createdAt)
      } as Transaction));
      setTransactions(data);
    }, (error) => {
      handleFirestoreError(error, 'list', 'transactions');
    });
    return unsubscribe;
  }, [user]);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const createTransaction = async (listing: Listing, paymentMethod: Transaction['paymentMethod']) => {
    if (!user) return;
    try {
      const commissionAmount = listing.price * 0.05;
      const sellerEarnings = listing.price - commissionAmount;

      const transactionData = {
        listingId: listing.id,
        listingTitle: listing.title,
        listingImage: listing.images[0] || '',
        buyerId: user.id,
        buyerName: user.fullName,
        sellerId: listing.sellerId,
        sellerName: listing.sellerName,
        amount: listing.price,
        commissionAmount,
        sellerEarnings,
        status: 'pending',
        paymentMethod,
        participants: [user.id, listing.sellerId],
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'transactions'), transactionData);
      
      // Update listing status
      await updateDoc(doc(db, 'listings', listing.id), {
        status: 'sold',
        updatedAt: serverTimestamp()
      });

      addNotification(`Purchase request for "${listing.title}" sent!`, 'success');
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, 'create', 'transactions');
    }
  };

  const updateTransactionStatus = async (transactionId: string, status: Transaction['status']) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'transactions', transactionId), {
        status,
        updatedAt: serverTimestamp()
      });
      addNotification(`Transaction status: ${status}`, 'info');
    } catch (error) {
      handleFirestoreError(error, 'update', `transactions/${transactionId}`);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, data);
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      // Sync to Supabase
      syncUserProfileToSupabase(user.id, updatedUser);
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${user.id}`);
    }
  };

  const addListing = async (data: any, imageFiles: File[]) => {
    if (!user) return;
    
    addNotification(`Compressing and uploading images for "${data.title}"...`, 'info');
    
    try {
      // 1. COMPRESS & UPLOAD IMAGES FIRST (STRICT FLOW)
      // We do not continue if this fails. No placeholders allowed.
      const uploadPromises = imageFiles.map(async (file, index) => {
        const compressedBlob = await compressImage(file);
        // Use Supabase Storage for upload
        return await uploadProductImage(compressedBlob, user.id);
      });
      
      const imageUrls = await Promise.all(uploadPromises);
      
      if (imageUrls.length === 0) {
        throw new Error("At least one image is required for listing.");
      }

      console.log(`Images uploaded successfully to Supabase. Saving records...`);

      // 2. Create the Firebase document WITH the real image URLs
      const listingRef = await addDoc(collection(db, 'listings'), {
        ...data,
        images: imageUrls,
        sellerId: user.id,
        sellerName: user.fullName,
        sellerAvatar: user.avatarUrl || '',
        sellerRating: 4.8, 
        status: 'active',
        views: 0,
        inquiries: 0,
        createdAt: serverTimestamp()
      });

      // 3. Create the Supabase record WITH the real image URL
      if (supabase) {
        try {
          const { error: supabaseError } = await supabase
            .from('listings')
            .insert([{
              id: listingRef.id,
              title: data.title,
              price: data.price,
              category: data.category,
              seller_id: user.id,
              seller_name: user.fullName,
              seller_avatar: user.avatarUrl || '',
              status: 'active',
              description: data.description,
              image_url: imageUrls[0], // Main thumbnail
              created_at: new Date().toISOString()
            }]);
          
          if (supabaseError) {
             console.warn("Supabase insert failed:", supabaseError.message);
          }

          // Optional: Add all images to the images table
          const imageRecords = imageUrls.map(url => ({
            listing_id: listingRef.id,
            url: url
          }));
          
          await supabase
            .from('listing_images')
            .insert(imageRecords);

        } catch (err) {
          console.warn("Supabase sync error:", err);
        }
      }
      
      addNotification(`"${data.title}" has been posted successfully!`, 'success');

    } catch (error: any) {
      console.error("Strict upload error:", error);
      const errorMsg = error.message || "Upload failed. Please check your connection and storage permissions.";
      addNotification(`Post Failed: ${errorMsg}`, 'error');
      // Do not handle Firestore error here if we didn't even reach Firestore
      if (error.code && error.code.includes('firestore')) {
        handleFirestoreError(error, 'create', 'listings');
      }
    }
  };

  const updateListing = async (listingId: string, data: Partial<Listing>) => {
    if (!user) return;
    try {
      // 1. Update Firebase
      await updateDoc(doc(db, 'listings', listingId), {
        ...data,
        updatedAt: serverTimestamp()
      });

      // 2. Mirror to Supabase
      if (supabase) {
        try {
          await supabase
            .from('listings')
            .update(data)
            .eq('id', listingId);
        } catch (err) {
          console.warn("Supabase update mirror failed:", err);
        }
      }
    } catch (error) {
      handleFirestoreError(error, 'update', `listings/${listingId}`);
    }
  };

  const deleteListing = async (listingId: string) => {
    if (!user) return;
    try {
      // 1. Delete from Firebase (Primary)
      await deleteDoc(doc(db, 'listings', listingId));
      
      // 2. Mirror deletion to Supabase
      if (supabase) {
        try {
          await supabase
            .from('listings')
            .delete()
            .eq('id', listingId);
          console.log("Successfully removed listing from Supabase.");
        } catch (err) {
          console.warn("Supabase delete mirror failed:", err);
        }
      }

      addNotification('Listing deleted successfully.', 'info');
    } catch (error) {
      handleFirestoreError(error, 'delete', `listings/${listingId}`);
    }
  };

  const markAsSold = async (listingId: string) => {
    if (!user) return;
    try {
      // Fetch listing details for transaction record
      const listing = listings.find(l => l.id === listingId);
      
      // 1. Update Firebase
      await updateDoc(doc(db, 'listings', listingId), {
        status: 'sold',
        updatedAt: serverTimestamp()
      });

      // 2. Create Transaction record for history
      if (listing) {
        const commissionAmount = listing.price * 0.05;
        const sellerEarnings = listing.price - commissionAmount;

        const transactionData = {
          listingId: listing.id,
          listingTitle: listing.title,
          listingImage: listing.images[0] || '',
          buyerId: 'manual_offline',
          buyerName: 'Manual Sale (Offline)',
          sellerId: user.id,
          sellerName: user.fullName,
          amount: listing.price,
          commissionAmount,
          sellerEarnings,
          status: 'completed',
          paymentMethod: 'cash_on_meetup',
          participants: [user.id, 'manual_offline'],
          createdAt: serverTimestamp()
        };
        await addDoc(collection(db, 'transactions'), transactionData);
      }

      // 3. Mirror to Supabase
      if (supabase) {
        try {
          await supabase
            .from('listings')
            .update({ status: 'sold' })
            .eq('id', listingId);
          console.log("Successfully marked as sold in Supabase.");
        } catch (err) {
          console.warn("Supabase sold mirror failed:", err);
        }
      }

      addNotification('Item marked as sold!', 'success');
    } catch (error) {
      handleFirestoreError(error, 'update', `listings/${listingId}`);
    }
  };

  const toggleFavorite = async (listingId: string) => {
    if (!user) return;
    try {
      const favRef = doc(db, 'users', user.id, 'favorites', listingId);
      if (favorites.includes(listingId)) {
        await deleteDoc(favRef);
      } else {
        await setDoc(favRef, {
          listingId,
          addedAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, 'write', `users/${user.id}/favorites/${listingId}`);
    }
  };

  const createChat = async (listing: Listing) => {
    if (!user) return '';
    try {
      // 1. Check in active chats (not archived)
      const existing = chats.find(c => 
        c.participants.length === 2 && 
        c.participants.includes(user.id) && 
        c.participants.includes(listing.sellerId)
      );
      
      if (existing) return existing.id;

      // 2. Check all chats in database (might be archived)
      const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', user.id)
      );
      const snap = await getDocs(q);
      const dbChat = snap.docs.find(d => {
        const p = d.data().participants || [];
        return p.length === 2 && p.includes(listing.sellerId);
      });

      if (dbChat) {
        // Un-archive if it was archived
        await updateDoc(doc(db, 'chats', dbChat.id), {
          archivedBy: arrayRemove(user.id)
        });
        return dbChat.id;
      }

      // 3. Create new if truly doesn't exist
      const chatRef = await addDoc(collection(db, 'chats'), {
        participants: [user.id, listing.sellerId],
        listingId: listing.id,
        listingTitle: listing.title,
        sellerName: listing.sellerName,
        lastMessage: 'Started a chat',
        lastMessageAt: serverTimestamp(),
        archivedBy: []
      });
      return chatRef.id;
    } catch (error) {
      handleFirestoreError(error, 'create', 'chats');
      return '';
    }
  };

  const sendMessage = async (chatId: string, text: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.id,
        text,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        archivedBy: [] // Un-archive for everyone on new activity
      });
    } catch (error) {
      handleFirestoreError(error, 'create', `chats/${chatId}/messages`);
    }
  };

  const deleteMessage = async (chatId: string, messageId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));
      addNotification('Message deleted', 'info');
    } catch (error) {
      handleFirestoreError(error, 'delete', `chats/${chatId}/messages/${messageId}`);
    }
  };

  const deleteChat = async (chatId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        archivedBy: arrayUnion(user.id)
      });
      addNotification('Conversation archived', 'info');
    } catch (error) {
      handleFirestoreError(error, 'update', `chats/${chatId}`);
    }
  };

  const replyToReview = async (reviewId: string, text: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'reviews', reviewId), {
        sellerReply: text
      });
    } catch (error) {
      handleFirestoreError(error, 'update', `reviews/${reviewId}`);
    }
  };

  const archiveReview = async (reviewId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'reviews', reviewId), {
        status: 'archived'
      });
    } catch (error) {
      handleFirestoreError(error, 'update', `reviews/${reviewId}`);
    }
  };

  const reportReview = async (reviewId: string, reason: string) => {
    // In a real app, this would send a report to admins
    console.log(`Review ${reviewId} reported for: ${reason}`);
    alert("Review reported to campus moderators.");
  };

  const submitSellerApplication = async (data: Omit<SellerApplication, 'userId' | 'status' | 'createdAt'>, idFile?: File) => {
    if (!user) return;
    try {
      let photoURL = data.photoURL;
      
      if (idFile) {
        addNotification("Compressing and uploading student ID...", "info");
        const compressed = await compressImage(idFile);
        photoURL = await uploadStudentId(compressed, user.id);
      }

      // 1. Save to sellerApplications collection as requested
      const appRef = doc(db, 'sellerApplications', user.id);
      await setDoc(appRef, {
        ...data,
        photoURL,
        userId: user.id,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // 2. Update status in user profile for UI conditional rendering
      // Note: role and isVerified are immutable by user in rules, but verificationStatus is allowed
      await updateDoc(doc(db, 'users', user.id), {
        verificationStatus: 'pending'
      });
    } catch (error) {
       handleFirestoreError(error, 'write', `sellerApplications/${user.id}`);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-light">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isSupabaseConnected = !!supabase;

  return (
    <AppContext.Provider value={{ 
      user, loading, listings, myListings, favorites, reviews, chats, messages, transactions, search, setSearch, listingsLoading,
      login, logout, updateProfile, addListing, updateListing, deleteListing, markAsSold, toggleFavorite, createChat, sendMessage, deleteMessage, deleteChat,
      createTransaction, updateTransactionStatus,
      replyToReview, archiveReview, reportReview,
      sellerApplication, submitSellerApplication,
      notifications, addNotification, removeNotification,
      isSupabaseConnected,
      aiDraft,
      setAiDraft
    }}>
      {children}
    </AppContext.Provider>
  );
};

// --- Main App Wrapper ---

import { useParams } from 'react-router-dom';

const ChatPage = () => {
    const { id } = useParams<{ id: string }>();
    const { chats, sendMessage, deleteMessage, deleteChat, user } = useApp();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState('');
    const chat = chats.find(c => c.id === id);
    const navigate = useNavigate();
    const [partner, setPartner] = useState<UserProfile | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!id || !chat || !user) return;
        
        const partnerId = chat.participants.find(p => p !== user.id);
        if (partnerId) {
            getDoc(doc(db, 'users', partnerId)).then(snap => {
                if (snap.exists()) {
                    setPartner({ ...snap.data(), id: snap.id } as UserProfile);
                }
            });
        }

        const q = query(collection(db, 'chats', id, 'messages'), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ 
              ...d.data(), 
              id: d.id, 
              createdAt: toMillis(d.data().createdAt) 
            } as ChatMessage));
            setMessages(data);
        });
        return unsubscribe;
    }, [id, chat, user]);

    if (!chat || !user) return null;

    const handleArchiveMessage = async (msgId: string) => {
        if (window.confirm("Delete this message?")) {
            await deleteMessage(chat.id, msgId);
        }
    };

    const handleArchiveChat = async () => {
        if (window.confirm("Archive this conversation? It will be hidden until a new message arrives.")) {
            await deleteChat(chat.id);
            navigate('/messages');
        }
    };

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden relative border-x border-border-main">
            <div className="p-4 border-b flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-brand-primary transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-border-main flex items-center justify-center text-brand-primary font-bold overflow-hidden">
                            {partner?.avatarUrl ? (
                                <img src={partner.avatarUrl} alt={partner.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                (partner?.fullName?.[0] || chat.sellerName?.[0] || '?')
                            )}
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 leading-tight">{partner?.fullName || chat.sellerName || 'Chat'}</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{chat.listingTitle}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {partner && (
                        <Link to={`/profile/${partner.id}`} className="text-brand-primary font-bold text-xs hover:bg-brand-primary group transition-all bg-accent-subtle px-3 py-2 rounded-xl flex items-center gap-1.5 md:px-4">
                            <User size={14} className="group-hover:text-white" />
                            <span className="group-hover:text-white hidden md:inline">Profile</span>
                        </Link>
                    )}
                    <button 
                        onClick={handleArchiveChat}
                        className="p-2 text-text-muted hover:text-brand-primary hover:bg-bg-light rounded-xl transition-all"
                        title="Archive Conversation"
                    >
                        <Archive size={20} />
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {messages.map(m => (
                    <div key={m.id} className={cn(
                        "flex flex-col group",
                        m.senderId === user.id ? "items-end" : "items-start"
                    )}>
                        <div className={cn(
                            "max-w-[85%] p-3 px-4 rounded-[20px] text-sm font-medium relative group",
                            m.senderId === user.id 
                                ? "bg-brand-primary text-white rounded-tr-none shadow-sm" 
                                : "bg-bg-light text-text-main border border-border-main rounded-tl-none"
                        )}>
                            {m.text}
                            
                            {m.senderId === user.id && (
                                <button 
                                    onClick={() => handleArchiveMessage(m.id)}
                                    className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                        <span className="text-[9px] text-text-muted font-bold mt-1 px-1">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-border-main pb-safe bg-white">
                <form className="flex gap-2" onSubmit={(e) => {
                    e.preventDefault();
                    if (text.trim()) {
                        sendMessage(chat.id, text);
                        setText('');
                    }
                }}>
                    <input 
                        className="flex-1 h-11 px-4 rounded-xl bg-bg-light border border-border-main focus:bg-white focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all text-sm outline-none"
                        placeholder="Type a message..."
                        value={text}
                        onChange={e => setText(e.target.value)}
                    />
                    <button type="submit" className="w-11 h-11 bg-brand-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20 hover:bg-brand-primary-hover transition-all">
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

const SellerDashboardPage = () => {
  const { user, reviews, myListings, replyToReview, archiveReview, reportReview, markAsSold, deleteListing, isSupabaseConnected } = useApp();
  if (!user) return null;
  return (
    <SellerDashboard 
      user={user} 
      reviews={reviews} 
      listings={myListings}
      onReply={replyToReview}
      onArchive={archiveReview}
      onReport={reportReview}
      onMarkAsSold={markAsSold}
      onDeleteListing={deleteListing}
      isSupabaseConnected={isSupabaseConnected}
    />
  );
};

const ChatItem = ({ chat, currentUserId }: { chat: Chat, currentUserId: string }) => {
    const { deleteChat } = useApp();
    const [partnerName, setPartnerName] = useState<string>(chat.sellerName || chat.listingTitle);
    const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null);

    useEffect(() => {
        const partnerId = chat.participants.find(p => p !== currentUserId);
        if (partnerId) {
            getDoc(doc(db, 'users', partnerId)).then(snap => {
                if (snap.exists()) {
                    const data = snap.data();
                    setPartnerName(data.fullName);
                    setPartnerAvatar(data.avatarUrl || null);
                }
            });
        }
    }, [chat, currentUserId]);

    const handleArchive = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm("Archive this conversation?")) {
            await deleteChat(chat.id);
        }
    };

    return (
        <div className="group relative">
            <Link 
                to={`/chat/${chat.id}`}
                className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-border-main shadow-sm hover:border-brand-primary active:scale-[0.98] transition-all"
            >
                <div className="w-12 h-12 rounded-xl bg-accent-subtle flex items-center justify-center text-brand-primary font-bold border border-border-main overflow-hidden">
                    {partnerAvatar ? (
                        <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                        partnerName[0]
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-text-main truncate">{partnerName}</h3>
                    <p className="text-[13px] text-text-muted truncate font-medium">{chat.lastMessage}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className="text-[10px] text-text-muted font-bold whitespace-nowrap">
                        {new Date(chat.lastMessageAt || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button 
                        onClick={handleArchive}
                        className="p-1.5 text-text-muted hover:text-brand-primary hover:bg-bg-light rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Archive Conversation"
                    >
                        <Archive size={14} />
                    </button>
                </div>
            </Link>
        </div>
    );
};

const OnboardingPage = () => {
    const { user, updateProfile, addNotification } = useApp();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        courseAndYear: user?.courseAndYear || '',
        bio: user?.bio || '',
        interests: [] as string[]
    });
    const navigate = useNavigate();

    const interests = ['Gadgets', 'Books', 'Uniforms', 'Notes', 'Events', 'Food'];

    const toggleInterest = (interest: string) => {
        setFormData(prev => ({
            ...prev,
            interests: prev.interests.includes(interest)
                ? prev.interests.filter(i => i !== interest)
                : [...prev.interests, interest]
        }));
    };

    const handleNext = () => setStep(prev => Math.min(prev + 1, 3));
    const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

    const handleComplete = async () => {
        if (!formData.fullName || !formData.courseAndYear) {
            addNotification("Please fill in the required fields.", "error");
            setStep(1); 
            return;
        }

        await updateProfile({
            ...formData,
            onboarded: true
        });

        localStorage.removeItem('campusListingTutorialSeen');
        addNotification("Welcome to CampusMarket! Your profile is ready.", "success");
        navigate('/market');
    };

    const handleSkip = () => {
        if (step === 2) {
            handleNext();
        } else if (step === 3) {
            handleComplete();
        }
    };

    const slideStyles = {
        '--color-orange': '#EF895F',
        '--color-dark': '#221F1E',
        '--color-bg': '#E8F6EF',
    } as React.CSSProperties;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 md:p-6 font-hind relative overflow-hidden" style={slideStyles}>
            <div className="fixed inset-0 -z-10 bg-black overflow-hidden pointer-events-none">
                <SpiderCursor />
            </div>
            
            <motion.main 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-[356px] bg-[#221F1E] rounded-[1.25rem] py-12 px-0 text-center overflow-hidden shadow-2xl"
            >
                {step > 1 && (
                    <button 
                        onClick={handleSkip}
                        className="absolute top-6 right-6 text-[10px] uppercase tracking-widest font-bold text-white/40 hover:text-[#EF895F] transition-colors z-20"
                    >
                        Skip
                    </button>
                )}

                <div 
                    className="flex transition-all duration-500 ease-in-out"
                    style={{ 
                        width: '300%', 
                        marginLeft: `-${(step - 1) * 100}%` 
                    }}
                >
                    <article className="w-full px-8 flex flex-col items-center">
                        <img src="https://c.top4top.io/p_2020eq9aa1.png" alt="illustration" className="w-[90%] mb-4" />
                        <div className="space-y-4">
                            <h2 className="text-[1.75rem] font-semibold text-white leading-tight">The Essentials.</h2>
                            <p className="text-sm text-white/60 font-light px-2 leading-relaxed">Every profile is verified to keep our community safe.</p>
                            
                            <div className="space-y-3 pt-2 w-full text-left">
                                <input 
                                    type="text" 
                                    value={formData.fullName}
                                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/10 focus:border-[#EF895F] focus:ring-1 focus:ring-[#EF895F] outline-none transition-all text-white text-sm"
                                    placeholder="Full Name"
                                />
                                <input 
                                    type="text" 
                                    value={formData.courseAndYear}
                                    onChange={e => setFormData({ ...formData, courseAndYear: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/10 focus:border-[#EF895F] focus:ring-1 focus:ring-[#EF895F] outline-none transition-all text-white text-sm"
                                    placeholder="Course & Year"
                                />
                            </div>
                        </div>
                    </article>

                    <article className="w-full px-8 flex flex-col items-center">
                        <img src="https://e.top4top.io/p_2020mx8xt3.png" alt="illustration" className="w-[90%] mb-4" />
                        <div className="space-y-4 w-full">
                            <h2 className="text-[1.75rem] font-semibold text-white leading-tight">Your Story.</h2>
                            <p className="text-sm text-white/60 font-light px-2 leading-relaxed">A great bio increases trust during meetups.</p>
                            <textarea 
                                value={formData.bio}
                                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                className="w-full h-32 p-4 rounded-xl bg-white/10 border border-white/10 focus:border-[#EF895F] focus:ring-1 focus:ring-[#EF895F] outline-none transition-all text-white text-sm resize-none"
                                placeholder="Tell us about yourself..."
                            />
                        </div>
                    </article>

                    <article className="w-full px-8 flex flex-col items-center">
                        <img src="https://d.top4top.io/p_20200jsuo2.png" alt="illustration" className="w-[90%] mb-4" />
                        <div className="space-y-4 w-full">
                            <h2 className="text-[1.75rem] font-semibold text-white leading-tight">Taste.</h2>
                            <p className="text-sm text-white/60 font-light px-2 leading-relaxed">What are you looking for today?</p>
                            
                            <div className="grid grid-cols-2 gap-2 w-full pt-2">
                                {interests.map(interest => (
                                    <button
                                        key={interest}
                                        onClick={() => toggleInterest(interest)}
                                        className={cn(
                                            "h-10 rounded-lg text-[10px] uppercase tracking-widest font-semibold border transition-all",
                                            formData.interests.includes(interest)
                                                ? "bg-[#EF895F] text-white border-[#EF895F]"
                                                : "bg-white/5 text-white/60 border-white/10 hover:border-white/30"
                                        )}
                                    >
                                        {interest}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </article>
                </div>

                <div className="px-8 mt-6">
                    <button 
                        onClick={step === 3 ? handleComplete : handleNext}
                        disabled={step === 1 && (!formData.fullName || !formData.courseAndYear)}
                        className={cn(
                            "w-full h-12 bg-[#EF895F] text-white rounded-xl font-medium tracking-widest text-lg transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-sm",
                            step === 3 && "shadow-[0_4px_20px_rgba(239,137,95,0.4)]"
                        )}
                    >
                        {step === 3 ? 'Get Started' : 'Next'}
                    </button>

                    <div className="flex justify-center gap-1.5 mt-6">
                        {[1, 2, 3].map(i => (
                            <div 
                                key={i}
                                className={cn(
                                    "h-1.5 rounded-full transition-all duration-500",
                                    step === i ? "w-6 bg-white" : "w-2 bg-white/20"
                                )}
                            />
                        ))}
                    </div>

                    {step > 1 && (
                        <button 
                            onClick={handleBack}
                            className="mt-6 text-[10px] text-white/40 uppercase tracking-widest font-bold hover:text-white transition-colors"
                        >
                            Go Back
                        </button>
                    )}
                </div>
            </motion.main>
        </div>
    );
};

const EditProfilePage = () => {
    const { user, updateProfile, addNotification } = useApp();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        courseAndYear: user?.courseAndYear || '',
        bio: user?.bio || '',
        interests: user?.interests || [] as string[]
    });
    const [saving, setSaving] = useState(false);

    const interests = ['Gadgets', 'Books', 'Uniforms', 'Notes', 'Events', 'Food'];

    const toggleInterest = (interest: string) => {
        setFormData(prev => ({
            ...prev,
            interests: prev.interests.includes(interest)
                ? prev.interests.filter(i => i !== interest)
                : [...prev.interests, interest]
        }));
    };

    const handleSave = async () => {
        if (!formData.fullName || !formData.courseAndYear) {
            addNotification("Full name and Course/Year are required.", "error");
            return;
        }
        setSaving(true);
        try {
            await updateProfile(formData);
            addNotification("Profile updated successfully!", "success");
            navigate('/profile');
        } catch (err) {
            addNotification("Failed to update profile.", "error");
        } finally {
            setSaving(false);
        }
    };

    if (!user) return null;

    return (
        <div className="flex-1 px-6 py-10 overflow-y-auto no-scrollbar bg-white min-h-screen">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-muted hover:text-brand-primary transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-text-main">Edit Profile</h1>
                        <p className="text-text-muted text-sm font-medium">Update your campus presence</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="p-6 bg-bg-light rounded-[32px] border border-border-main space-y-4">
                        <h3 className="text-xs font-black text-text-muted uppercase tracking-widest px-1">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider px-1">Full Name</label>
                                <input 
                                    type="text" 
                                    className="w-full h-12 px-4 rounded-2xl bg-white border border-border-main focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none font-medium text-sm"
                                    value={formData.fullName}
                                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider px-1">Course & Year</label>
                                <input 
                                    type="text" 
                                    className="w-full h-12 px-4 rounded-2xl bg-white border border-border-main focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none font-medium text-sm"
                                    value={formData.courseAndYear}
                                    onChange={e => setFormData({ ...formData, courseAndYear: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bio */}
                    <div className="p-6 bg-bg-light rounded-[32px] border border-border-main space-y-4">
                        <h3 className="text-xs font-black text-text-muted uppercase tracking-widest px-1">About You</h3>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider px-1">Bio</label>
                            <textarea 
                                className="w-full h-32 p-4 rounded-2xl bg-white border border-border-main focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none font-medium text-sm resize-none"
                                placeholder="Tell other students about yourself..."
                                value={formData.bio}
                                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Interests */}
                    <div className="p-6 bg-bg-light rounded-[32px] border border-border-main space-y-4">
                        <h3 className="text-xs font-black text-text-muted uppercase tracking-widest px-1">Interests</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {interests.map(interest => (
                                <button
                                    key={interest}
                                    onClick={() => toggleInterest(interest)}
                                    className={cn(
                                        "h-11 rounded-xl text-[10px] uppercase tracking-widest font-black border transition-all",
                                        formData.interests.includes(interest)
                                            ? "bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20"
                                            : "bg-white text-text-muted border-border-main hover:border-brand-primary/30"
                                    )}
                                >
                                    {interest}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4">
                        <button 
                            disabled={saving}
                            onClick={handleSave}
                            className="w-full h-14 bg-brand-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {saving ? 'Updating Profile...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MessagesListPage = () => {
    const { chats, user } = useApp();
    if (!user) return null;

    return (
        <div className="flex-1 px-6 py-6 overflow-y-auto no-scrollbar">
            <h1 className="text-2xl font-bold text-text-main mb-6">Messages</h1>
            <div className="space-y-3">
                {chats.length === 0 ? (
                    <div className="text-center py-12 text-text-muted">
                        <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No messages yet.</p>
                    </div>
                ) : (
                    chats.map(chat => (
                        <div key={chat.id}>
                            <ChatItem chat={chat} currentUserId={user.id} />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const NotificationOverlay = () => {
    const { notifications, removeNotification } = useApp();
    return (
        <div className="fixed top-20 right-6 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-xs">
            <AnimatePresence>
                {notifications.map((notif) => (
                    <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        className={cn(
                            "pointer-events-auto p-4 rounded-2xl border shadow-2xl flex items-start gap-3 backdrop-blur-md",
                            notif.type === 'success' ? "bg-accent-subtle/90 border-brand-primary/20 text-brand-primary" :
                            notif.type === 'error' ? "bg-red-50/90 border-red-200 text-red-800" :
                            "bg-white/90 border-border-main text-text-main"
                        )}
                    >
                        <div className="mt-0.5">
                            {notif.type === 'success' && <ShieldCheck size={18} className="text-green-500" />}
                            {notif.type === 'error' && <AlertCircle size={18} className="text-red-500" />}
                            {notif.type === 'info' && <Sparkles size={18} className="text-blue-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold leading-tight">{notif.message}</p>
                        </div>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notif.id);
                            }}
                            className="p-1 hover:bg-black/5 rounded-lg transition-colors"
                        >
                            <X size={14} className="opacity-50" />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

const TransactionsPage = () => {
    const { transactions, user, updateTransactionStatus } = useApp();
    const navigate = useNavigate();
    const [filter, setFilter] = useState<'buying' | 'selling'>('buying');

    const filtered = transactions.filter(t => 
        filter === 'buying' ? t.buyerId === user?.id : t.sellerId === user?.id
    );

    if (!user) return null;

    return (
        <div className="flex-1 px-4 py-8 overflow-y-auto no-scrollbar bg-[#f8fafc]">
            <div className="max-w-3xl mx-auto space-y-6 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-text-main">Transaction History</h1>
                        <p className="text-text-muted text-sm font-medium">Manage your purchases and campus sales</p>
                    </div>
                </div>

                <div className="flex gap-2 p-1 bg-white rounded-2xl border border-border-main scroll-hidden">
                    <button 
                        onClick={() => setFilter('buying')}
                        className={cn(
                            "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                            filter === 'buying' ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-text-muted hover:text-text-main"
                        )}
                    >
                        Buying
                    </button>
                    <button 
                        onClick={() => setFilter('selling')}
                        className={cn(
                            "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                            filter === 'selling' ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-text-muted hover:text-text-main"
                        )}
                    >
                        Selling
                    </button>
                </div>

                <div className="space-y-4">
                    {filtered.length === 0 ? (
                        <div className="py-20 text-center space-y-4 bg-white rounded-[40px] border border-border-main border-dashed">
                            <div className="w-20 h-20 bg-bg-light rounded-[32px] mx-auto flex items-center justify-center text-text-muted/30">
                                <ShoppingBag size={40} />
                            </div>
                            <div>
                                <p className="text-sm font-black text-text-main uppercase tracking-tight">No {filter} history found</p>
                                <p className="text-xs text-text-muted font-medium mt-1">Transactions will appear here once you buy or sell items.</p>
                            </div>
                        </div>
                    ) : (
                        filtered.map(t => (
                            <div key={t.id} className="bg-white rounded-[32px] p-6 border border-border-main shadow-sm hover:shadow-md transition-all group">
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div 
                                        className="w-24 h-24 rounded-2xl bg-bg-light border border-border-main overflow-hidden flex-shrink-0 cursor-pointer"
                                        onClick={() => navigate(`/listing/${t.listingId}`)}
                                    >
                                        {t.listingImage ? (
                                            <img src={t.listingImage} alt={t.listingTitle} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-text-muted">
                                                <ShoppingBag size={32} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-extrabold text-text-main leading-tight group-hover:text-brand-primary transition-colors cursor-pointer" onClick={() => navigate(`/listing/${t.listingId}`)}>
                                                    {t.listingTitle}
                                                </h3>
                                                <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mt-1">₱{t.amount?.toLocaleString()}</p>
                                            </div>
                                            <div className={cn(
                                                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                                t.status === 'completed' ? "bg-green-50 text-green-600 border-green-100" :
                                                t.status === 'cancelled' ? "bg-red-50 text-red-600 border-red-100" :
                                                "bg-amber-50 text-amber-600 border-amber-100"
                                            )}>
                                                {t.status}
                                            </div>
                                        </div>

                                        {filter === 'selling' && (
                                            <div className="bg-bg-light/50 p-3 rounded-2xl border border-border-main/50 space-y-1">
                                                <div className="flex justify-between text-[10px] font-bold text-text-muted">
                                                    <span>Product Price</span>
                                                    <span>₱{t.amount?.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-[10px] font-bold text-red-500">
                                                    <span>Platform Fee (5%)</span>
                                                    <span>-₱{(t.commissionAmount || t.amount * 0.05).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-[10px] font-black text-brand-primary pt-1 border-t border-dashed border-border-main">
                                                    <span>Your Earnings</span>
                                                    <span>₱{(t.sellerEarnings || t.amount * 0.95).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border-main/50">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-brand-primary/40 animate-pulse"></div>
                                                <p className="text-[10px] text-text-muted font-bold">
                                                    {filter === 'buying' ? 'Seller' : 'Buyer'}: <span className="text-text-main">{filter === 'buying' ? t.sellerName : t.buyerName}</span>
                                                </p>
                                            </div>
                                            <p className="text-[10px] text-text-muted font-bold">
                                                Method: <span className="text-text-main uppercase">{t.paymentMethod?.replace(/_/g, ' ')}</span>
                                            </p>
                                            <p className="text-[10px] text-text-muted font-bold">
                                                Date: <span className="text-text-main">{new Date(t.createdAt).toLocaleDateString()}</span>
                                            </p>
                                        </div>

                                        {filter === 'selling' && t.status === 'pending' && (
                                            <div className="flex gap-2 pt-4">
                                                <button 
                                                    onClick={() => updateTransactionStatus(t.id, 'completed')}
                                                    className="flex-1 py-3 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                                                >
                                                    Confirm Completion
                                                </button>
                                                <button 
                                                    onClick={() => updateTransactionStatus(t.id, 'cancelled')}
                                                    className="px-6 py-3 border border-red-100 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const TutorialManager = () => {
  const { user } = useApp();
  const location = useLocation();
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('campusListingTutorialSeen');
    // Only show tutorial on market page if user is logged in AND on desktop
    if (!hasSeenTutorial && user && location.pathname === '/market' && window.innerWidth >= 1024) {
      const timer = setTimeout(() => setShowTutorial(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user, location.pathname]);

  const tutorialSteps = [
    {
      targetId: "market-grid",
      title: "The Marketplace",
      content: "Browse all active listings from fellow students. You can filter by category or price using the tabs above.",
    },
    {
      targetId: window.innerWidth < 1024 ? (window.innerWidth < 768 ? "sell-tab" : "market-grid") : "seller-hub-widget",
      title: "Start Selling",
      content: "Ready to declutter? Complete your verification to start posting your own items.",
    },
    {
      targetId: window.innerWidth < 1024 ? (window.innerWidth < 768 ? "mobile-tabs" : "sidebar-nav") : "sidebar-nav",
      title: "Easy Navigation",
      content: "Quickly jump between categories, your favorites, and your profile using the side menu.",
    },
    {
      targetId: "navbar",
      title: "Quick Access",
      content: "Use the search bar to find specific items or check your notifications and messages here.",
    }
  ];

  const handleTutorialComplete = () => {
    localStorage.setItem('campusListingTutorialSeen', 'true');
    setShowTutorial(false);
  };

  return (
    <SpotlightTutorial 
      isActive={showTutorial}
      steps={tutorialSteps}
      onComplete={handleTutorialComplete}
      onSkip={handleTutorialComplete}
    />
  );
};

const AppContent = () => {
  const { loading, user } = useApp();

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <LoadingAnimation />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen"
        >
          <Router>
            <NotificationOverlay />
            <TutorialManager />
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/onboarding" element={
                  user ? <OnboardingPage /> : <Navigate to="/login" replace />
                } />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/*" element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-bg-light font-sans pt-16">
                      <Navbar />
                      <div className="flex max-w-[1280px] mx-auto h-[calc(100vh-64px)] overflow-hidden">
                        <Sidebar />
                        <main className="flex-1 flex flex-col pb-20 md:pb-0 overflow-hidden relative">
                          <Routes>
                            <Route path="/" element={<Navigate to="/market" replace />} />
                            <Route path="/market" element={<HomePage />} />
                            <Route path="/categories" element={<CategoriesPage />} />
                            <Route path="/favorites" element={<FavoritesPage />} />
                            <Route path="/sell" element={<SellPage />} />
                            <Route path="/profile" element={<ProfilePage />} />
                            <Route path="/profile/:id" element={<PublicProfilePage />} />
                            <Route path="/purchases" element={<TransactionsPage />} />
                            <Route path="/verify" element={<VerificationPage />} />
                            <Route path="/listing/:id" element={<ListingDetail />} />
                            <Route path="/chat/:id" element={<ChatPage />} />
                            <Route path="/messages" element={<MessagesListPage />} />
                            <Route path="/edit-profile" element={<EditProfilePage />} />
                            <Route path="/dashboard" element={<SellerDashboardPage />} />
                          </Routes>
                        </main>
                        <RightPanel />
                      </div>
                      <MobileTabs />
                    </div>
                  </ProtectedRoute>
                } />
              </Routes>
            </AnimatePresence>
          </Router>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useApp();
  const location = useLocation();

  if (loading) return <LoadingAnimation />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  
  // If user is authenticated but not onboarded, they must go to onboarding
  if (user && !user.onboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
