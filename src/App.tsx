import React, { useState, useEffect, useContext, createContext } from 'react';
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
  CheckCircle
} from 'lucide-react';
import { UserProfile, Listing, Chat, ChatMessage, Review, SellerApplication } from './types';
import { cn, compressImage } from './lib/utils';
import { generateListingDetails } from './services/geminiService';
import { LandingPage } from './components/LandingPage';
import { SellerDashboard } from './components/SellerDashboard';
import { LoadingAnimation } from './components/LoadingAnimation';
import { supabase } from './lib/supabase';
import { uploadProductImage } from './services/productService';

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
  deleteDoc,
  getDocFromServer,
  increment
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
  createChat: (listing: Listing) => string;
  sendMessage: (chatId: string, text: string) => void;
  replyToReview: (reviewId: string, text: string) => void;
  archiveReview: (reviewId: string) => void;
  reportReview: (reviewId: string, reason: string) => void;
  sellerApplication: SellerApplication | null;
  submitSellerApplication: (data: Omit<SellerApplication, 'userId' | 'status' | 'createdAt'>) => Promise<void>;
  notifications: {id: string, message: string, type: 'info' | 'success' | 'error'}[];
  removeNotification: (id: string) => void;
  addNotification: (message: string, type: 'info' | 'success' | 'error') => void;
  isSupabaseConnected: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

// --- Components ---

const Navbar = () => {
  const { user, search, setSearch } = useApp();
  const [showSearch, setShowSearch] = useState(false);
  const location = useLocation();

  if (!user) return null;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-border-main z-50">
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
              placeholder="Search items..." 
              value={search}
              autoFocus={showSearch}
              onBlur={() => search === '' && setShowSearch(false)}
              onChange={(e) => setSearch(e.target.value)}
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
          <Link to="/profile" className="w-8 h-8 rounded-full bg-accent-subtle border border-border-main flex items-center justify-center font-semibold text-brand-primary text-sm uppercase">
            {user.fullName[0]}
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
    <aside className="w-[240px] bg-white border-r border-border-main p-6 sticky top-16 h-[calc(100vh-64px)] hidden md:flex flex-col flex-shrink-0">
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

      <div className="campus-gradient p-4 rounded-xl text-white mt-auto">
        <p className="font-bold text-sm mb-1">📍 Plsp University</p>
        <p className="text-[10px] opacity-80 font-medium">Verified Campus Only Environment</p>
      </div>
    </aside>
  );
};

const RightPanel = () => {
  const { user, listings } = useApp();
  const navigate = useNavigate();

  return (
    <aside className="w-[300px] bg-white border-l border-border-main p-6 sticky top-16 h-[calc(100vh-64px)] hidden lg:flex flex-col gap-6 overflow-y-auto flex-shrink-0">
      {/* AI Assistant Widget */}
      <div className="bg-accent-subtle border border-dashed border-brand-primary rounded-xl p-4">
        <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-3 flex items-center gap-1.5 font-sans">
          <Sparkles size={14} className="text-brand-primary" /> AI Listing Assistant
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-text-muted uppercase mb-1 block">Quick Description</label>
            <textarea 
              placeholder="e.g. used iPad Pro, good condition..."
              className="w-full h-16 p-2 bg-white rounded-lg border border-border-main text-xs focus:outline-none focus:border-brand-primary"
            />
          </div>
          <button 
            onClick={() => navigate('/sell')}
            className="w-full py-2 bg-brand-primary text-white text-xs font-bold rounded-lg hover:bg-brand-primary-hover transition-colors shadow-sm"
          >
            Go to Seller Hub
          </button>
        </div>
      </div>

      {/* Seller Hub / Verification Widget */}
      <div className={cn(
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
            <p className="text-[11px] text-text-muted">Complete verification to start posting items to Plsp University.</p>
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
      <div className="mt-auto pt-6 border-t border-border-main">
         <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-3 font-sans">
          Recently Messaged
        </h3>
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center text-brand-primary font-bold text-[10px]">AS</div>
          <p className="text-[11px] font-medium text-text-main group-hover:text-brand-primary transition-colors">Alex Smith (Organic Chem Book)</p>
        </div>
      </div>
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
          <p className="text-[10px] text-text-muted mt-auto pt-2 flex items-center gap-1">
            {listing.sellerName} 
            {listing.sellerRating && (
              <span className="flex items-center gap-0.5 text-amber-500">
                • <Star size={10} fill="currentColor" /> {listing.sellerRating.toFixed(1)}
              </span>
            )}
            • {new Date(listing.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
        </div>
      </Link>
    </motion.div>
  );
};

const MobileTabs = () => {
  const location = useLocation();
  const navItems = [
    { icon: ShoppingBag, path: '/market' },
    { icon: PlusCircle, path: '/sell' },
    { icon: MessageSquare, path: '/messages' },
    { icon: User, path: '/profile' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border-main flex justify-around p-3 pb-safe z-50">
      {navItems.map(({ icon: Icon, path }) => (
        <Link 
          key={path} 
          to={path}
          className={cn(
            "p-2 rounded-xl transition-colors",
            location.pathname === path ? "bg-accent-subtle text-brand-primary" : "text-text-muted"
          )}
        >
          <Icon size={24} />
        </Link>
      ))}
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

  const filteredListings = listings.filter(l => {
    const matchesSearch = l.title.toLowerCase().includes(search.toLowerCase()) ||
                          l.category.toLowerCase().includes(search.toLowerCase());
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

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
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
  const themePrimaryColor = "#00D285";
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
  const { user, logout } = useApp();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="flex-1 px-6 py-6 overflow-y-auto no-scrollbar">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-main">Your Account</h1>
          <button 
            onClick={logout} 
            className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-all text-xs font-bold"
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-border-main mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="w-24 h-24 rounded-3xl bg-accent-subtle border-2 border-brand-primary flex items-center justify-center text-brand-primary text-4xl font-black">
              {user.fullName[0]}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-text-main mb-1">{user.fullName}</h2>
              <p className="text-text-muted text-sm font-medium mb-1">{user.courseAndYear}</p>
              {user.bio && <p className="text-text-main text-xs mb-3 italic">"{user.bio}"</p>}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {user.isVerified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-full border border-green-200">
                    <ShieldCheck size={12} /> VERIFIED CAMPUS SELLER
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-bg-light text-text-muted text-[10px] font-bold rounded-full border border-border-main">
                    STUDENT BUYER ACCOUNT
                  </span>
                )}
                <span className="px-3 py-1 bg-accent-subtle text-brand-primary text-[10px] font-bold rounded-full border border-brand-primary/10">
                  SINCE {new Date(user.createdAt).getFullYear()}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-border-main grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-text-main">0</p>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Posts</p>
            </div>
            <div>
               <p className="text-xl font-bold text-text-main">0</p>
               <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Sold</p>
            </div>
            <div>
               <p className="text-xl font-bold text-text-main">5.0</p>
               <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Rating</p>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {!user.isVerified && user.verificationStatus === 'none' && (
            <motion.div 
              whileHover={{ y: -4 }}
              className="p-6 bg-brand-primary rounded-3xl text-white relative overflow-hidden shadow-xl shadow-brand-primary/20 cursor-pointer"
              onClick={() => navigate('/verify')}
            >
              <div className="relative z-10">
                <h3 className="font-bold text-lg mb-1">Start Selling</h3>
                <p className="text-white/80 text-xs mb-4 max-w-[180px]">Join 500+ student sellers on CampusMarket tonight.</p>
                <div className="inline-flex items-center gap-2 px-5 py-2 bg-white text-brand-primary rounded-xl font-bold text-[11px] shadow-sm">
                  Get Verified <ChevronRight size={14} />
                </div>
              </div>
              <ShoppingBag className="absolute -bottom-6 -right-6 w-32 h-32 text-white/10 rotate-12" />
            </motion.div>
          )}

          {user.verificationStatus === 'pending' && (
             <div className="p-6 bg-amber-50 rounded-3xl border border-amber-200 text-amber-800">
               <h3 className="font-bold text-lg mb-1">Verification Processing</h3>
               <p className="text-xs opacity-80 mb-4">We're reviewing your Student ID. This typically takes 12-24 hours. Check back soon!</p>
               <div className="flex items-center gap-2 text-[10px] font-black uppercase">
                 <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                 Status: Under Review
               </div>
             </div>
          )}

          {user.verificationStatus === 'rejected' && (
             <div className="p-6 bg-red-50 rounded-3xl border border-red-200 text-red-800 cursor-pointer" onClick={() => navigate('/verify')}>
               <h3 className="font-bold text-lg mb-1">Verification Rejected</h3>
               <p className="text-xs opacity-80 mb-4">Your ID could not be verified. Tap here to try submitting again with a clearer photo.</p>
               <div className="flex items-center gap-2 text-[10px] font-black uppercase">
                 <div className="w-2 h-2 rounded-full bg-red-500"></div>
                 Status: Rejected
               </div>
             </div>
          )}

          <div className="p-6 bg-accent-subtle rounded-3xl border border-border-main flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg text-brand-primary mb-1">Student Perks</h3>
              <p className="text-text-muted text-xs">Unlock exclusive campus deals and group buying features.</p>
            </div>
            <button className="mt-4 text-brand-primary text-xs font-bold flex items-center gap-1 hover:underline">
              See All Perks <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest pl-2 mb-4">Account Settings</h3>
          {[
            { icon: Heart, label: 'Manage Favorites', path: '/favorites' },
            { icon: ShoppingBag, label: 'Transaction History', path: '/purchases' },
            { icon: ShieldCheck, label: 'Privacy & Security', path: '/settings' },
          ].map(({ icon: Icon, label, path }) => (
            <Link 
              key={path}
              to={path}
              className="flex items-center justify-between p-4 bg-white rounded-2xl border border-border-main hover:border-brand-primary hover:bg-bg-light transition-all shadow-sm group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-bg-light flex items-center justify-center text-text-muted group-hover:bg-brand-primary group-hover:text-white transition-all">
                  <Icon size={18} />
                </div>
                <span className="font-bold text-text-main text-sm">{label}</span>
              </div>
              <ChevronRight size={18} className="text-text-muted group-hover:translate-x-1 transition-transform" />
            </Link>
          ))}
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
    image: null as string | null
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitSellerApplication({
        fullName: formData.fullName,
        school: formData.courseAndYear,
        contactLink: formData.contactDetails,
        photoURL: formData.image || 'uploaded_image_url', // In a real app, this would be a Storage URL
      });
      navigate('/profile');
    } catch (err) {
      console.error(err);
      alert("Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role === 'seller' || user?.verificationStatus === 'approved') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-bg-light">
        <div className="bg-white p-10 rounded-[40px] border border-border-main shadow-xl max-w-sm w-full space-y-6">
          <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
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
                {formData.image ? (
                  <img src={formData.image} alt="ID Preview" className="w-full h-full object-cover" />
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
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) setFormData({...formData, image: URL.createObjectURL(file)});
                  }}
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
  const { user, addListing } = useApp();
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
    tags: [] as string[]
  });

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
      tags: formData.tags,
      images: [] // images handled inside addListing
    }, imageFiles);
    
    // Auto-navigate immediately to Home Feed for "instant" feel
    navigate('/');
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
    const { listings, user, createChat, deleteListing, markAsSold } = useApp();
    const navigate = useNavigate();
    const listing = listings.find(l => l.id === id);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
  
    useEffect(() => {
      if (id && user && listing && listing.sellerId !== user.id) {
        // Increment views
        const listingRef = doc(db, 'listings', id);
        updateDoc(listingRef, {
          views: increment(1)
        }).catch(console.error);
      }
    }, [id, user?.id]);
  
    if (!listing) return null;

  const handleMessage = () => {
    const chatId = createChat(listing);
    navigate(`/chat/${chatId}`);
  };

  const images = listing.images.length > 0 ? listing.images : [`https://picsum.photos/seed/${listing.id}/800/800`];

  return (
    <div className="flex-1 px-6 py-6 overflow-y-auto no-scrollbar max-w-4xl mx-auto w-full">
       <button onClick={() => navigate(-1)} className="mb-6 p-2 bg-white rounded-xl border border-border-main shadow-sm flex items-center gap-2 text-sm font-medium hover:bg-bg-light transition-colors">
        <ArrowLeft size={18} /> Back to Market
      </button>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="aspect-square rounded-3xl overflow-hidden bg-bg-light border border-border-main">
            <img 
              src={images[activeImageIndex]} 
              alt={listing.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-all duration-300"
            />
          </div>
          
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={cn(
                    "aspect-square rounded-xl overflow-hidden border-2 transition-all",
                    activeImageIndex === idx ? "border-brand-primary ring-2 ring-brand-primary/20 scale-95" : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <img src={img} alt={`${listing.title} ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 space-y-6">
          <div>
            <span className="px-3 py-1 bg-accent-subtle text-brand-primary rounded-full text-xs font-bold uppercase tracking-wider">
              {listing.category}
            </span>
            <h1 className="text-3xl font-bold text-text-main mt-2">{listing.title}</h1>
            <p className="text-3xl font-black text-brand-primary mt-2">₱{listing.price.toLocaleString()}</p>
          </div>

          <div className="p-4 bg-bg-light rounded-2xl flex items-center justify-between border border-border-main">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center font-bold text-brand-primary border border-border-main shadow-sm text-xl uppercase">
                {listing.sellerName[0]}
              </div>
              <div>
                <p className="font-bold text-text-main">{listing.sellerName}</p>
                <p className="text-xs text-text-muted">Student Seller</p>
              </div>
            </div>
            <Link to={`/profile/${listing.sellerId}`} className="text-brand-primary font-bold text-xs hover:underline">
              View Profile
            </Link>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-text-main">Description</h3>
            <p className="text-text-muted leading-relaxed whitespace-pre-wrap">{listing.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {listing.tags.map(tag => (
              <span key={tag} className="px-3 py-1 bg-white border border-border-main text-text-muted rounded-full text-[10px] font-medium">#{tag}</span>
            ))}
          </div>

          {user?.id !== listing.sellerId ? (
            <div className="flex gap-3">
              <button 
                onClick={handleMessage}
                className="flex-1 py-4 bg-brand-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/10 hover:bg-brand-primary-hover transition-colors"
              >
                <MessageSquare size={20} /> Chat Seller
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <p className="text-xs text-amber-800 font-bold flex items-center gap-2">
                  <AlertCircle size={14} /> Seller Controls
                </p>
                <p className="text-[10px] text-amber-700 mt-1">You are the owner of this listing. You can manage it from here.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this listing?')) {
                      deleteListing(listing.id);
                      navigate('/');
                    }
                  }}
                  className="flex-1 py-4 border-2 border-red-500 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-50"
                >
                  <Trash2 size={20} /> Delete Product
                </button>
                <button 
                  onClick={() => markAsSold(listing.id)}
                  disabled={listing.status === 'sold'}
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle size={20} /> {listing.status === 'sold' ? 'Sold Out' : 'Mark as Sold'}
                </button>
              </div>
            </div>
          )}
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
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(true);
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
        if (error.message?.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
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
          verificationStatus: 'none',
          createdAt: serverTimestamp()
        };
        await setDoc(userRef, profileData);
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
      setListings(data);
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
       console.error("Application sync error:", error);
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
      const data = snapshot.docs.map(d => ({ 
        ...d.data(), 
        id: d.id, 
        lastMessageAt: toMillis(d.data().lastMessageAt) 
      } as Chat));
      setChats(data);
    }, (error) => {
      console.error("Chats sync error:", error);
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

  const logout = async () => {
    await signOut(auth);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, data);
      setUser({ ...user, ...data });
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
      // 1. Update Firebase
      await updateDoc(doc(db, 'listings', listingId), {
        status: 'sold',
        updatedAt: serverTimestamp()
      });

      // 2. Mirror to Supabase
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
      const existing = chats.find(c => c.listingId === listing.id && c.participants.includes(user.id));
      if (existing) return existing.id;

      const chatRef = await addDoc(collection(db, 'chats'), {
        participants: [user.id, listing.sellerId],
        listingId: listing.id,
        listingTitle: listing.title,
        lastMessage: 'Started a chat',
        lastMessageAt: serverTimestamp()
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
        lastMessageAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, 'create', `chats/${chatId}/messages`);
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

  const submitSellerApplication = async (data: Omit<SellerApplication, 'userId' | 'status' | 'createdAt'>) => {
    if (!user) return;
    try {
      // 1. Save to sellerApplications collection as requested
      const appRef = doc(db, 'sellerApplications', user.id);
      await setDoc(appRef, {
        ...data,
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
      user, loading, listings, myListings, favorites, reviews, chats, messages, search, setSearch, listingsLoading,
      login, logout, updateProfile, addListing, updateListing, deleteListing, markAsSold, toggleFavorite, createChat, sendMessage,
      replyToReview, archiveReview, reportReview,
      sellerApplication, submitSellerApplication,
      notifications, addNotification, removeNotification,
      isSupabaseConnected
    }}>
      {children}
    </AppContext.Provider>
  );
};

// --- Main App Wrapper ---

import { useParams } from 'react-router-dom';

const ChatPage = () => {
    const { id } = useParams<{ id: string }>();
    const { chats, sendMessage, user } = useApp();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState('');
    const chat = chats.find(c => c.id === id);
    const navigate = useNavigate();

    useEffect(() => {
        if (!id) return;
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
    }, [id]);

    if (!chat || !user) return null;

    return (
        <div className="h-screen flex flex-col bg-white">
            <div className="p-4 border-b flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
                    <ArrowLeft size={24} />
                </button>
                <div>
                   <h2 className="font-bold text-slate-800">{chat.listingTitle}</h2>
                   <p className="text-xs text-slate-500">Messaging Seller</p>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(m => (
                    <div key={m.id} className={cn(
                        "max-w-[80%] p-3 rounded-2xl text-sm font-medium",
                        m.senderId === user.id ? "ml-auto bg-brand-primary text-white rounded-tr-none shadow-sm" : "bg-bg-light text-text-main border border-border-main rounded-tl-none"
                    )}>
                        {m.text}
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-border-main pb-safe">
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
                        <Link 
                            key={chat.id} 
                            to={`/chat/${chat.id}`}
                            className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-border-main shadow-sm hover:border-brand-primary active:scale-[0.98] transition-all"
                        >
                            <div className="w-12 h-12 rounded-xl bg-accent-subtle flex items-center justify-center text-brand-primary font-bold border border-border-main">
                                {chat.listingTitle[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-text-main truncate">{chat.listingTitle}</h3>
                                <p className="text-[13px] text-text-muted truncate font-medium">{chat.lastMessage}</p>
                            </div>
                            <span className="text-[10px] text-text-muted font-bold whitespace-nowrap">
                                {new Date(chat.lastMessageAt || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </Link>
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
                            notif.type === 'success' ? "bg-green-50/90 border-green-200 text-green-800" :
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

const AppContent = () => {
  const { loading } = useApp();

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
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/*" element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-bg-light font-sans pt-16">
                      <Navbar />
                      <div className="flex max-w-[1280px] mx-auto min-h-[calc(100vh-64px)]">
                        <Sidebar />
                        <main className="flex-1 flex flex-col pb-20 md:pb-0 overflow-y-auto">
                          <Routes>
                            <Route path="/" element={<Navigate to="/market" replace />} />
                            <Route path="/market" element={<HomePage />} />
                            <Route path="/categories" element={<CategoriesPage />} />
                            <Route path="/favorites" element={<FavoritesPage />} />
                            <Route path="/sell" element={<SellPage />} />
                            <Route path="/profile" element={<ProfilePage />} />
                            <Route path="/verify" element={<VerificationPage />} />
                            <Route path="/listing/:id" element={<ListingDetail />} />
                            <Route path="/chat/:id" element={<ChatPage />} />
                            <Route path="/messages" element={<MessagesListPage />} />
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
  if (loading) return <LoadingAnimation />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};
