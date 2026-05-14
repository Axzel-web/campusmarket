import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export const SecuritySettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'security' | 'privacy'>('security');

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
              "flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all uppercase tracking-widest",
              activeTab === 'security' 
                ? "bg-white text-brand-deep shadow-sm" 
                : "text-text-muted hover:text-text-main"
            )}
          >
            Security Settings
          </button>
          <button 
            onClick={() => setActiveTab('privacy')}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all uppercase tracking-widest",
              activeTab === 'privacy' 
                ? "bg-white text-brand-deep shadow-sm" 
                : "text-text-muted hover:text-text-main"
            )}
          >
            Privacy Options
          </button>
        </div>

        {activeTab === 'security' ? (
          <div className="space-y-4">
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
        ) : (
          <div className="space-y-4">
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
      </div>
    </div>
  );
};
