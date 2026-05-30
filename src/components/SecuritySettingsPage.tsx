import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Shield, 
  Lock, 
  Eye, 
  Bell, 
  Trash2, 
  ChevronRight, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Download,
  Terminal,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export const SecuritySettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'security' | 'privacy' | 'mobile'>('security');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed PWA)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isNavStandalone = (navigator as any).standalone === true;
      setIsInstalled(isStandaloneMedia || isNavStandalone);
    };
    checkStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const triggerPWAInstall = async () => {
    if (!deferredPrompt) {
      // Fallback instruction trigger
      alert(
        "Android Standalone Flow is Ready!\n\nIf the prompt didn't show up automatically:\n1. Tap the browser Menu icon (3 dots) in the top right.\n2. Tap 'Add to Home Screen' or 'Install App'.\n3. Confirm to install CampusMarket directly to your Android App Drawer! 🎉"
      );
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User installation choice outcome: ${outcome}`);
    setDeferredPrompt(null);
  };

  const securitySettings = [
    { 
      id: 'two-factor', 
      label: 'Two-Factor Authentication', 
      desc: 'Add an extra layer of security to your account',
      enabled: true,
      icon: Lock
    },
    { 
      id: 'login-alerts', 
      label: 'Login Alerts', 
      desc: 'Get notified when someone logs in from a new device',
      enabled: false,
      icon: Bell
    },
    { 
      id: 'verified-badge', 
      label: 'Show Verified Badge', 
      desc: 'Display your PLSP student verification status',
      enabled: true,
      icon: Shield
    }
  ];

  return (
    <div className="flex-1 bg-white overflow-y-auto no-scrollbar">
      <div className="max-w-3xl mx-auto p-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-bg-light flex items-center justify-center text-text-main hover:bg-border-main transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-text-main tracking-tight">Privacy & Security</h1>
            <p className="text-text-muted text-sm font-medium">Manage your account protection and data</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-bg-light rounded-2xl mb-8">
          <button 
            onClick={() => setActiveTab('security')}
            className={cn(
              "flex-1 py-3 px-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-wider text-center",
              activeTab === 'security' 
                ? "bg-white text-brand-deep shadow-sm" 
                : "text-text-muted hover:text-text-main"
            )}
          >
            Security
          </button>
          <button 
            onClick={() => setActiveTab('privacy')}
            className={cn(
              "flex-1 py-3 px-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-wider text-center",
              activeTab === 'privacy' 
                ? "bg-white text-brand-deep shadow-sm" 
                : "text-text-muted hover:text-text-main"
            )}
          >
            Privacy
          </button>
          <button 
            onClick={() => setActiveTab('mobile')}
            className={cn(
              "flex-1 py-3 px-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-wider text-center flex items-center justify-center gap-1.5",
              activeTab === 'mobile' 
                ? "bg-[#0B3D2E] text-white shadow-sm" 
                : "text-text-muted hover:text-text-main"
            )}
          >
            <Smartphone size={12} className={activeTab === 'mobile' ? "text-white animate-pulse" : "text-text-muted"} />
            Android App
          </button>
        </div>

        {activeTab === 'security' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-6 bg-accent-subtle rounded-[32px] border border-brand-primary/10 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-brand-primary shadow-sm">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="font-black text-brand-primary">Account Verification</h3>
                  <p className="text-xs text-brand-primary/70 font-medium">Your identity is verified by PLSP moderators.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/50 rounded-xl text-[10px] font-black uppercase text-brand-primary tracking-wider">
                <CheckCircle2 size={12} /> Status: Verified Student
              </div>
            </div>

            <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] pl-4 mb-2">Protection</h2>
            <div className="space-y-2">
              {securitySettings.map((item) => (
                <div key={item.id} className="p-4 bg-bg-light rounded-2xl border border-border-main flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-text-muted transition-colors group-hover:text-brand-primary">
                      {item.id === 'verified-badge' ? <Shield size={18} /> : <item.icon size={18} />}
                    </div>
                    <div>
                      <span className="font-bold text-text-main text-sm block leading-none mb-1">{item.label}</span>
                      <span className="text-[10px] text-text-muted font-medium">{item.desc}</span>
                    </div>
                  </div>
                  <div className={cn(
                    "w-12 h-6 rounded-full p-1 transition-colors cursor-pointer",
                    item.enabled ? "bg-brand-primary" : "bg-border-main"
                  )}>
                    <div className={cn(
                      "w-4 h-4 rounded-full bg-white transition-transform",
                      item.enabled ? "translate-x-6" : "translate-x-0"
                    )} />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6">
              <button className="w-full p-4 rounded-2xl border-2 border-dashed border-border-main text-text-muted font-bold text-sm hover:border-brand-primary hover:text-brand-primary transition-all">
                Change Account Password
              </button>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-4 animate-fadeIn">
            <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] pl-4 mb-2">Visibility</h2>
            <div className="p-4 bg-bg-light rounded-2xl border border-border-main flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-text-muted">
                  <Eye size={18} />
                </div>
                <div>
                  <span className="font-bold text-text-main text-sm block leading-none mb-1">Public Profile</span>
                  <span className="text-[10px] text-text-muted font-medium">Show your activity to other students</span>
                </div>
              </div>
              <div className="w-12 h-6 rounded-full p-1 bg-brand-primary">
                <div className="w-4 h-4 rounded-full bg-white translate-x-6" />
              </div>
            </div>

            <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] pl-4 mb-2 mt-6">Legal</h2>
            <button 
              onClick={() => navigate('/privacy')}
              className="w-full p-4 bg-bg-light rounded-2xl border border-border-main flex items-center justify-between group hover:border-brand-primary transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-text-muted group-hover:text-brand-primary">
                  <Shield size={18} />
                </div>
                <div>
                  <span className="font-bold text-text-main text-sm block leading-none mb-1">Privacy Policy</span>
                  <span className="text-[10px] text-text-muted font-medium">Our terms of data collection</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-text-muted group-hover:text-brand-primary" />
            </button>

            <div className="pt-10">
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100 mb-4">
                <div className="flex gap-3">
                  <AlertCircle className="text-red-500 shrink-0" size={20} />
                  <div>
                    <h4 className="text-sm font-bold text-red-900">Danger Zone</h4>
                    <p className="text-[10px] text-red-700 font-medium">Once you delete your account, there is no going back. Please be certain.</p>
                  </div>
                </div>
              </div>
              <button className="flex items-center justify-center gap-2 w-full p-4 rounded-2xl bg-red-500 text-white font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-200">
                <Trash2 size={16} /> Delete Account Permanently
              </button>
            </div>
          </div>
        )}

        {activeTab === 'mobile' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Native Verification Status Card */}
            <div className="p-6 bg-gradient-to-br from-[#0B3D2E] to-[#124E3D] rounded-[32px] text-white shadow-xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white shadow-sm">
                  <Smartphone size={24} />
                </div>
                <div>
                  <h3 className="font-black text-white text-lg tracking-tight">Android App Status</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <p className="text-xs text-white/80 font-bold uppercase tracking-wider">
                      {isInstalled ? "STANDALONE INSTALLED APP" : "BROWSER PREVIEW MODE"}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-white/70 leading-relaxed font-semibold">
                CampusMarket operates with fully-functional Progressive Web App technology. This allows you to install it directly onto any Android or iOS device as an active app launcher shortcut. No heavy stores required!
              </p>
            </div>

            {/* Direct PWA Install prompt block */}
            <div className="p-6 bg-slate-50 border border-slate-100 rounded-[28px] space-y-4">
              <div className="flex gap-3">
                <Download className="text-[#0B3D2E] shrink-0" size={20} />
                <div>
                  <h4 className="text-sm font-black text-slate-800 tracking-tight">Rapid 1-Step Installation</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Add the shortcut to your launch home screen with complete status bar optimization.</p>
                </div>
              </div>
              
              <button 
                onClick={triggerPWAInstall}
                className="w-full p-4 bg-[#0B3D2E] text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-[#082E22] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0B3D2E]/20"
              >
                <Smartphone size={16} className="animate-bounce" />
                Install App on Android / Device
              </button>
            </div>

            {/* Step-by-Step Installation Instruction Lists */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] pl-4">Manual Installation Guides</h4>
              
              <div className="grid gap-2">
                <div className="p-4 bg-bg-light rounded-2xl border border-border-main space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-md">Android</span>
                    <h5 className="font-bold text-xs text-text-main">Google Chrome Client</h5>
                  </div>
                  <p className="text-[10.5px] text-text-muted leading-relaxed font-medium">
                    Tap the <strong>three vertical dots (⋮)</strong> in Chrome\'s upper right corner. Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>. Confirm is immediate!
                  </p>
                </div>

                <div className="p-4 bg-bg-light rounded-2xl border border-border-main space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-neutral-200 text-neutral-700 rounded-md">Apple iOS</span>
                    <h5 className="font-bold text-xs text-text-main">Safari Mobile Client</h5>
                  </div>
                  <p className="text-[10.5px] text-text-muted leading-relaxed font-medium">
                    Open this URL in Safari browser. Tap the <strong>Share icon (arrow pointing up from a box)</strong> in the command drawer, and tap <strong>"Add to Home Screen"</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Native Code Compilation Tutorial For Technical Users */}
            <div className="p-5 bg-stone-900 text-stone-200 rounded-[28px] space-y-4 font-sans border border-stone-800">
              <div className="flex gap-3">
                <Terminal className="text-emerald-400 shrink-0" size={20} />
                <div>
                  <h4 className="text-sm font-black text-white tracking-tight">Capacitor APK Compilation Suite</h4>
                  <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-black leading-none block mt-1">Pre-built native package is ready inside this codebase!</span>
                </div>
              </div>

              <p className="text-[11px] text-stone-400 leading-relaxed font-medium">
                We have fully configured a standalone native Android container inside the <code className="bg-stone-800 text-emerald-400 px-1 py-0.5 rounded font-mono text-[9px]">/android</code> folder of this project using Capacitor. You or your developers can convert it to an installable <strong className="text-white">.apk</strong> on your computer:
              </p>

              <div className="space-y-3 pt-2">
                <div className="text-[10px] space-y-1 font-mono text-stone-300">
                  <div className="text-emerald-400 font-bold border-b border-stone-800 pb-1 uppercase text-[8.5px]">Android Build Steps:</div>
                  <div className="p-2.5 bg-stone-950 rounded-xl space-y-2 select-text border border-stone-800 leading-normal">
                    <p className="text-stone-500"># 1. Download & Export Project Zip from Settings</p>
                    <p className="text-stone-500"># 2. Extract and run installation in your local terminal</p>
                    <p className="text-emerald-400">npm install</p>
                    
                    <p className="text-stone-500"># 3. Synchronize Web Dist and Capacitor configuration</p>
                    <p className="text-emerald-400">npx cap sync</p>
                    
                    <p className="text-stone-500"># 4. Generate & Compile direct app-debug.apk using Gradle</p>
                    <p className="text-emerald-400">cd android && ./gradlew assembleDebug</p>
                  </div>
                </div>

                <div className="flex gap-2 p-3 bg-stone-850 rounded-xl items-start">
                  <Info className="text-amber-400 shrink-0" size={16} />
                  <p className="text-[10px] text-stone-400 leading-normal font-semibold">
                    The compiled apk output will reside in <code className="bg-stone-950 text-white font-mono rounded px-1 text-[8.5px]">android/app/build/outputs/apk/debug/app-debug.apk</code>, completely optimized for native Android sideload installation!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
