import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  getDocs, 
  doc, 
  deleteDoc,
  query,
  orderBy,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, SellerApplication } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  FileText, 
  Mail, 
  Calendar, 
  ShieldAlert, 
  ChevronRight, 
  Download, 
  Search, 
  X, 
  TrendingUp, 
  Database,
  ArrowLeft,
  Trash2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Image as ImageIcon,
  UserCheck,
  Award,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

export const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [fileCounts, setFileCounts] = useState<{ [userId: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selected user for file detail view
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedUserFiles, setSelectedUserFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // New States for Onboarding Applications Management
  const [activeTab, setActiveTab] = useState<'directory' | 'onboarding'>('directory');
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appStatusFilter, setAppStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [appSearchTerm, setAppSearchTerm] = useState('');
  
  // Confirmation state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject';
    userId: string;
    fullName: string;
  } | null>(null);
  
  // Submit action progress
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionAlert, setActionAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Lightbox preview for student ID images
  const [lightboxUrl, setLightboxUrl] = useState<{ url: string; title: string } | null>(null);

  // Fetch Seller Applications List
  useEffect(() => {
    setAppsLoading(true);
    const appsRef = collection(db, 'sellerApplications');
    const unsubscribe = onSnapshot(appsRef, (snapshot) => {
      const appsList: SellerApplication[] = [];
      snapshot.forEach((doc) => {
        appsList.push({ userId: doc.id, ...doc.data() } as SellerApplication);
      });
      // Sort: newest apps first
      appsList.sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
        return dateB - dateA;
      });
      setApplications(appsList);
      setAppsLoading(false);
    }, (error) => {
      console.error("Error loading seller applications for admin:", error);
      setAppsLoading(false);
    });

    return unsubscribe;
  }, []);

  const processApplicationAction = async (userId: string, actionType: 'approve' | 'reject') => {
    setProcessingId(userId);
    setActionAlert(null);
    try {
      const batch = writeBatch(db);
      const appRef = doc(db, 'sellerApplications', userId);
      const userRef = doc(db, 'users', userId);

      const isApprove = actionType === 'approve';

      // 1. Update the SellerApplication document status
      batch.update(appRef, {
        status: isApprove ? 'approved' : 'rejected'
      });

      // 2. Update the UserProfile document fields
      batch.update(userRef, {
        role: isApprove ? 'seller' : 'buyer',
        isVerified: isApprove,
        verificationStatus: isApprove ? 'approved' : 'rejected'
      });

      await batch.commit();

      setActionAlert({
        type: 'success',
        message: `Successfully ${isApprove ? 'approved' : 'rejected'} seller application for user.`
      });
      
      // Auto dismiss alert after 5s
      setTimeout(() => setActionAlert(null), 5000);
    } catch (err: any) {
      console.error(`Error executing database write batch for ${actionType}:`, err);
      setActionAlert({
        type: 'error',
        message: err.message || `Failed to ${actionType} application. Please verify rules and connectivity.`
      });
    } finally {
      setProcessingId(null);
      setConfirmAction(null);
    }
  };

  // 1. Fetch Users
  useEffect(() => {
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const usersList: UserProfile[] = [];
      snapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() } as UserProfile);
      });
      // Sort users by creation date newest first
      usersList.sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
        return dateB - dateA;
      });
      setUsers(usersList);
      setLoading(false);

      // Fetch file counts for each user
      usersList.forEach(async (u) => {
        try {
          const filesSnap = await getDocs(collection(db, 'users', u.id, 'files'));
          setFileCounts(prev => ({
            ...prev,
            [u.id]: filesSnap.size
          }));
        } catch (err) {
          console.error(`Error loading files for user ${u.id}:`, err);
        }
      });
    }, (error) => {
      console.error("Error loaded users for admin:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // 2. Load Selected User's Files
  useEffect(() => {
    if (!selectedUser) {
      setSelectedUserFiles([]);
      return;
    }

    setLoadingFiles(true);
    const filesRef = collection(db, 'users', selectedUser.id, 'files');
    const q = query(filesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const filesList: any[] = [];
      snapshot.forEach((doc) => {
        filesList.push({ id: doc.id, ...doc.data() });
      });
      setSelectedUserFiles(filesList);
      setLoadingFiles(false);
    }, (error) => {
      console.error("Error fetching files for selected user:", error);
      // Fallback without ordering in case index is not built yet
      const fallbackUnsubscribe = onSnapshot(filesRef, (snapshot) => {
        const filesList: any[] = [];
        snapshot.forEach((doc) => {
          filesList.push({ id: doc.id, ...doc.data() });
        });
        setSelectedUserFiles(filesList);
        setLoadingFiles(false);
      });
      return fallbackUnsubscribe;
    });

    return unsubscribe;
  }, [selectedUser]);

  // Formatter for Date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'No Date';
    if (timestamp.toMillis) {
      return new Date(timestamp.toMillis()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    if (timestamp instanceof Date) return timestamp.toLocaleDateString();
    return new Date(timestamp).toLocaleDateString();
  };

  // Formatter for File Size
  const formatBytes = (bytes: number) => {
    if (bytes === 0 || !bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filter users based on search term (name, email)
  const filteredUsers = users.filter((u) => {
    const search = searchTerm.toLowerCase();
    return (u.fullName || '').toLowerCase().includes(search) || 
           (u.email || '').toLowerCase().includes(search);
  });

  return (
    <div className="min-h-screen bg-bg-light pb-24 text-text-main font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-border-main sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-primary/10 text-brand-primary p-2.5 rounded-2xl">
              <Database size={24} />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight">CampusMarket Admin Portal</h1>
              <p className="text-[10px] text-text-muted font-bold tracking-widest uppercase">Database Management Console</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Admin Badge */}
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 px-3.5 py-1.5 rounded-full select-none">
              <ShieldAlert size={14} className="animate-pulse" />
              <span className="text-[10px] font-black tracking-wider uppercase">ADMIN RE-VIEW ACTIVE</span>
            </div>

            <button 
              onClick={onLogout}
              className="px-4 py-2 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 transition-all rounded-xl text-xs font-bold"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* Welcome Back Card */}
        <div className="bg-gradient-to-r from-[#166534] to-[#14532D] rounded-[32px] p-8 text-white relative overflow-hidden shadow-xl mb-8">
          <div className="relative z-10 max-w-lg">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase mb-4 inline-block">
              Super-Administrator
            </span>
            <h2 className="text-2xl font-black tracking-tight mb-2">Welcome Back, Overseer!</h2>
            <p className="text-emerald-100/80 text-sm font-medium leading-relaxed">
              This terminal provides secure, database-level read access to all registered users and their uploaded storage files. Respect privacy and use oversight responsibility ethically.
            </p>
          </div>
          <div className="absolute right-8 bottom-0 opacity-10 pointer-events-none">
            <ShieldAlert size={220} />
          </div>
        </div>

        {/* Dashboard Grid Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-[24px] p-6 border border-border-main shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black tracking-wider text-text-muted uppercase">Total Users</p>
              <h3 className="text-2xl font-black text-text-main mt-1">{users.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#166534]/5 text-[#166534] flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
          <div className="bg-white rounded-[24px] p-6 border border-border-main shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black tracking-wider text-text-muted uppercase">Users with Uploads</p>
              <h3 className="text-2xl font-black text-text-main mt-1">
                {Object.values(fileCounts).filter((count) => (count as number) > 0).length}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#166534]/5 text-[#166534] flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="bg-white rounded-[24px] p-6 border border-border-main shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black tracking-wider text-text-muted uppercase">Total Uploaded Files</p>
              <h3 className="text-2xl font-black text-text-main mt-1">
                {Object.values(fileCounts).reduce((a, b) => (a as number) + (b as number), 0) as number}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#166534]/5 text-[#166534] flex items-center justify-center">
              <FileText size={20} />
            </div>
          </div>
          <div className="bg-white rounded-[24px] p-6 border border-border-main shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black tracking-wider text-text-muted uppercase">Pending Onboarding</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1">
                {applications.filter(app => app.status === 'pending').length}
              </h3>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              applications.filter(app => app.status === 'pending').length > 0
                ? "bg-amber-505/10 bg-amber-500/10 text-amber-600"
                : "bg-gray-100 text-gray-400"
            }`}>
              <UserCheck size={20} />
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex border-b border-gray-200 mb-8 gap-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('directory')}
            className={cn(
              "pb-4 text-[11px] font-black uppercase tracking-widest relative flex items-center gap-2.5 transition-all whitespace-nowrap",
              activeTab === 'directory' 
                ? "text-[#166534] border-b-2 border-[#166534]" 
                : "text-text-muted hover:text-text-main"
            )}
          >
            <Users size={15} />
            <span>Active Accounts & Files Vault</span>
          </button>
          
          <button
            onClick={() => setActiveTab('onboarding')}
            className={cn(
              "pb-4 text-[11px] font-black uppercase tracking-widest relative flex items-center gap-2.5 transition-all whitespace-nowrap",
              activeTab === 'onboarding' 
                ? "text-[#166534] border-b-2 border-[#166534]" 
                : "text-text-muted hover:text-text-main"
            )}
          >
            <Award size={15} />
            <span>Seller Onboarding Requests</span>
            {applications.filter(app => app.status === 'pending').length > 0 && (
              <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                {applications.filter(app => app.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {/* Action Success / Error Notifications */}
        <AnimatePresence>
          {actionAlert && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "p-4 rounded-2xl mb-6 flex items-center gap-3 border text-xs font-bold shadow-sm",
                actionAlert.type === 'success' 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                  : "bg-rose-50 border-rose-200 text-rose-800"
              )}
            >
              {actionAlert.type === 'success' ? (
                <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
              )}
              <div className="flex-1">{actionAlert.message}</div>
              <button onClick={() => setActionAlert(null)} className="text-gray-400 hover:text-gray-700">
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'directory' && (
          <>
            {/* User Search & Main Table */}
            <div className="bg-white rounded-[32px] border border-border-main shadow-sm overflow-hidden mb-8">
              
              {/* List Headers / Search Row */}
              <div className="p-6 border-b border-border-main/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-text-main uppercase tracking-wider">Registered Accounts & Files Directory</h3>
                  <p className="text-xs text-text-muted mt-0.5">Showing live registered users fetched from Firestore</p>
                </div>
                <div className="relative w-full sm:w-80">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                    <Search size={16} />
                  </span>
                  <input 
                    type="text" 
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl text-xs bg-bg-light border border-border-main focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534] font-medium"
                  />
                </div>
              </div>

              {/* User List Table */}
              {loading ? (
                <div className="py-20 text-center">
                  <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-xs font-black tracking-wider uppercase text-text-muted">Loading Directory...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-20 text-center text-text-muted">
                  <Users size={48} className="mx-auto text-text-muted opacity-20 mb-3" />
                  <p className="text-sm font-bold">No registered users matched your query</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg-light border-b border-border-main text-[10px] font-black text-text-muted uppercase tracking-wider">
                        <th className="py-4 px-6">Student Information</th>
                        <th className="py-4 px-6">Email Address</th>
                        <th className="py-4 px-6">Account Created</th>
                        <th className="py-4 px-6">System Role</th>
                        <th className="py-4 px-6 text-center">Seller Request Status</th>
                        <th className="py-4 px-6 text-center">Uploaded Files</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {filteredUsers.map((userRecord) => (
                        <tr 
                          key={userRecord.id}
                          className={cn(
                            "hover:bg-bg-light transition-colors group cursor-pointer",
                            selectedUser?.id === userRecord.id ? "bg-[#166534]/5" : ""
                          )}
                          onClick={() => setSelectedUser(userRecord)}
                        >
                          <td className="py-4 px-6 font-medium">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#166534]/10 text-[#166534] font-extrabold flex items-center justify-center text-xs uppercase border border-[#166534]/20 shadow-sm">
                                {userRecord.avatarUrl ? (
                                  <img src={userRecord.avatarUrl} alt={userRecord.fullName} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  userRecord.fullName ? userRecord.fullName.substring(0, 2) : 'ST'
                                )}
                              </div>
                              <div>
                                <p className="font-extrabold text-text-main text-sm flex items-center gap-1.5">
                                  {userRecord.fullName || 'PLSP STUDENT'}
                                  {userRecord.id === 'mp3cXxRdbycE2ffhXwmC2kblZYF2' && (
                                    <span className="bg-amber-400 text-amber-950 font-black text-[8px] tracking-widest px-2 py-0.5 rounded-full uppercase">Admin</span>
                                  )}
                                </p>
                                <p className="text-[10px] text-text-muted mt-0.5 font-bold uppercase tracking-wider">
                                  {userRecord.courseAndYear || 'No Course Stated'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 font-mono font-medium text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <Mail size={12} className="text-text-muted" />
                              {userRecord.email}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-text-muted font-bold uppercase">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={12} />
                              {formatDate(userRecord.createdAt)}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border inline-block",
                                userRecord.role === 'seller' ? "bg-emerald-50 text-[#166534] border-emerald-200" :
                                userRecord.role === 'admin' ? "bg-amber-150 text-amber-800 border-amber-200" :
                                "bg-slate-50 text-slate-700 border-slate-200"
                              )}>
                                {userRecord.role || 'buyer'}
                              </span>
                              <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest whitespace-nowrap">
                                {userRecord.onboarded ? "✓ Onboarded" : "✗ Not Onboarded"}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="inline-flex flex-col gap-1 items-center">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border flex items-center gap-1 justify-center",
                                userRecord.verificationStatus === 'approved' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                userRecord.verificationStatus === 'pending' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                userRecord.verificationStatus === 'rejected' ? "bg-rose-50 text-[#991b1b] border-rose-150" :
                                "bg-gray-50 text-gray-400 border-gray-100"
                              )}>
                                {userRecord.verificationStatus || 'none'}
                              </span>
                              {userRecord.isVerified && (
                                <span className="text-[8px] font-black tracking-widest text-[#166534] uppercase bg-green-50 px-1.5 py-0.5 rounded border border-green-100 whitespace-nowrap">
                                  ✓ Verified
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center font-bold">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-xs inline-flex items-center gap-1.5",
                              (fileCounts[userRecord.id] || 0) > 0 
                                ? "bg-emerald-50 text-[#166534] border border-[#166534]/15" 
                                : "bg-gray-50 text-gray-400 border border-gray-100"
                            )}>
                              <FileText size={12} />
                              {fileCounts[userRecord.id] || 0}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button className="inline-flex items-center gap-1.5 text-xs font-black text-[#166534] group-hover:gap-2.5 transition-all uppercase tracking-wider">
                              Inspect Details <ChevronRight size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Selected User Files Detail Card (Sidebar / Overlay / Panel) */}
            <AnimatePresence>
              {selectedUser && (
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 30 }}
                  className="bg-white rounded-[32px] p-6 border border-border-main shadow-md text-left mb-8"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-5 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-brand-primary flex items-center justify-center font-black uppercase text-sm">
                        {selectedUser.fullName ? selectedUser.fullName.substring(0,2) : 'ST'}
                      </div>
                      <div>
                        <h4 className="text-base font-black text-text-main flex items-center gap-2">
                           Files Vault: {selectedUser.fullName}
                        </h4>
                        <p className="text-xs text-text-muted mt-0.5">UID: <span className="font-mono bg-bg-light px-1.5 py-0.5 rounded text-[10px]">{selectedUser.id}</span></p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedUser(null)}
                      className="w-10 h-10 rounded-full hover:bg-bg-light flex items-center justify-center transition-all border border-border-main"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Student Master Profile Information */}
                  <div className="mb-6 bg-slate-50/50 rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-200/60">
                      <Users size={16} className="text-[#166534]" />
                      <h5 className="text-[11px] font-black uppercase tracking-wider text-[#166534]">Student Master Profile Catalog</h5>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Academic & Main Credentials */}
                      <div className="space-y-3.5 text-xs">
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                          <span className="font-extrabold text-text-muted text-[10px] uppercase tracking-wider">Full Name</span>
                          <span className="font-extrabold text-text-main text-right">{selectedUser.fullName || 'No Name Provided'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                          <span className="font-extrabold text-text-muted text-[10px] uppercase tracking-wider">Course & Year</span>
                          <span className="font-bold text-text-main text-right">{selectedUser.courseAndYear || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                          <span className="font-extrabold text-text-muted text-[10px] uppercase tracking-wider">Email Address</span>
                          <span className="font-mono text-gray-600 text-right">{selectedUser.email || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                          <span className="font-extrabold text-text-muted text-[10px] uppercase tracking-wider">Registration Date</span>
                          <span className="font-bold text-text-muted text-right">{formatDate(selectedUser.createdAt)}</span>
                        </div>
                      </div>

                      {/* Right: Verification Status Parameters */}
                      <div className="space-y-3.5 text-xs">
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                          <span className="font-extrabold text-text-muted text-[10px] uppercase tracking-wider">Account Role</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                            selectedUser.role === 'seller' ? "bg-emerald-50 text-[#166534] border-emerald-200" :
                            selectedUser.role === 'admin' ? "bg-amber-100 text-amber-800 border-amber-200" :
                            "bg-slate-100 text-slate-700 border-slate-200"
                          )}>
                            {selectedUser.role || 'buyer'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                          <span className="font-extrabold text-text-muted text-[10px] uppercase tracking-wider">Onboarding Progress</span>
                          <span className={cn(
                            "font-bold text-xs",
                            selectedUser.onboarded ? "text-emerald-600" : "text-gray-400"
                          )}>
                            {selectedUser.onboarded ? "Completed Onboarding" : "Not Onboarded"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                          <span className="font-extrabold text-text-muted text-[10px] uppercase tracking-wider">Seller Verification Status</span>
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                            selectedUser.verificationStatus === 'approved' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            selectedUser.verificationStatus === 'pending' ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse" :
                            selectedUser.verificationStatus === 'rejected' ? "bg-rose-50 text-rose-700 border-rose-100" :
                            "bg-gray-50 text-gray-400 border-gray-100"
                          )}>
                            {selectedUser.verificationStatus || 'none'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                          <span className="font-extrabold text-text-muted text-[10px] uppercase tracking-wider">Verified State</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                            selectedUser.isVerified ? "bg-green-50 text-[#166534] border border-green-100" : "bg-gray-50 text-gray-400 border border-gray-100"
                          )}>
                            {selectedUser.isVerified ? "VERIFIED TRUE" : "UNVERIFIED FALSE"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Biography & description row */}
                    <div className="mt-5 pt-4 border-t border-gray-200/65 text-xs text-left">
                      <span className="font-extrabold text-text-muted text-[10px] uppercase tracking-wider block mb-2">Student Bio Details</span>
                      <div className="bg-white p-3.5 rounded-xl border border-gray-200/70 text-text-muted italic leading-relaxed min-h-[48px]">
                        {selectedUser.bio ? `"${selectedUser.bio}"` : '"No student biography/introduction provided yet."'}
                      </div>
                    </div>

                    {/* Interests tags row */}
                    <div className="mt-4 pt-4 border-t border-gray-200/65 text-xs text-left">
                      <span className="font-extrabold text-text-muted text-[10px] uppercase tracking-wider block mb-2">Student Interests / Activity Tags</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedUser.interests && selectedUser.interests.length > 0 ? (
                          selectedUser.interests.map((interest, i) => (
                            <span 
                              key={i} 
                              className="bg-emerald-50/70 text-[#166534] border border-[#166534]/10 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg"
                            >
                              {interest}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">No custom interests selected or defined.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sub Header for Files Vault Section */}
                  <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                    <FileText size={15} className="text-[#166534]" />
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-[#166534]">Student Folder Repository Links</h5>
                  </div>

                  {/* Files Table / Area */}
                  {loadingFiles ? (
                    <div className="py-16 text-center">
                      <div className="w-8 h-8 border-2 border-brand-primary border-t-yellow-500 rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-xs text-text-muted uppercase font-black tracking-wider">Retrieving Storage Registry...</p>
                    </div>
                  ) : selectedUserFiles.length === 0 ? (
                    <div className="py-16 bg-bg-light/40 rounded-2xl text-center border-2 border-dashed border-gray-100">
                      <FileText className="mx-auto text-text-muted opacity-15 mb-3" size={48} />
                      <p className="text-sm font-extrabold text-text-neutral mb-1">No files in directory</p>
                      <p className="text-xs text-text-muted max-w-sm mx-auto font-medium">This student profile hasn't loaded or uploaded any files to Firestore yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedUserFiles.map((file) => (
                        <div 
                          key={file.id}
                          className="bg-bg-light/45 hover:bg-bg-light/80 p-4 rounded-2xl border border-border-main flex items-center justify-between gap-4 transition-all"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-11 h-11 bg-white border border-border-main rounded-xl flex items-center justify-center flex-shrink-0 text-brand-primary shadow-sm">
                              <FileText size={20} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-text-main truncate" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-[10px] text-text-muted font-bold mt-0.5 uppercase tracking-wider flex items-center gap-1.5">
                                <span>{formatBytes(file.size)}</span>
                                <span>•</span>
                                <span>{formatDate(file.createdAt)}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <a 
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-9 h-9 rounded-xl bg-white border border-border-main hover:bg-[#166534]/5 text-brand-primary hover:text-brand-primary-hover flex items-center justify-center transition-all shadow-sm cursor-pointer"
                              title="Download / View File"
                            >
                              <Download size={14} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Seller Onboarding applications tab */}
        {activeTab === 'onboarding' && (
          <div className="bg-white rounded-[32px] border border-border-main shadow-sm overflow-hidden mb-8 p-6">
            {/* Filter and search controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100 mb-6">
              {/* Status Pill Filters */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {(['pending', 'approved', 'rejected', 'all'] as const).map((filterOpt) => (
                  <button
                    key={filterOpt}
                    onClick={() => setAppStatusFilter(filterOpt)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all border shrink-0",
                      appStatusFilter === filterOpt
                        ? "bg-[#166534] text-white border-[#166534] shadow-sm shadow-[#166534]/20"
                        : "bg-gray-50 border-gray-200 text-text-muted hover:bg-gray-100 hover:text-text-main"
                    )}
                  >
                    {filterOpt}
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[9px] font-black tracking-normal ml-1.5",
                      appStatusFilter === filterOpt 
                        ? "bg-white/20 text-white" 
                        : "bg-gray-200 text-gray-500"
                    )}>
                      {filterOpt === 'pending' ? applications.filter(app => app.status === 'pending').length 
                        : filterOpt === 'approved' ? applications.filter(app => app.status === 'approved').length 
                        : filterOpt === 'rejected' ? applications.filter(app => app.status === 'rejected').length 
                        : applications.length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Applicant Name Search */}
              <div className="relative w-full md:w-80">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Search by student name..."
                  value={appSearchTerm}
                  onChange={(e) => setAppSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl text-xs bg-bg-light border border-border-main focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534] font-medium"
                />
              </div>
            </div>

            {/* Application List */}
            {appsLoading ? (
              <div className="py-20 text-center">
                <div className="w-8 h-8 border-2 border-[#166534] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-xs font-black tracking-wider uppercase text-text-muted">Retrieving seller applications...</p>
              </div>
            ) : applications.filter((app) => {
              if (appStatusFilter !== 'all' && app.status !== appStatusFilter) return false;
              if (appSearchTerm.trim()) {
                const s = appSearchTerm.toLowerCase();
                return (app.fullName || '').toLowerCase().includes(s) || (app.school || '').toLowerCase().includes(s);
              }
              return true;
            }).length === 0 ? (
              <div className="py-20 text-center text-text-muted">
                <Award size={48} className="mx-auto text-text-muted opacity-20 mb-3" />
                <p className="text-sm font-bold">No seller requests match current criteria</p>
                <p className="text-xs text-text-muted mt-1">Status database is fully sync'd up.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {applications.filter((app) => {
                  if (appStatusFilter !== 'all' && app.status !== appStatusFilter) return false;
                  if (appSearchTerm.trim()) {
                    const s = appSearchTerm.toLowerCase();
                    return (app.fullName || '').toLowerCase().includes(s) || (app.school || '').toLowerCase().includes(s);
                  }
                  return true;
                }).map((app) => (
                  <motion.div
                    key={app.userId}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "border rounded-3xl p-5 flex flex-col justify-between transition-all relative overflow-hidden bg-white shadow-sm",
                      app.status === 'pending' ? "border-amber-200 shadow-sm hover:border-amber-400"
                        : app.status === 'approved' ? "border-emerald-100 hover:border-emerald-200"
                        : "border-gray-100 opacity-80"
                    )}
                  >
                    {/* Corner badge for status */}
                    <div className="absolute top-4 right-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider",
                        app.status === 'approved' ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : app.status === 'rejected' ? "bg-rose-50 text-rose-700 border border-rose-100"
                          : "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                      )}>
                        {app.status}
                      </span>
                    </div>

                    {/* Applicant Main Info */}
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#166534]/10 to-emerald-500/5 text-[#166534] font-black text-xs flex items-center justify-center border border-[#166534]/10 shadow-inner">
                          {app.fullName ? app.fullName.substring(0, 2).toUpperCase() : 'ST'}
                        </div>
                        <div className="min-w-0 pr-16 text-left">
                          <h4 className="text-xs font-extrabold text-text-main truncate" title={app.fullName}>
                            {app.fullName}
                          </h4>
                          <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                            <Calendar size={9} />
                            <span>{formatDate(app.createdAt)}</span>
                          </p>
                        </div>
                      </div>

                      {/* Details specs */}
                      <div className="space-y-1.5 mt-4 text-[10px] bg-bg-light p-3 rounded-2xl border border-gray-100 font-medium text-left">
                        <div className="flex justify-between">
                          <span className="text-text-muted">School / Campus:</span>
                          <span className="font-extrabold text-[#166534] truncate max-w-[150px]">{app.school}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-text-muted">Contact Info:</span>
                          {app.contactLink ? (
                            <a
                              href={app.contactLink.startsWith('http') ? app.contactLink : `https://${app.contactLink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-primary font-black hover:underline inline-flex items-center gap-0.5 uppercase tracking-wide text-[9px]"
                            >
                              Open Link <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span className="text-text-muted italic">No link provided</span>
                          )}
                        </div>
                      </div>

                      {/* Thumbnail of ID Card */}
                      <div className="mt-4 text-left">
                        <p className="text-[9px] font-black text-text-muted uppercase tracking-wider mb-2">Student ID verification Artifact</p>
                        {app.photoURL ? (
                          <div 
                            onClick={() => setLightboxUrl({ url: app.photoURL, title: `${app.fullName} - Student ID` })}
                            className="relative aspect-video rounded-2xl overflow-hidden border border-border-main shadow-inner cursor-pointer group bg-black/5"
                          >
                            <img
                              src={app.photoURL}
                              alt="Student ID image"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />
                            {/* Glass hover overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-[2px]">
                              <div className="bg-white/20 rounded-xl px-2.5 py-1 text-[9px] font-black tracking-widest uppercase inline-flex items-center gap-1 border border-white/10">
                                <ImageIcon size={10} /> Inspect Photo
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-video rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex flex-col items-center justify-center p-3 text-center">
                            <ImageIcon size={18} className="text-gray-300 mb-1" />
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">No identification image uploaded</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pending Action Buttons or Final Status */}
                    <div className="pt-4 border-t border-gray-100 mt-4">
                      {app.status === 'pending' ? (
                        <div className="grid grid-cols-2 gap-3 shrink-0">
                          <button
                            onClick={() => setConfirmAction({ type: 'reject', userId: app.userId, fullName: app.fullName })}
                            disabled={processingId !== null}
                            className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 active:scale-95 transition-all text-[11px] font-extrabold uppercase tracking-wide disabled:opacity-50"
                          >
                            <XCircle size={13} /> Reject
                          </button>
                          <button
                            onClick={() => setConfirmAction({ type: 'approve', userId: app.userId, fullName: app.fullName })}
                            disabled={processingId !== null}
                            className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#166534] text-white hover:bg-[#14532D] shadow-sm hover:shadow-[#14532D]/15 active:scale-95 transition-all text-[11px] font-extrabold uppercase tracking-wide disabled:opacity-50"
                          >
                            <CheckCircle size={13} /> Approve
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 py-2 bg-gray-50 border border-gray-100 rounded-xl">
                          {app.status === 'approved' ? (
                            <>
                              <CheckCircle size={13} className="text-emerald-500 fill-emerald-500/10" />
                              <span className="text-[9px] font-black tracking-widest text-emerald-700 uppercase">Approved Seller</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={13} className="text-rose-500 fill-rose-500/10" />
                              <span className="text-[9px] font-black tracking-widest text-[#991b1b] uppercase">Rejected Request</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dynamic Lightbox Modal Overlay */}
        <AnimatePresence>
          {lightboxUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Dark overlay backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setLightboxUrl(null)}
                className="absolute inset-0 bg-black/85 backdrop-blur-[4px] cursor-pointer"
              />

              {/* Lightbox dialog card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-[#08231a] border border-[#14532D]/30 max-w-3xl w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between z-10 p-4"
              >
                {/* Header info */}
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3 text-white">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-emerald-300">{lightboxUrl.title}</h4>
                  <button
                    onClick={() => setLightboxUrl(null)}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all border border-white/[0.08]"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Main image */}
                <div className="relative overflow-auto max-h-[75vh] flex items-center justify-center rounded-2xl bg-black/40">
                  <img
                    src={lightboxUrl.url}
                    alt="ID artifact detail representation"
                    className="object-contain max-h-[70vh] w-auto max-w-full"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Dynamic Confirmation Action Modal Dialog */}
        <AnimatePresence>
          {confirmAction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Dark blur backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmAction(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-[3px]"
              />

              {/* Confirm prompt */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative bg-white max-w-md w-full rounded-[30px] p-6 shadow-2xl border border-gray-100 text-left z-10"
              >
                <div className="flex gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border",
                    confirmAction.type === 'approve' 
                      ? "bg-emerald-50 border-emerald-100 text-emerald-600 font-black" 
                      : "bg-rose-50 border-rose-100 text-rose-600 font-black"
                  )}>
                    {confirmAction.type === 'approve' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                  </div>

                  <div>
                    <h4 className="text-base font-black tracking-tight text-text-main">
                      {confirmAction.type === 'approve' ? 'Approve Seller Account' : 'Reject Seller Onboarding'}
                    </h4>
                    <p className="text-xs text-text-muted leading-relaxed mt-2 text-left">
                      Are you sure you want to {confirmAction.type} the seller application submitted by{' '}
                      <span className="font-extrabold text-text-main">{confirmAction.fullName}</span>?
                    </p>
                    {confirmAction.type === 'approve' ? (
                      <p className="text-[10px] text-[#166534] font-black uppercase tracking-wider bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 mt-3 flex items-center gap-1.5">
                        <Award size={12} /> This will grant them seller privileges to post listings.
                      </p>
                    ) : (
                      <p className="text-[10px] text-rose-700 font-bold uppercase tracking-wider bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 mt-3 text-left">
                        They will remain styled in student buyer role and see their status as rejected.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3.5 mt-6 border-t border-gray-100 pt-4 shrink-0">
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={processingId !== null}
                    className="px-4 py-2 border border-border-main hover:bg-gray-50 text-text-muted transition-all rounded-xl text-xs font-extrabold uppercase tracking-widest disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => processApplicationAction(confirmAction.userId, confirmAction.type)}
                    disabled={processingId !== null}
                    className={cn(
                      "px-5 py-2 rounded-xl text-white font-extrabold transition-all text-xs uppercase tracking-widest flex items-center gap-1.5 shadow-sm disabled:opacity-50",
                      confirmAction.type === 'approve'
                        ? "bg-[#166534] hover:bg-[#14532D]"
                        : "bg-rose-600 hover:bg-rose-700"
                    )}
                  >
                    {processingId !== null ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                    ) : null}
                    Confirm {confirmAction.type}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
