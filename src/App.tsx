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
  Sparkles
} from 'lucide-react';
import { UserProfile, Listing, Chat, ChatMessage } from './types';
import { cn } from './lib/utils';
import { generateListingDetails } from './services/geminiService';

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
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';

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
  favorites: string[];
  chats: Chat[];
  messages: ChatMessage[];
  search: string;
  setSearch: (query: string) => void;
  login: () => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<UserProfile>) => void;
  addListing: (listing: Omit<Listing, 'id' | 'createdAt'>) => void;
  toggleFavorite: (listingId: string) => void;
  createChat: (listing: Listing) => string;
  sendMessage: (chatId: string, text: string) => void;
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
            <Link to="/" className="text-xl md:text-2xl font-extrabold text-brand-primary tracking-tight whitespace-nowrap">CampusMarket</Link>
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
  const navItems = [
    { icon: Home, label: 'Home Feed', path: '/' },
    { icon: Filter, label: 'Categories', path: '/categories' },
    { icon: Heart, label: 'Favorites', path: '/favorites' },
    { icon: ShoppingBag, label: 'My Orders', path: '/purchases' },
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
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
        user?.isVerified ? "bg-white border-border-main" : "bg-accent-yellow border-border-yellow"
      )}>
        <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-3 flex items-center gap-1.5 font-sans">
          <ShieldCheck size={14} className={user?.isVerified ? "text-green-500" : "text-brand-primary"} /> 
          Seller Dashboard
        </h3>
        {user?.isVerified ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-text-main">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Verified Seller
            </div>
            <p className="text-[11px] text-text-muted">You have 0 active listings.</p>
            <button 
              onClick={() => navigate('/sell')}
              className="w-full py-2 border border-border-main text-xs font-bold rounded-lg hover:bg-bg-light transition-colors mt-2"
            >
              Post New Item
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
          <img 
            src={listing.images[0] || `https://picsum.photos/seed/${listing.id}/400/400`} 
            alt={listing.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
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
    { icon: Home, path: '/' },
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

const HomePage = () => {
  const { listings, search } = useApp();
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
        {filteredListings.length > 0 ? (
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

const themes = [
  { background: "#1A1A2E", color: "#FFFFFF", primaryColor: "#0F3460" },
  { background: "#461220", color: "#FFFFFF", primaryColor: "#E94560" },
  { background: "#192A51", color: "#FFFFFF", primaryColor: "#967AA1" },
  { background: "#F7B267", color: "#000000", primaryColor: "#F4845F" },
  { background: "#F25F5C", color: "#000000", primaryColor: "#642B36" },
  { background: "#231F20", color: "#FFFFFF", primaryColor: "#BB4430" },
  { background: "#FAFDFB", color: "#064e3b", primaryColor: "#10b981" } // Added Mint Theme
];

const LoginPage = () => {
  const { login, user } = useApp();
  const [loggingIn, setLoggingIn] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(themes[6]); // Default to Mint

  if (user) return <Navigate to="/" replace />;

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

  const isDarkTheme = theme.color === '#FFFFFF';

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden transition-colors duration-500 font-sans"
      style={{ backgroundColor: theme.background, color: theme.color }}
    >
      {/* Dynamic Background Circles - Soft Ambient Glow */}
      <div 
        className="absolute w-48 h-48 md:w-72 md:h-72 rounded-full opacity-40 blur-[80px] top-0 left-0 animate-pulse transition-all duration-1000"
        style={{ backgroundColor: theme.primaryColor, transform: 'translate(-20%, -20%)' }}
      ></div>
      <div 
        className="absolute w-64 h-64 md:w-96 md:h-96 rounded-full opacity-20 blur-[100px] bottom-0 right-0 transition-all duration-1000"
        style={{ backgroundColor: theme.primaryColor, transform: 'translate(20%, 20%)' }}
      ></div>

      <div className="relative w-full max-w-[420px] z-10 py-8">
        {/* Floating Accent Circles - Responsive Position */}
        <div 
          className="absolute -top-12 -left-12 w-24 h-24 md:w-32 md:h-32 rounded-full z-[-1] hidden sm:block transition-all duration-700 shadow-2xl"
          style={{ backgroundColor: theme.primaryColor, opacity: 0.8 }}
        ></div>
        <div 
          className="absolute -bottom-12 -right-12 w-24 h-24 md:w-32 md:h-32 rounded-full z-[-1] hidden sm:block transition-all duration-700 shadow-2xl"
          style={{ backgroundColor: theme.primaryColor, opacity: 0.8 }}
        ></div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative backdrop-blur-2xl border rounded-[2rem] p-5 sm:p-7 md:p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden"
          style={{ 
            backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Header Section - More Compact */}
          <div className="flex flex-col items-center mb-4 sm:mb-6">
            <div className="w-full max-w-[120px] sm:max-w-[150px] mb-3">
              <img 
                src="https://raw.githubusercontent.com/hicodersofficial/glassmorphism-login-form/master/assets/illustration.png" 
                alt="CampusMarket" 
                className="w-full h-auto drop-shadow-xl animate-float"
              />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-center tracking-[0.15em] opacity-80 uppercase leading-none">
              {mode === 'signup' ? 'Sign Up' : 'Sign In'}
            </h1>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3 sm:space-y-4">
            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={loggingIn}
              className="w-full py-3.5 rounded-xl border-2 border-current border-opacity-20 flex items-center justify-center gap-3 hover:bg-current hover:bg-opacity-10 transition-all text-xs font-black tracking-[2px] disabled:opacity-50 uppercase mb-4 shadow-xl"
              style={{ borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0,0,0,0.1)' }}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 shadow-sm" />
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
                className="w-full py-3 sm:py-3.5 px-4 rounded-xl outline-none text-[11px] sm:text-xs font-bold tracking-widest placeholder:text-inherit placeholder:opacity-40 backdrop-blur-md transition-all border"
                style={{ 
                  color: theme.color,
                  backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
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
                className="w-full py-3 sm:py-3.5 px-4 rounded-xl outline-none text-[11px] sm:text-xs font-bold tracking-widest placeholder:text-inherit placeholder:opacity-40 backdrop-blur-md transition-all border"
                style={{ 
                  color: theme.color,
                  backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }}
              />
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-[9px] font-black text-center uppercase tracking-wider" 
                style={{ color: theme.color === '#000000' ? '#C62828' : '#FFAB91' }}
              >
                {error}
              </motion.p>
            )}

            <button 
              type="submit"
              disabled={loggingIn}
              className="w-full py-3.5 rounded-xl text-xs sm:text-sm font-black tracking-[2px] transition-all duration-300 hover:brightness-110 active:scale-95 shadow-lg disabled:opacity-50 mt-1"
              style={{ backgroundColor: theme.primaryColor, color: theme.color === '#FFFFFF' ? '#FFFFFF' : '#000000' }}
            >
              {loggingIn ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : (
                mode === 'signup' ? 'REGISTER' : 'ENTER'
              )}
            </button>
          </form>

          <footer className="mt-4 flex flex-col items-center">
            <div className="flex justify-between w-full text-[8px] sm:text-[9px] font-bold tracking-widest opacity-50 px-1">
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

      {/* Responsive Theme Panel */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-10 sm:translate-x-0 flex gap-2.5 p-2 bg-white bg-opacity-10 backdrop-blur-2xl rounded-2xl border border-white border-opacity-10 z-20 shadow-xl overflow-x-auto no-scrollbar max-w-[90vw]">
        {themes.map((t, idx) => (
          <button
            key={idx}
            onClick={() => setTheme(t)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl border-2 border-white border-opacity-30 hover:scale-110 active:scale-90 transition-all flex-shrink-0"
            style={{ backgroundColor: t.background }}
          />
        ))}
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
  const { user, updateProfile } = useApp();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { image, ...profileData } = formData;
    updateProfile({
      ...profileData,
      verificationStatus: 'pending',
      studentIdImage: image || 'uploaded_image_url'
    });
    navigate('/profile');
  };

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
                <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1">University Email (@edu.ph)</label>
                <input 
                  required
                  type="email"
                  placeholder="name@university.edu"
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
                  placeholder="20XX-XXXXX-XX-0"
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
            className="w-full py-4 bg-brand-primary text-white rounded-2xl font-black shadow-xl shadow-brand-primary/20 hover:bg-brand-primary-hover active:scale-[0.98] transition-all"
          >
            Submit for Review
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
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    description: '',
    category: 'Others',
    tags: [] as string[]
  });

  if (!user?.isVerified) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-accent-subtle text-brand-primary rounded-3xl flex items-center justify-center mb-6">
          <ShieldCheck size={40} />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-text-main">Seller Verification Required</h1>
        <p className="text-text-muted mb-8 max-w-sm">You need to be a verified student seller to post items in the marketplace.</p>
        <Link to="/verify" className="px-8 py-3 bg-brand-primary text-white rounded-xl font-bold shadow-lg scale-100 active:scale-95 transition-all">
          Verify My Account
        </Link>
      </div>
    );
  }

  const handleAIHelp = async () => {
    if (!formData.description) return;
    setLoading(true);
    try {
      const suggested = await generateListingDetails(formData.description);
      setFormData({
        ...formData,
        title: suggested.title,
        price: suggested.suggestedPrice.toString(),
        description: suggested.description,
        category: suggested.category,
        tags: suggested.tags
      });
    } catch (e) {
      alert("AI Assistant failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addListing({
      title: formData.title,
      price: parseFloat(formData.price),
      description: formData.description,
      category: formData.category,
      images: [], // In real app, upload multiple images
      sellerId: user.id,
      sellerName: user.fullName,
      status: 'active',
      tags: formData.tags
    });
    navigate('/market');
  };

  return (
    <div className="flex-1 px-6 py-6 overflow-y-auto no-scrollbar">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-main">Sell Item</h1>
        <button 
          onClick={handleAIHelp}
          disabled={loading || !formData.description}
          className="flex items-center gap-2 px-4 py-2 bg-accent-subtle text-brand-primary rounded-full text-xs font-bold hover:bg-brand-primary/10 transition-colors disabled:opacity-50"
        >
          <Sparkles size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Thinking..." : "AI Assistant"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-border-main shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Item Title</label>
            <input 
              required
              placeholder="e.g. MacBook Pro M1 2020"
              className="w-full h-11 px-4 rounded-xl bg-bg-light border border-border-main focus:bg-white focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all font-semibold outline-none"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-text-main mb-1">Price (₱)</label>
              <input 
                required
                type="number"
                placeholder="0.00"
                className="w-full h-11 px-4 rounded-xl bg-bg-light border border-border-main focus:bg-white focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all font-bold outline-none"
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-main mb-1">Category</label>
              <select 
                className="w-full h-11 px-4 rounded-xl bg-bg-light border border-border-main focus:bg-white focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all outline-none"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                {['Gadgets', 'Books', 'Uniforms', 'Services', 'Others'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Description</label>
            <p className="text-[10px] text-text-muted mb-2 font-medium">Pro tip: Write a short note and click AI Assistant to polish it!</p>
            <textarea 
              required
              placeholder="Briefly describe what you're selling..."
              className="w-full p-4 rounded-xl bg-bg-light border border-border-main focus:bg-white focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all min-h-[150px] outline-none"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-main mb-2">Item Photos</label>
            <div className="flex gap-2">
              <div className="w-20 h-20 rounded-xl bg-bg-light border-2 border-dashed border-border-main flex items-center justify-center text-text-muted hover:text-brand-primary hover:border-brand-primary/50 cursor-pointer transition-all">
                <Camera size={24} />
              </div>
            </div>
          </div>
        </div>

        <button 
          type="submit"
          className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-primary-hover transition-colors"
        >
          Post Listing
        </button>
      </form>
    </div>
  );
};

const ListingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { listings, user, createChat } = useApp();
  const navigate = useNavigate();
  const listing = listings.find(l => l.id === id);

  if (!listing) return null;

  const handleMessage = () => {
    const chatId = createChat(listing);
    navigate(`/chat/${chatId}`);
  };

  return (
    <div className="flex-1 px-6 py-6 overflow-y-auto no-scrollbar max-w-4xl mx-auto w-full">
       <button onClick={() => navigate(-1)} className="mb-6 p-2 bg-white rounded-xl border border-border-main shadow-sm flex items-center gap-2 text-sm font-medium hover:bg-bg-light transition-colors">
        <ArrowLeft size={18} /> Back to Market
      </button>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="aspect-square rounded-3xl overflow-hidden bg-bg-light border border-border-main">
          <img 
            src={listing.images[0] || `https://picsum.photos/seed/${listing.id}/800/800`} 
            alt={listing.title}
            className="w-full h-full object-cover"
          />
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

          {user?.id !== listing.sellerId && (
            <div className="flex gap-3">
              <button 
                onClick={handleMessage}
                className="flex-1 py-4 bg-brand-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/10 hover:bg-brand-primary-hover transition-colors"
              >
                <MessageSquare size={20} /> Chat Seller
              </button>
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
  const [listings, setListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages] = useState<ChatMessage[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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
    // Explicitly set persistence to local to speed up re-entry
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // Optimistically set a partial user to show UI faster
        setUser(prev => prev || ({
          id: fbUser.uid,
          email: fbUser.email || '',
          fullName: fbUser.displayName || 'CAMPUS STUDENT',
          courseAndYear: '',
          role: 'buyer',
          isVerified: false,
          verificationStatus: 'none',
          createdAt: Date.now()
        } as UserProfile));

        // Sync user profile from Firestore in the background
        const userRef = doc(db, 'users', fbUser.uid);
        
        try {
          // Use a faster getDoc (cached if available)
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const data = userSnap.data();
            setUser({ ...data, createdAt: toMillis(data.createdAt), id: fbUser.uid } as UserProfile);
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
            setUser({ ...profileData, id: fbUser.uid, createdAt: Date.now() } as any as UserProfile);
          }
        } catch (e) {
          console.error("Profile sync error:", e);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

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
    }, (error) => {
      console.error("Listings sync error:", error);
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

  const addListing = async (data: Omit<Listing, 'id' | 'createdAt'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'listings'), {
        ...data,
        sellerId: user.id,
        sellerName: user.fullName,
        sellerRating: 4.5 + Math.random() * 0.5, // Random initial rating for demo
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, 'create', 'listings');
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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-light">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ 
      user, loading, listings, favorites, chats, messages, search, setSearch,
      login, logout, updateProfile, addListing, toggleFavorite, createChat, sendMessage 
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

export default function App() {
  return (
    <AppProvider>
      <Router>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <div className="min-h-screen bg-bg-light font-sans pt-16">
                  <Navbar />
                  <div className="flex max-w-[1280px] mx-auto min-h-[calc(100vh-64px)]">
                    <Sidebar />
                    <main className="flex-1 flex flex-col pb-20 md:pb-0 overflow-y-auto">
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/market" element={<HomePage />} />
                        <Route path="/categories" element={<CategoriesPage />} />
                        <Route path="/favorites" element={<FavoritesPage />} />
                        <Route path="/sell" element={<SellPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/verify" element={<VerificationPage />} />
                        <Route path="/listing/:id" element={<ListingDetail />} />
                        <Route path="/chat/:id" element={<ChatPage />} />
                        <Route path="/messages" element={<MessagesListPage />} />
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
    </AppProvider>
  );
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useApp();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};
