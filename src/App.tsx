/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, X, LayoutDashboard, Briefcase, 
  Gamepad2, Wallet, LogIn, LogOut, TrendingUp, 
  Plus, History, Shield, Calendar, Lock,
  Trophy, CheckCircle2, Bell, ArrowUpRight, 
  ArrowDownLeft, UserCircle, Settings, CreditCard, Users, UserPlus,
  Check, Copy, Upload, AlertCircle, Mail,
  Dice6 as Dices, Sparkles, Files, 
  Coins, Target, Package as Boxes, 
  MousePointer2 as Pointer, Infinity, Zap, 
  Ticket as Scratch, Gift, Timer, 
  ArrowDownCircle, Play, ChevronRight, PlusCircle,
  Circle as CircleIcon, RefreshCw,
  Disc, LayoutGrid as Grid, Rocket, Hash, Archive,
  Trash2, Search, MessageSquare, CheckSquare, Ban, UserCheck, MessageCircle, HelpCircle, Send, Smartphone, Download,
  BarChart3, Database, AlertTriangle, ShieldAlert, ArrowLeft
} from 'lucide-react';
import { auth, db, storage } from './lib/firebase';
import { 
  signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User as FirebaseUser,
  signInWithEmailAndPassword, createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
  doc, getDoc, getDocFromServer, setDoc, updateDoc, onSnapshot, 
  collection, query, where, orderBy,
  limit, Timestamp, serverTimestamp, arrayUnion, arrayRemove,
  increment, deleteDoc, getDocs, addDoc, writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { 
  AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { cn, formatCurrency } from './lib/utils';
import logo from './assets/images/daily_yield_app_icon_1777100795284.png';
import axios from 'axios';
import { subscribeUserToPush, askNotificationPermission } from './lib/push';

// --- Push Helpers ---
const triggerPush = async (userId: string, title: string, body: string, url: string = "/") => {
  try {
    await fetch('/api/push/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title,
        body,
        url,
        adminSecret: 'infodailyyield_admin_2024'
      })
    });
  } catch (e) {
    console.warn('Push trigger failed', e);
  }
};

const broadcastPush = async (title: string, body: string, url: string = "/") => {
  try {
    await fetch('/api/push/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        url,
        adminSecret: 'infodailyyield_admin_2024'
      })
    });
  } catch (e) {
    console.warn('Broadcast push failed', e);
  }
};

// --- Types ---
type View = 'dashboard' | 'portfolio' | 'gamehub' | 'marketduel' | 'wallet' | 'notifications' | 'account' | 'admin' | 'invest' | 'referral' | 'faq' | 'airdrop' | 'tiers' | 'deposit-request';

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  balanceNGN: number;
  walletBalance?: number;
  totalProfitNGN: number;
  totalDepositedNGN: number;
  totalWithdrawnNGN: number;
  activeInvestments: string[];
  streak: number;
  totalGamesPlayed: number;
  lastCheckIn?: Timestamp;
  createdAt: Timestamp;
  kycStatus: "unverified" | "pending" | "verified" | "rejected";
  tier: "tier1" | "tier2" | "tier3" | "premium";
  kycDocs?: any;
  banned?: boolean;
  isWalletFrozen?: boolean;
  banReason?: string;
  phone?: string;
  address?: string;
  referralCode: string;
  totalReferrals: number;
  referralEarnings: number;
  hasRedeemedCode: boolean;
  referredBy?: string;
  referrerUid?: string;
  firstDepositBonusClaimed?: boolean;
  hasDepositedBefore?: boolean;
  referralActive?: boolean;
  pushEnabled?: boolean;
}

interface Investment {
  id: string;
  userId: string;
  planId: string;
  capital: number;
  rate: number;
  durationDays: number;
  startTime: any;
  endTime: any;
  status: 'active' | 'completed';
}

// --- Constants ---
const generateReferralCode = () => {
  const chars = '0123456789';
  let code = 'DY';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const INVESTMENT_PLANS = [
  { id: 'p1', title: 'Starter 1', capital: 5000, days: 2, rate: 0.5 },
  { id: 'p2', title: 'Starter 2', capital: 10000, days: 4, rate: 0.5 },
  { id: 'p3', title: 'Bronze', capital: 20000, days: 6, rate: 0.5 },
  { id: 'p4', title: 'Silver', capital: 30000, days: 8, rate: 0.5 },
  { id: 'p5', title: 'Gold', capital: 40000, days: 10, rate: 0.5 },
  { id: 'p6', title: 'Platinum', capital: 50000, days: 12, rate: 0.5 },
  { id: 'p7', title: 'Sapphire', capital: 60000, days: 14, rate: 0.5 },
  { id: 'p8', title: 'Ruby', capital: 70000, days: 16, rate: 0.5 },
  { id: 'p9', title: 'Emerald', capital: 80000, days: 18, rate: 0.5 },
  { id: 'p10', title: 'Diamond', capital: 90000, days: 20, rate: 0.5 },
  { id: 'p11', title: 'Titanium', capital: 100000, days: 22, rate: 0.5 },
  { id: 'p12', title: 'Elite 1', capital: 150000, days: 25, rate: 0.5 },
  { id: 'p13', title: 'Elite 2', capital: 200000, days: 30, rate: 0.5 },
  { id: 'p14', title: 'Master', capital: 250000, days: 35, rate: 0.5 },
  { id: 'p15', title: 'Grandmaster', capital: 300000, days: 40, rate: 0.5 },
  { id: 'p16', title: 'Legend', capital: 400000, days: 45, rate: 0.5 },
  { id: 'p17', title: 'Oracle', capital: 500000, days: 50, rate: 0.5 },
  { id: 'p18', title: 'Mythic', capital: 750000, days: 60, rate: 0.5 },
  { id: 'p19', title: 'Immortal', capital: 1000000, days: 75, rate: 0.5 },
  { id: 'p20', title: 'Celestial', capital: 1500000, days: 90, rate: 0.5 },
];

const PageUnavailableView = ({ onBack, key }: { onBack: () => void, key?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="min-h-[70vh] flex flex-col items-center justify-center text-center p-10"
  >
    <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center text-red-500/80 mb-8 border border-red-500/20">
      <ShieldAlert size={48} />
    </div>
    <h2 className="text-4xl font-black mb-4 uppercase tracking-tighter text-white">Section Unavailable</h2>
    <p className="text-white/40 max-w-md mx-auto mb-10 leading-relaxed">
      This protocol module is currently undergoing essential maintenance or has been temporarily deactivated by the core administration. Please check back later.
    </p>
    <button 
      onClick={onBack}
      className="px-10 py-5 glass rounded-2xl hover:bg-white/10 transition-all font-black uppercase text-[10px] tracking-widest flex items-center gap-3 border border-white/10"
    >
      <ArrowLeft size={16} />
      Return to Dashboard
    </button>
  </motion.div>
);

const LandingPage = ({ onGetStarted }: { onGetStarted: () => void }) => {
  const [showDocs, setShowDocs] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(true);

  return (
    <div className="min-h-screen bg-[#0a0b12] text-white selection:bg-emerald-500/30 overflow-x-hidden bg-mesh">
      {/* Dynamic Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* WhatsApp Widget */}
      <div className="fixed bottom-8 right-8 z-[100] flex items-end gap-3">
        <AnimatePresence>
          {chatExpanded && (
            <motion.a
              href="https://wa.me/2349132469864"
              target="_blank"
              rel="noreferrer"
              initial={{ opacity: 0, x: 20, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.8 }}
              className="pl-6 pr-2 py-2 bg-[#25D366] text-white rounded-full flex items-center gap-4 shadow-[0_20px_50px_rgba(37,211,102,0.4)] border-2 border-white/20 group backdrop-blur-md"
            >
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">24/7 Priority</span>
                <span className="text-xs font-black uppercase tracking-[0.1em]">Chat with Support</span>
              </div>
              <div className="w-14 h-14 bg-black/10 rounded-full flex items-center justify-center group-hover:bg-black/20 transition-colors relative">
                <MessageSquare size={26} />
                <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#25D366] animate-pulse" />
              </div>
            </motion.a>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setChatExpanded(!chatExpanded)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 border-2 ${
            chatExpanded 
              ? 'bg-black/40 border-white/10 text-white rotate-180 hover:bg-black/60' 
              : 'bg-[#25D366] border-white/20 text-white hover:scale-110'
          }`}
        >
          {chatExpanded ? <X size={24} /> : <MessageSquare size={28} />}
          {!chatExpanded && <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#25D366] animate-pulse" />}
        </button>
      </div>

      {/* Market Ticker */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-black/40 backdrop-blur-md border-b border-white/5 h-10 flex items-center overflow-hidden">
        <div className="animate-marquee whitespace-nowrap flex items-center gap-12 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> STARTER 1: 50% PROFIT</span>
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ELITE 2: 50% PROFIT</span>
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> IMMORTAL: 50% PROFIT</span>
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> CELESTIAL: 50% PROFIT</span>
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> PAYSTACK GATEWAY: ONLINE</span>
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> INSTANT SETTLEMENTS ACTIVE</span>
          {/* Duplicate for seamless loop */}
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> FIXED 50% YIELD ON ALL PLANS</span>
        </div>
      </div>

      {/* Documentation Modal */}
      <AnimatePresence>
        {showDocs && (
          <motion.div 
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-[100] bg-[#0a0b12]/95 backdrop-blur-2xl overflow-y-auto px-6 py-20"
          >
            <div className="max-w-4xl mx-auto relative">
              <div className="flex justify-between items-center mb-16">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="Logo" className="w-10 h-10 rounded-xl shadow-lg shadow-emerald-500/20" />
                  <span className="text-2xl font-black uppercase tracking-tighter">Institutional <span className="text-emerald-500">Protocol</span></span>
                </div>
                <button 
                  onClick={() => setShowDocs(false)}
                  className="p-4 glass rounded-2xl hover:bg-white/10 transition-all border border-white/10 shadow-xl"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-24 pb-20">
                <section>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 mb-6 font-black text-[10px] uppercase text-emerald-400">
                    <Shield size={14} /> Certified Asset Management
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight tracking-tighter">
                    Diversified Liquidity <br/>
                    <span className="text-emerald-500">Asset Management.</span>
                  </h2>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="p-10 glass rounded-[3rem] border border-white/5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl group-hover:bg-emerald-500/10 transition-all" />
                      <h3 className="text-xl font-black mb-4 uppercase tracking-widest flex items-center gap-3">
                        <Zap size={20} className="text-emerald-500" /> Yield Strategy
                      </h3>
                      <p className="text-white/50 text-base leading-relaxed">
                        Daily Yield aggregates capital to provide liquidity for institutional-grade financial instruments. By utilizing micro-arbitrage across diversified asset classes, we deliver consistent daily payouts regardless of general market volatility.
                      </p>
                    </div>
                    <div className="p-10 glass rounded-[3rem] border border-white/5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl group-hover:bg-blue-500/10 transition-all" />
                      <h3 className="text-xl font-black mb-4 uppercase tracking-widest flex items-center gap-3">
                        <Infinity size={20} className="text-blue-400" /> Compound Plans
                      </h3>
                      <p className="text-white/50 text-base leading-relaxed">
                        From our basic entry plans to the institutional 'Celestial' tier, our framework is designed for a consistent 50% ROI on your capital. Choose your threshold, fund via Paystack, and claim your profit at the end of the specified term.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="relative">
                  <div className="absolute -left-20 top-0 w-64 h-64 bg-emerald-500/10 blur-[100px]" />
                  <h2 className="text-3xl font-black mb-12 flex items-center gap-4">
                    <Boxes className="text-emerald-400" /> Operational Framework
                  </h2>
                  <div className="grid gap-6">
                    {[
                      { 
                        title: "Liquidity Provision & Pooling", 
                        desc: "User capital is aggregated into our Institutional Liquidity Core, allowing our systems to access high-volume trading tiers with lower execution costs.",
                        icon: Coins
                      },
                      { 
                        title: "Automated Compounding", 
                        desc: "Yields are calculated and distributed every 24 hours. Users can choose to auto-reinvest for exponential growth or maintain liquidity for immediate withdrawal.",
                        icon: Sparkles
                      },
                      { 
                        title: "Paystack Verification", 
                        desc: "All incoming and outgoing transactions are processed via Paystack's secure gateway, ensuring local compliance and anti-fraud monitoring.",
                        icon: Shield
                      }
                    ].map((step, i) => (
                      <div key={i} className="flex gap-8 items-start p-10 rounded-[2.5rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400 transition-transform hover:scale-110">
                          <step.icon size={28} />
                        </div>
                        <div>
                          <h4 className="text-xl font-black mb-2 uppercase tracking-tight">{step.title}</h4>
                          <p className="text text-white/50 leading-relaxed font-medium">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Contact Support Section */}
                <section id="support" className="relative group">
                  <div className="absolute inset-0 bg-emerald-500 blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity" />
                  <div className="relative p-12 md:p-16 rounded-[4rem] bg-emerald-500 text-black overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-black/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                    <div className="max-w-2xl relative z-10">
                      <h2 className="text-5xl font-black mb-6 tracking-tighter">Global Support Central</h2>
                      <p className="font-bold text-black/70 mb-12 text-xl leading-relaxed">
                        Our institutional support desk is available 24/7. Whether you're managing a personal portfolio or corporate liquidity, we're here to help.
                      </p>
                      <div className="grid sm:grid-cols-2 gap-6">
                        <a href="mailto:infodailyyield@gmail.com" className="flex items-center gap-6 p-8 bg-black text-white rounded-[2rem] hover:scale-105 transition-all group shadow-2xl">
                          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                            <Mail className="group-hover:scale-110 transition-transform" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-black opacity-40 mb-1">Email Command</p>
                            <p className="font-black text-sm">infodailyyield@gmail.com</p>
                          </div>
                        </a>
                        <a href="https://wa.me/2349132469864" target="_blank" rel="noreferrer" className="flex items-center gap-6 p-8 bg-black text-white rounded-[2rem] hover:scale-105 transition-all group shadow-2xl">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <MessageSquare className="group-hover:scale-110 transition-transform text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-black opacity-40 mb-1">WhatsApp Direct</p>
                            <p className="font-black text-sm">+234 913 246 9864</p>
                          </div>
                        </a>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="flex justify-center pt-10">
                  <button 
                    onClick={onGetStarted}
                    className="group relative px-16 py-8 bg-white text-black font-black rounded-[2rem] text-sm uppercase tracking-[0.3em] overflow-hidden shadow-[0_20px_50px_rgba(255,255,255,0.2)]"
                  >
                    <div className="absolute inset-0 bg-emerald-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    <span className="relative z-10 transition-colors duration-500 group-hover:text-black">Initialize Dashboard</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="fixed top-6 left-0 right-0 z-50 p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3 glass px-5 py-3 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-2xl">
          <img src={logo} alt="Daily Yield Logo" className="w-8 h-8 object-contain rounded-lg shadow-lg shadow-emerald-500/10" />
          <span className="text-xl font-black tracking-tighter">
            Daily <span className="text-emerald-500">Yield</span>
          </span>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onGetStarted}
          className="px-6 py-4 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-emerald-500/20 hover:bg-emerald-400 transition-colors"
        >
          Get Started
        </motion.button>
      </nav>

      {/* Hero Section */}
      <section className="pt-48 pb-16 px-6 relative">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.2fr_1fr] gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full glass border border-white/10">
              <div className="flex -space-x-1.5">
                {[1,2,3].map(i => (
                  <div key={i} className="w-5 h-5 rounded-full border-2 border-black bg-white/10 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i+14}`} alt="User" />
                  </div>
                ))}
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">Trusted by 45,000+ Arbitrageurs</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter">
              Institutional Asset <br/>
              <span className="text-emerald-500">Yield Scaling.</span>
            </h1>
            
            <p className="text-white/40 text-lg max-w-lg leading-relaxed font-medium">
              Access the same automated liquidity strategies used by global hedge funds. Secure, scalable, and fully transparent.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5 pt-4">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onGetStarted}
                className="px-10 py-6 bg-white text-black font-black rounded-[2rem] text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-400 transition-all"
              >
                Launch App
              </motion.button>
              <button 
                onClick={() => setShowDocs(true)}
                className="px-10 py-6 glass border border-white/10 font-black rounded-[2rem] text-xs uppercase tracking-widest hover:bg-white/5 transition-all flex items-center gap-3 justify-center"
              >
                Documentation <ArrowUpRight size={16} />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-10 pt-10 border-t border-white/5">
              <div>
                <p className="text-2xl font-black tracking-tight">₦2.4B+</p>
                <p className="text-[8px] uppercase text-white/30 tracking-[0.3em] font-black mt-1.5">Assets Optimized</p>
              </div>
              <div>
                <p className="text-2xl font-black tracking-tight">50%</p>
                <p className="text-[8px] uppercase text-white/30 tracking-[0.3em] font-black mt-1.5">Net Profit ROI</p>
              </div>
              <div>
                <p className="text-2xl font-black tracking-tight text-emerald-500">99.9%</p>
                <p className="text-[8px] uppercase text-white/30 tracking-[0.3em] font-black mt-1.5">Uptime Core</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute inset-0 bg-emerald-500/10 blur-[100px] rounded-full animate-float" />
            <div className="relative group max-w-[90%] mx-auto lg:ml-auto">
              <img 
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop"
                alt="Black Tech Professionals" 
                className="relative w-full aspect-[4/5] object-cover rounded-[3rem] shadow-[0_30px_80px_-15px_rgba(0,0,0,0.5)] border border-white/10 group-hover:scale-[1.02] transition-transform duration-700"
              />
              <div className="absolute top-8 -right-8 glass p-6 rounded-[2rem] shadow-2xl border border-white/10 animate-float" style={{ animationDelay: '1s' }}>
                <TrendingUp size={24} className="text-emerald-400 mb-3" />
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Active Yield</p>
                <p className="text-xl font-black">+₦124,500.00</p>
              </div>
              <div className="absolute -bottom-8 -left-8 glass p-6 rounded-[2rem] shadow-2xl border border-white/10 animate-float" style={{ animationDelay: '2s' }}>
                <Shield size={24} className="text-blue-400 mb-3" />
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Cold Vault</p>
                <p className="text-xl font-black">Encrypted</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* App Preview Section */}
      <section className="py-24 px-6 relative overflow-hidden bg-white/[0.02]">
        <div className="max-w-7xl mx-auto space-y-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 text-emerald-400 font-black text-[10px] uppercase mx-auto">
              <Sparkles size={14} /> The Platform Experience
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
              Your Yield, <br/>
              <span className="text-emerald-500">Intelligently Unified.</span>
            </h2>
            <p className="text-white/40 text-lg leading-relaxed font-medium">
              A masterfully designed interface built for speed and precision. Swipe to explore our institutional-grade features.
            </p>
          </motion.div>

          <div className="relative">
            {/* Scroll Container */}
            <div className="flex overflow-x-auto gap-8 pb-12 snap-x snap-mandatory scrollbar-hide px-4 -mx-4">
              {[
                {
                  title: "Smart Dashboard",
                  desc: "Precision tracking for every ₦1.00 of yield.",
                  render: () => (
                    <div className="h-full w-full bg-[#0a0b12] flex flex-col pt-10 px-4">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <div className="w-4 h-4 bg-emerald-500 rounded-sm" />
                          </div>
                          <span className="text-xs font-black">CORE V1</span>
                        </div>
                        <UserCircle size={20} className="text-white/40" />
                      </div>
                      <div className="p-5 rounded-3xl bg-emerald-500 text-black mb-6 shadow-lg shadow-emerald-500/20">
                        <p className="text-[10px] font-black uppercase opacity-60">Total Value</p>
                        <h3 className="text-2xl font-black mb-4">₦1,250K</h3>
                        <div className="flex gap-2">
                          <div className="flex-1 h-8 rounded-xl bg-black/10 flex items-center justify-center text-[9px] font-black">DEPOSIT</div>
                          <div className="flex-1 h-8 rounded-xl bg-black/10 flex items-center justify-center text-[9px] font-black">WITHDRAW</div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[9px] font-black text-white/30 uppercase px-1">Active Tiers</p>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-black uppercase tracking-tighter">Starter 1</span>
                            <span className="text-[10px] text-emerald-400 font-bold">50% ROI</span>
                          </div>
                          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="w-2/3 h-full bg-emerald-500 animate-pulse" />
                          </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-black uppercase tracking-tighter">Celestial</span>
                            <span className="text-[10px] text-emerald-400 font-bold">50% ROI</span>
                          </div>
                          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="w-1/3 h-full bg-emerald-500" />
                          </div>
                        </div>
                      </div>
                      <div className="mt-8 pt-8 border-t border-white/5">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[9px] font-black text-white/20 uppercase">Next Payout</p>
                            <p className="text-sm font-black">14:23:45</p>
                          </div>
                          <TrendingUp size={24} className="text-emerald-500" />
                        </div>
                      </div>
                    </div>
                  )
                },
                {
                  title: "Referral Hub",
                  desc: "Track your 3-tier institutional network.",
                  render: () => (
                    <div className="h-full w-full bg-[#0a0b12] flex flex-col pt-10 px-4">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-xs font-black uppercase tracking-[0.2em]">Affiliate Network</span>
                        <Users size={18} className="text-emerald-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                          <p className="text-[9px] font-black text-white/30 uppercase mb-1">Direct</p>
                          <p className="text-xl font-black">124</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                          <p className="text-[9px] font-black text-white/30 uppercase mb-1">Network</p>
                          <p className="text-xl font-black">2.4K</p>
                        </div>
                      </div>
                      <div className="p-5 rounded-3xl bg-white/5 border border-white/5 mb-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 blur-2xl" />
                        <h4 className="text-xs font-black mb-4 uppercase">Earning Overview</h4>
                        <div className="space-y-4">
                          {[1,2,3].map(i => (
                            <div key={i} className="flex justify-between items-center">
                              <span className="text-[10px] font-black text-white/40 uppercase">Tier {i} Revenue</span>
                              <span className="text-xs font-black text-emerald-400">₦{15000 / i}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-auto pb-8">
                        <button className="w-full py-4 bg-emerald-500 text-black font-black text-[10px] rounded-2xl uppercase tracking-widest">
                          Copy Partner Link
                        </button>
                      </div>
                    </div>
                  )
                },
                {
                  title: "Secure Settlements",
                  desc: "Integrated Paystack & Instant Withdrawals.",
                  render: () => (
                    <div className="h-full w-full bg-[#0a0b12] flex flex-col pt-10 px-4">
                      <div className="flex justify-between items-center mb-8">
                        <span className="text-xs font-black uppercase tracking-[0.2em]">Transaction Hub</span>
                        <Shield size={18} className="text-blue-400" />
                      </div>
                      
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl border-2 border-emerald-500/20 bg-emerald-500/5">
                          <p className="text-[9px] font-black text-emerald-400 uppercase mb-2">Pending Settlement</p>
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-black tracking-tight">₦45,000.00</span>
                            <div className="px-2 py-1 bg-emerald-500/20 rounded-md text-[8px] font-black text-emerald-400">PROCESSING</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-white/30 uppercase px-1">Recent Activity</p>
                          {[1,2,3].map(i => (
                            <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg ${i === 2 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'} flex items-center justify-center`}>
                                  {i === 2 ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                </div>
                                <div className="text-left">
                                  <p className="text-[10px] font-black uppercase">{i === 2 ? 'Withdrawal' : 'Yield Credit'}</p>
                                  <p className="text-[8px] text-white/40">24 Apr, 12:05</p>
                                </div>
                              </div>
                              <span className={`text-[10px] font-black ${i === 2 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {i === 2 ? '-' : '+'}₦{(i * 1200).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mt-auto pb-8">
                        <div className="flex items-center justify-center gap-2 opacity-50">
                          <span className="text-[8px] font-black uppercase tracking-widest">Secured by Paystack</span>
                          <Lock size={10} />
                        </div>
                      </div>
                    </div>
                  )
                }
              ].map((screen, idx) => (
                <div key={idx} className="flex-shrink-0 snap-center first:pl-4 last:pr-4">
                  <div className="text-center mb-6">
                    <h4 className="font-black text-sm uppercase tracking-widest text-emerald-400">{screen.title}</h4>
                    <p className="text-[10px] text-white/30 font-black uppercase mt-1">{screen.desc}</p>
                  </div>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, rotateY: idx === 0 ? -10 : idx === 2 ? 10 : 0 }}
                    whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
                    viewport={{ once: true }}
                    className="relative w-[280px] h-[580px] bg-[#0c0d14] rounded-[3rem] border-[8px] border-[#1a1b26] shadow-2xl overflow-hidden shadow-emerald-500/5 group"
                  >
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#1a1b26] rounded-b-xl z-20" />
                    {screen.render()}
                    {/* Bottom Indicator */}
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-20 h-1 bg-white/20 rounded-full" />
                  </motion.div>
                </div>
              ))}
            </div>

            {/* Hint */}
            <div className="flex justify-center items-center gap-4 text-white/20">
              <div className="w-12 h-px bg-white/10" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Swipe to navigate</span>
              <div className="w-12 h-px bg-white/10" />
            </div>
          </div>
        </div>
      </section>

      {/* Infrastructure Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div className="space-y-3">
              <h2 className="text-emerald-500 font-black text-[9px] uppercase tracking-[0.5em]">The Ecosystem</h2>
              <h3 className="text-4xl font-black tracking-tighter max-w-lg">Deep Liquidity. <br/>Precision Execution.</h3>
            </div>
            <p className="text-white/40 text-base max-w-sm leading-relaxed font-medium">
              Our infrastructure is distributed across four continents to ensure zero-latency execution.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Coins,
                title: "Guaranteed 50% ROI",
                desc: "All investment plans—from Starter to Celestial—are engineered to deliver 50% profit on your initial capital upon term maturity.",
                img: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=2071&auto=format&fit=crop"
              },
              {
                icon: UserPlus,
                title: "Multi-Tier Referral",
                desc: "Earn passive liquidity premiums through our three-tier referral system: 10% for direct invites, 5% for Tier 2, and 3% for Tier 3 networks.",
                img: "https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=2074&auto=format&fit=crop"
              },
              {
                icon: Shield,
                title: "Secure Settlement",
                desc: "Integrated with Paystack for seamless local gateway deposits and automated instant manual withdrawals once your daily yield is credited.",
                img: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=2070&auto=format&fit=crop"
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-2 rounded-[3rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all overflow-hidden"
              >
                <div className="relative p-8 space-y-5">
                  <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-all duration-500">
                    <feature.icon size={28} />
                  </div>
                  <h4 className="text-xl font-black tracking-tight uppercase">{feature.title}</h4>
                  <p className="text-white/40 text-sm leading-relaxed font-medium">{feature.desc}</p>
                </div>
                <div className="h-48 overflow-hidden rounded-b-[2.9rem]">
                  <img 
                    src={feature.img} 
                    alt={feature.title} 
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Partners */}
      <section className="py-20 border-y border-white/5 bg-white/2">
        <div className="max-w-7xl mx-auto px-6 overflow-hidden">
          <p className="text-center text-[10px] font-black uppercase text-white/20 tracking-[0.4em] mb-12">Institutional Grade Connectivity</p>
          <div className="flex flex-wrap justify-center items-center gap-16 md:gap-24 opacity-30 grayscale hover:opacity-60 transition-opacity">
            {/* These are placeholders representing big logos */}
            <span className="text-4xl font-black tracking-tighter">BINANCE</span>
            <span className="text-4xl font-black tracking-tighter">COINBASE</span>
            <span className="text-4xl font-black tracking-tighter">KRAKEN</span>
            <span className="text-4xl font-black tracking-tighter">BYBIT</span>
            <span className="text-4xl font-black tracking-tighter">PAYSTACK</span>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative group">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500 rounded-full blur-[100px] opacity-20" />
              <img 
                src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=2070&auto=format&fit=crop" 
                alt="Black Professional Workspace" 
                className="w-full aspect-square object-cover rounded-[3rem] border border-white/10 shadow-2xl group-hover:scale-[1.02] transition-transform duration-700"
              />
            </div>

            <div className="space-y-10">
              <div className="space-y-4">
                <h2 className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.5em]">The Journey</h2>
                <h3 className="text-4xl font-black tracking-tighter">Simple Onboarding Process</h3>
                <p className="text-white/40 leading-relaxed font-medium">Join the world's most advanced asset management community in three simple steps.</p>
              </div>

              <div className="space-y-8">
                {[
                  { step: "01", title: "Global Registration", desc: "Create your institutional investor account using secure Google authentication or encrypted credentials." },
                  { step: "02", title: "Deploy Liquidity", desc: "Select an investment tier and fund your portfolio starting from ₦5,000 for a guaranteed 50% net profit." },
                  { step: "03", title: "Instant Redemption", desc: "Watch your yields accumulate in real-time. Initiate withdrawals of both capital and 50% profit manually once the term is complete." }
                ].map((s, i) => (
                  <div key={i} className="flex gap-6 group">
                    <span className="text-4xl font-black text-emerald-500/20 group-hover:text-emerald-500 transition-colors">{s.step}</span>
                    <div>
                      <h5 className="text-lg font-black mb-1 uppercase tracking-tight group-hover:text-emerald-400 transition-colors">{s.title}</h5>
                      <p className="text-white/40 text-sm font-medium leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onGetStarted}
                className="w-full sm:w-auto px-12 py-6 bg-emerald-500 text-black font-black rounded-[2rem] text-xs uppercase tracking-widest shadow-2xl"
              >
                Sign Up Now
              </motion.button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 px-6 relative">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-5xl md:text-8xl font-black tracking-tighter leading-none">
              Ready for the <br/> 
              <span className="text-emerald-500">Next Yield Cycle?</span>
            </h2>
            <p className="text-white/40 text-xl max-w-2xl mx-auto leading-relaxed">
              Join thousands of institutional clients managing liquidity with precision. Deployment takes less than 2 minutes.
            </p>
          </motion.div>

          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onGetStarted}
              className="px-16 py-8 bg-emerald-500 text-black font-black rounded-full text-sm uppercase tracking-widest shadow-[0_0_80px_rgba(16,185,129,0.3)]"
            >
              Get Started Now
            </motion.button>
            <button 
              onClick={() => setShowDocs(true)}
              className="px-16 py-8 glass border border-white/10 font-black rounded-full text-sm uppercase tracking-widest hover:bg-white/5 transition-all"
            >
              View System Protocol
            </button>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="py-20 border-t border-white/5 px-6 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-2 space-y-8">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Daily Yield Logo" className="w-10 h-10 object-contain rounded-xl" />
                <span className="text-2xl font-black tracking-tighter">Daily Yield</span>
              </div>
              <p className="text-white/30 max-w-sm font-medium leading-relaxed">
                The world's leading institutional liquidity management protocol designed for decentralized asset optimization.
              </p>
            </div>
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Resources</h4>
              <nav className="flex flex-col gap-4 text-sm font-bold text-white/50">
                <button onClick={() => setShowDocs(true)} className="hover:text-emerald-400 transition-colors text-left w-fit">Documentation</button>
                <a href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-emerald-400 transition-colors">Terms of Use</a>
                <a href="#support" onClick={() => setShowDocs(true)} className="hover:text-emerald-400 transition-colors">Support Center</a>
              </nav>
            </div>
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Connect</h4>
              <div className="flex gap-4">
                <a href="https://wa.me/2349132469864" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-2xl glass flex items-center justify-center hover:bg-emerald-500 hover:text-black transition-all">
                  <MessageSquare size={20} />
                </a>
                <a href="mailto:infodailyyield@gmail.com" className="w-12 h-12 rounded-2xl glass flex items-center justify-center hover:bg-emerald-500 hover:text-black transition-all">
                  <Mail size={20} />
                </a>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-white/5 gap-6">
            <p className="text-[10px] font-black text-white/10 uppercase tracking-widest">© 2026 Daily Yield Institutional. All Rights Reserved.</p>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-white/30 tracking-widest">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Core Systems operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const LoginScreen = ({ onGoogleLogin, onEmailLogin, onEmailSignup }: { 
  onGoogleLogin: () => void;
  onEmailLogin: (e: string, p: string) => Promise<void>;
  onEmailSignup: (e: string, p: string) => Promise<void>;
}) => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return alert("Please fill all fields");
    setLoading(true);
    try {
      if (isSignup) await onEmailSignup(email, password);
      else await onEmailLogin(email, password);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full glass p-10 rounded-[3.5rem] shadow-2xl space-y-8"
      >
        <div className="text-center">
          <img 
            src={logo} 
            alt="Daily Yield Logo" 
            className="w-20 h-20 mx-auto mb-6 object-contain rounded-2xl" 
          />
          <h1 className="text-3xl font-black text-white">Daily Yield</h1>
          <p className="text-white/40 text-xs mt-2 font-black uppercase tracking-widest">Institutional Asset Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-white/30 tracking-widest ml-2">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500/50 text-white text-sm"
              placeholder="client@dailyyield.ng"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-white/30 tracking-widest ml-2">Secure Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500/50 text-white text-sm"
              placeholder="••••••••"
            />
          </div>
          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={loading}
            className="w-full py-5 bg-emerald-500 text-black font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isSignup ? 'Create Institutional Account' : 'Secure Login')}
          </motion.button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
          <div className="relative flex justify-center text-[8px] uppercase font-black text-white/20 tracking-[0.4em]"><span className="glass px-4">Proprietary Auth</span></div>
        </div>

        <motion.button 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onGoogleLogin}
          className="w-full py-5 bg-white/5 border border-white/10 text-white font-black rounded-2xl flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest hover:bg-white/10"
        >
          <img src="https://www.gstatic.com/firebase/builtins/external/google.svg" className="w-4 h-4" alt="Google" />
          Continue with Google
        </motion.button>

        <p className="text-center text-[10px] text-white/30 font-black">
          {isSignup ? "Already a client?" : "New to Daily Yield?"}
          <button 
            onClick={() => setIsSignup(!isSignup)}
            className="text-emerald-400 ml-2 uppercase tracking-widest hover:underline"
          >
            {isSignup ? "Log In" : "Register"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

const Sidebar = ({ 
  isOpen, 
  onClose, 
  currentView, 
  setView 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  currentView: View;
  setView: (v: View) => void;
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invest', label: 'Investment Plans', icon: TrendingUp },
    { id: 'tiers', label: 'Membership Upgrade', icon: Trophy },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
    { id: 'gamehub', label: 'Game Hub', icon: Gamepad2 },
    { id: 'marketduel', label: 'Market Duel', icon: Target },
    { id: 'airdrop', label: 'Quantum Airdrops', icon: Zap },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'referral', label: 'Referral System', icon: Sparkles },
    { id: 'faq', label: 'FAQ & Support', icon: HelpCircle },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'account', label: 'Account', icon: Settings },
  ];

  if (auth.currentUser?.email === 'infodailyyield@gmail.com') {
    menuItems.push({ id: 'admin', label: 'Admin Panel', icon: Shield });
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="sidebar-container" className="fixed inset-0 z-50 overflow-hidden">
          {/* Overlay */}
          <motion.div 
            key="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0a0b12]/40 backdrop-blur-sm"
          />
          {/* Sidebar */}
            <motion.div 
            key="sidebar-content"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 left-0 h-full w-3/4 sm:w-1/4 glass-dark p-6 flex flex-col overflow-y-auto custom-scrollbar"
          >
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Daily Yield Logo" className="w-8 h-8 object-contain rounded-lg shadow-lg shadow-emerald-500/20" />
                <span className="text-2xl font-black text-white">
                  Daily <span className="text-emerald-500 underline decoration-emerald-500/30 underline-offset-8">Yield</span>
                </span>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} className="text-white" />
              </button>
            </div>

            <nav className="space-y-4">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setView(item.id as View); onClose(); }}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300",
                    currentView === item.id 
                      ? "bg-emerald-500 text-white" 
                      : "hover:bg-white/5 text-white/50"
                  )}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="mt-auto p-4 glass rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="text-xs text-white/50">Secured Account</p>
                  <p className="text-sm font-medium">Verified Client</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  const [isLanding, setIsLanding] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [view, setView] = useState<View>('dashboard');
  const [depositAmount, setDepositAmount] = useState<number>(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view') as View;
    const amountParam = params.get('amount');
    
    if (viewParam === 'deposit-request') {
      setView('deposit-request');
      if (amountParam) setDepositAmount(Number(amountParam));
      // Clean up URL
      window.history.replaceState({}, '', window.location.origin + '/');
    }
  }, []);
  const [totalLiveProfit, setTotalLiveProfit] = useState(0);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeInvestmentsData, setActiveInvestmentsData] = useState<any[]>([]);
  const [settlingIds, setSettlingIds] = useState<Set<string>>(new Set());
  const [broadcast, setBroadcast] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [pageStatus, setPageStatus] = useState<Record<string, boolean>>({
    dashboard: true,
    portfolio: true,
    gamehub: true,
    marketduel: true,
    wallet: true,
    notifications: true,
    account: true,
    invest: true,
    referral: true,
    faq: true,
    airdrop: true,
    tiers: true,
    'deposit-request': true
  });

  useEffect(() => {
    return onSnapshot(doc(db, 'system', 'page_status'), (snap) => {
      if (snap.exists()) {
        setPageStatus(snap.data() as Record<string, boolean>);
      }
    });
  }, []);

  useEffect(() => {
    testFirestoreConnection();
    return onSnapshot(doc(db, 'broadcast', 'current'), (snap) => {
      if (snap.exists()) {
        setBroadcast({ id: snap.id, ...snap.data() });
      } else {
        setBroadcast(null);
      }
    }, (err) => handleFirestoreError(err, 'get', 'broadcast'));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');
    const trxref = params.get('trxref');
    const status = params.get('status');

    if (reference || trxref || status === 'failed' || status === 'cancelled') {
      if (status === 'failed' || status === 'cancelled') {
        setPaymentStatus({
          type: 'error',
          message: 'Transaction interrupted or failed. Please try again or contact support if funds were deducted.'
        });
      } else {
        const ref = reference || trxref;
        if (ref) {
          // Show intermediate "Processing" status
          setPaymentStatus({
            type: 'success',
            message: 'Verifying deposit status... Please wait.'
          });

          // Immediately verify the transaction to update balance instantly
          fetch('/api/paystack/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference: ref })
          })
          .then(async res => {
            const data = await res.json();
            if (res.ok && data.success) {
              setPaymentStatus({
                type: 'success',
                message: 'Deposit verified. Your funds are pending manual admin approval.'
              });
              // Trigger a small vibratory notification if available
              if (window.navigator.vibrate) window.navigator.vibrate(100);
            } else {
              setPaymentStatus({
                type: 'error',
                message: data.error || 'Verification encountered an issue. Please contact support.'
              });
            }
          })
          .catch((err) => {
            console.error('Verification error:', err);
            setPaymentStatus({
              type: 'error',
              message: 'Network error during verification. We will auto-retry in the background.'
            });
          });
        }
      }

      // Clear params from URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Clear message after 10 seconds
      setTimeout(() => setPaymentStatus(null), 10000);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'investments'), where('userId', '==', user.uid || ''), where('status', '==', 'active'));
    return onSnapshot(q, (snap) => {
      setActiveInvestmentsData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'investments'));
  }, [user]);

  const globalSettleInvestment = async (inv: any) => {
    if (inv.status !== 'active' || settlingIds.has(inv.id) || !user) return;
    setSettlingIds(prev => new Set(prev).add(inv.id));
    
    try {
      const capital = Number(inv.capital) || 0;
      const rate = Number(inv.rate) || 0;
      const profit = capital * rate;
      const totalPayout = capital + profit;

      const invRef = doc(db, 'investments', inv.id);
      const userRef = doc(db, 'users', user.uid);

      await updateDoc(invRef, { status: 'completed' });
      await updateDoc(userRef, {
        balanceNGN: increment(totalPayout),
        walletBalance: increment(totalPayout),
        totalProfitNGN: increment(profit),
        activeInvestments: arrayRemove(inv.id)
      });

      await setDoc(doc(collection(db, 'transactions')), {
        userId: user.uid,
        type: 'payout',
        amount: totalPayout,
        status: 'completed',
        createdAt: serverTimestamp()
      });

      const planTitle = INVESTMENT_PLANS.find(p => p.id === inv.planId)?.title || 'Investment';
      await setDoc(doc(collection(db, 'notifications')), {
        userId: user.uid,
        title: 'Capital Matured! 💎',
        message: `Your ${planTitle} has matured. ${formatCurrency(totalPayout)} added to wallet.`,
        type: 'payout',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Settlement error:", error);
    } finally {
      // We don't remove from settlingIds because Firestore update will trigger onSnapshot 
      // which will remove it from activeInvestmentsData
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      let total = 0;
      activeInvestmentsData.forEach(inv => {
        const startTime = (inv.startTime as Timestamp)?.toDate()?.getTime() || 0;
        const endTime = (inv.endTime as Timestamp)?.toDate()?.getTime() || 0;
        
        // Auto-settlement check
        if (endTime && now >= endTime && inv.status === 'active') {
          globalSettleInvestment(inv);
        }

        if (startTime && endTime) {
          const current = Math.min(now, endTime);
          const totalDuration = endTime - startTime;
          const elapsed = current - startTime;
          const progress = totalDuration > 0 ? Math.max(0, elapsed / totalDuration) : 0;
          const capital = Number(inv.capital) || 0;
          const rate = Number(inv.rate) || 0;
          const profit = capital * rate;
          total += profit * progress;
        }
      });
      setTotalLiveProfit(isNaN(total) ? 0 : total);
    }, 1000); // Check every second for maturity
    return () => clearInterval(timer);
  }, [activeInvestmentsData, settlingIds, user]);

  const initializeUserProfile = async (user: FirebaseUser) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Investor',
        photoURL: user.photoURL,
        balanceNGN: 0,
        walletBalance: 0,
        totalProfitNGN: 0,
        totalDepositedNGN: 0,
        totalWithdrawnNGN: 0,
        activeInvestments: [],
        streak: 1,
        totalGamesPlayed: 0,
        createdAt: Timestamp.now(),
        kycStatus: "unverified",
        tier: "tier1",
        pushEnabled: true,
        referralCode: generateReferralCode(),
        totalReferrals: 0,
        referralEarnings: 0,
        hasRedeemedCode: false,
        referredBy: '',
        referrerUid: ''
      };
      await setDoc(userRef, newProfile);
    } else {
      const data = userSnap.data();
      const updates: any = {};
      
      // Repair logic for existing users
      if (!data.email && user.email) updates.email = user.email;
      if (!data.referralCode) updates.referralCode = generateReferralCode();
      if (data.walletBalance === undefined) updates.walletBalance = data.balanceNGN || 0;
      if (data.totalDepositedNGN === undefined) updates.totalDepositedNGN = 0;
      if (data.totalWithdrawnNGN === undefined) updates.totalWithdrawnNGN = 0;
      if (data.hasRedeemedCode === undefined) updates.hasRedeemedCode = data.hasRedeemed || false;
      if (data.kycStatus === undefined) updates.kycStatus = 'unverified';
      if (data.tier === undefined) updates.tier = 'tier1';
      if (data.pushEnabled === undefined) updates.pushEnabled = true;

      if (Object.keys(updates).length > 0) {
        await updateDoc(userRef, updates);
      }
    }
  };

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;
    let isInitialLoad = true;

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      // Clear previous snapshot listener if auth state changes
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (u) {
        setUser(u);
        const userRef = doc(db, 'users', u.uid);
        
        try {
          // 1. Ensure user profile exists (Sync initialization)
          await initializeUserProfile(u);
          
          // 2. Open Real-time synchronization
          unsubscribeSnapshot = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              // --- Balance Repair Logic for NaN issues ---
              if (typeof data.balanceNGN !== 'number' || isNaN(data.balanceNGN)) {
                console.warn("Detected NaN/Invalid balance for user, repairing...");
                updateDoc(userRef, { balanceNGN: 0 });
              }
              if (typeof data.totalProfitNGN !== 'number' || isNaN(data.totalProfitNGN)) {
                updateDoc(userRef, { totalProfitNGN: 0 });
              }
              if (data.isWalletFrozen === undefined) {
                updateDoc(userRef, { isWalletFrozen: false });
              }
              
              setProfile({ ...data, uid: u.uid } as UserProfile);
              
              // Enable Push Notifications if not already
              if (isInitialLoad) {
                setTimeout(async () => {
                   const granted = await askNotificationPermission();
                   if (granted) {
                     await subscribeUserToPush(u.uid);
                   }
                }, 3000);
              }
              
              // Only release loading state after first full sync
              if (isInitialLoad) {
                isInitialLoad = false;
                setLoading(false);
              }
            } else {
              // Fallback just in case profile isn't found immediately
              if (isInitialLoad) {
                isInitialLoad = false;
                setLoading(false);
              }
            }
          }, (err) => {
            console.error("User Snapshot Error:", err);
            handleFirestoreError(err, 'get', 'users');
            if (isInitialLoad) {
              isInitialLoad = false;
              setLoading(false);
            }
          });
        } catch (err) {
          console.error("Full Sync Error:", err);
          if (isInitialLoad) {
            isInitialLoad = false;
            setLoading(false);
          }
        }
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
        isInitialLoad = false;
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await initializeUserProfile(result.user);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-blocked') {
        alert("Sign-in popup was blocked! Please allow popups for this site or click the 'Sign In' button again. Most browsers show a blocked icon in the address bar.");
      } else {
        alert("Sign in failed: " + (err.message || "Unknown error"));
      }
    }
  };

  const handleEmailSignup = async (email: string, pass: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await initializeUserProfile(result.user);
  };

  const handleEmailLogin = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const handleLogOut = async () => {
    try {
      await signOut(auth);
      setView('dashboard');
      setIsLanding(true);
    } catch (err) {
      console.error(err);
    }
  };

  // --- Actions ---
  const handleCheckIn = async () => {
    if (!user || !profile) return;
    const now = new Date();
    const lastCheck = profile.lastCheckIn?.toDate();
    const isToday = lastCheck && lastCheck.toDateString() === now.toDateString();
    
    if (isToday) {
      alert("You've already claimed your yield today!");
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const bonus = 50; 
    await updateDoc(userRef, {
      balanceNGN: increment(bonus),
      walletBalance: increment(bonus),
      streak: increment(1),
      lastCheckIn: serverTimestamp()
    });
    
    await setDoc(doc(collection(db, 'transactions')), {
      userId: user.uid,
      type: 'payout',
      amount: bonus,
      status: 'completed',
      createdAt: serverTimestamp()
    });

    await setDoc(doc(collection(db, 'notifications')), {
      userId: user.uid,
      title: 'Daily Streak!',
      message: `You earned ${formatCurrency(bonus)} for your check-in.`,
      type: 'payout',
      createdAt: serverTimestamp()
    });
  };

  const invest = async (planId: string, capital: number, days: number, rate: number) => {
    if (!user || !profile) return;
    if (profile.isWalletFrozen) {
      alert("Transaction Denied: Your wallet is frozen. You cannot purchase new investment plans at this time.");
      return;
    }
    const currentBalance = Number(profile.balanceNGN) || 0;
    if (currentBalance < capital) {
      alert(`Insufficient balance. Deposit first. (Min: ${formatCurrency(capital)})`);
      setView('wallet');
      return;
    }

    const expectedPayout = capital + (capital * rate);
    const confirm = window.confirm(`Confirm Investment Plan?\n\nCapital: ${formatCurrency(capital)}\nRate: ${rate * 100}%\nDuration: ${days} Days\nExpected Payout: ${formatCurrency(expectedPayout)}\n\n₦${capital.toLocaleString()} will be deducted immediately.`);
    
    if (!confirm) return;

    const now = Timestamp.now();
    const endTime = new Timestamp(now.seconds + (days * 24 * 60 * 60), 0);
    
    const invRef = doc(collection(db, 'investments'));
    await setDoc(invRef, {
      userId: user.uid,
      planId,
      capital,
      rate,
      durationDays: days,
      startTime: now,
      endTime: endTime,
      status: 'active',
      currentProfit: 0,
      expectedPayout,
      pushNotified: false
    });

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      balanceNGN: increment(-capital),
      walletBalance: increment(-capital),
      activeInvestments: arrayUnion(invRef.id)
    });

    await setDoc(doc(collection(db, 'transactions')), {
      userId: user.uid,
      type: 'investment',
      amount: capital,
      status: 'completed',
      createdAt: serverTimestamp()
    });

    setView('portfolio');
  };

  const deposit = async (amount: number) => {
    if (!user || !profile) return;
    if (isNaN(amount) || amount < 3000) {
      alert("Minimum deposit is ₦3,000");
      return;
    }

    try {
      // Redirect to secure backend to initialize Paystack session
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          amount: amount,
          userId: user.uid,
          callbackUrl: window.location.origin + '/?view=deposit-request&amount=' + amount,
        }),
      });

      const resData = await response.json();

      if (resData.status && resData.data.authorization_url) {
        // Hand off to Paystack's secure payment page
        window.location.href = resData.data.authorization_url;
      } else {
        alert(resData.message || "Unable to start transaction. Please try again.");
      }
    } catch (err: any) {
      console.error("Deposit Initiation Failed:", err);
      alert("Connection error. Please check your internet and try again.");
    }
  };

  const withdraw = async (amount: number, details?: any) => {
    if (!user || !profile) return;
    if (profile.isWalletFrozen) {
      alert("Withdrawal Terminated: Your wallet is currently frozen by administration. Please contact support.");
      return;
    }
    if (profile.kycStatus !== 'verified') {
      alert("KYC Verification Required! Please verify your identity in Account Settings to enable withdrawals.");
      setView('account');
      return;
    }

    // Tier-based Withdrawal Limits (User Specified)
    const withdrawalLimits: any = {
      tier1: { min: 15000, max: 15000 },
      tier2: { min: 15000, max: 50000 },
      tier3: { min: 15000, max: 80000 },
      premium: { min: 15000, max: Infinity }
    };

    const currentTier = profile.tier || 'tier1';
    const { min, max } = withdrawalLimits[currentTier];

    if (amount < min) {
      alert(`Minimum withdrawal for your tier (${currentTier.toUpperCase()}) is ${formatCurrency(min)}`);
      return;
    }

    if (amount > max) {
      alert(`Maximum withdrawal for your tier (${currentTier.toUpperCase()}) is ${formatCurrency(max)}`);
      return;
    }

    const currentBalance = Number(profile.balanceNGN) || 0;
    if (currentBalance < amount) {
      alert("Insufficient balance for withdrawal.");
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      // Deduct immediately
      await updateDoc(userRef, {
        balanceNGN: increment(-amount),
        walletBalance: increment(-amount)
      });

      const withdrawalRef = doc(collection(db, 'withdrawals'));
      await setDoc(withdrawalRef, {
        userId: user.uid,
        userEmail: profile.email,
        tier: profile.tier,
        amount: amount,
        status: 'pending',
        details: details || {},
        createdAt: serverTimestamp()
      });

      // Transaction log as pending/requested
      await setDoc(doc(collection(db, 'transactions')), {
        userId: user.uid,
        type: 'withdrawal',
        amount: amount,
        status: 'requested',
        createdAt: serverTimestamp(),
        description: 'Withdrawal request initiated'
      });

      alert("Withdrawal request submitted for processing.");
    } catch (err: any) {
      handleFirestoreError(err, 'write', 'withdrawals');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    if (isLanding) {
      return <LandingPage onGetStarted={() => setIsLanding(false)} />;
    }
    return (
      <div className="relative min-h-screen">
        <button 
          onClick={() => setIsLanding(true)}
          className="fixed top-6 left-6 z-50 glass p-3 rounded-2xl hover:bg-white/10 transition-all text-white/40 hover:text-white"
        >
          <X size={20} />
        </button>
        <LoginScreen 
          onGoogleLogin={handleGoogleLogin} 
          onEmailLogin={handleEmailLogin} 
          onEmailSignup={handleEmailSignup} 
        />
      </div>
    );
  }

  if (profile?.banned) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0b12] text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg glass p-12 rounded-[3.5rem] border border-red-500/20"
        >
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-8">
            <Ban size={40} />
          </div>
          <h1 className="text-3xl font-black text-white mb-6">Account Banned</h1>
          <p className="text-white/60 mb-10 leading-relaxed">
            Your account has been banned due to suspicious and full activities. 
            To appeal this account, send your User ID to Telegram: 
            <span className="block mt-4 text-emerald-400 font-bold text-lg">+2347042255699</span>
          </p>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 mb-8">
            <p className="text-[10px] uppercase font-black text-white/30 mb-2">User Identification (UID)</p>
            <p className="font-mono text-sm text-white font-bold">{user.uid}</p>
          </div>
          <button 
            onClick={handleLogOut}
            className="px-10 py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            Sign Out
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-app)] overflow-x-hidden">
      {/* Payment Status Notification Overlay */}
      <AnimatePresence>
        {paymentStatus && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-0 left-0 right-0 z-[2000] p-4 flex justify-center pointer-events-none"
          >
            <div className={cn(
              "max-w-md w-full glass p-6 rounded-[2.5rem] flex items-start gap-4 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] pointer-events-auto border backdrop-blur-2xl transition-all",
              paymentStatus.type === 'success' ? "border-emerald-500/40" : "border-red-500/40"
            )}>
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                paymentStatus.type === 'success' ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-500"
              )}>
                {paymentStatus.type === 'success' ? <CheckCircle2 size={28} /> : <AlertCircle size={28} />}
              </div>
              <div className="flex-1 pt-1">
                <h3 className="font-black text-white text-[10px] uppercase tracking-[0.3em] mb-2 leading-none">
                  {paymentStatus.type === 'success' ? 'Deposit Initiated' : 'Transaction Alert'}
                </h3>
                <p className="text-white/60 text-xs font-medium leading-relaxed">{paymentStatus.message}</p>
              </div>
              <button 
                onClick={() => setPaymentStatus(null)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all group mt-1"
              >
                <X size={18} className="text-white/20 group-hover:text-white transition-colors" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Background decoration - Updated to Midnight Ink */}
        <div className="fixed inset-0 -z-10 bg-[var(--color-bg-app)]" />

      {/* Header */}
      {/* Header */}
      <header className="max-w-[98%] mx-auto flex items-center justify-between mb-8 pt-4">
        <div className="flex items-center gap-6">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsSidebarOpen(true)}
            className="p-3 glass rounded-2xl hover:bg-white/20 transition-all cursor-pointer"
          >
            <Menu size={24} />
          </motion.button>
          
          <div className="block leading-none">
            <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black mb-1 opacity-40">Financial Gateway</p>
            <h1 className="text-sm sm:text-xl font-black text-white flex items-center gap-2">
              Welcome, <span className="text-emerald-400">{profile?.displayName || 'Investor'}</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setView('notifications')}
            className={cn(
              "p-3 glass rounded-2xl relative transition-all",
              view === 'notifications' ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "hover:bg-white/10"
            )}
          >
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-slate-950" />
          </motion.button>

          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-3 glass p-2 pr-4 rounded-2xl shadow-xl cursor-pointer hover:bg-white/5 transition-all border border-white/5"
          >
             {profile?.photoURL ? (
               <img src={profile.photoURL} alt="Profile" className="w-10 h-10 rounded-xl object-cover border border-white/10" referrerPolicy="no-referrer" />
             ) : (
               <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                 <UserCircle size={24} />
               </div>
             )}
             <div className="text-left leading-tight hidden xs:block">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-tighter">Premium Account</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold truncate max-w-[80px] text-white">{profile?.displayName || 'Investor'}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
             </div>
          </motion.div>
        </div>
      </header>



      {/* Global Broadcast Banner - Context-Aware and Styled */}
      <AnimatePresence>
        {broadcast && broadcast.message && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              "max-w-[98%] mx-auto mb-10 p-5 rounded-[2rem] border flex items-center gap-5 shadow-2xl backdrop-blur-xl relative overflow-hidden",
              broadcast.type === 'warning' ? "bg-orange-500/10 border-orange-500/20 text-orange-400" :
              broadcast.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
              "bg-blue-500/10 border-blue-500/20 text-blue-400"
            )}
          >
            {/* Background Accent */}
            <div className={cn(
              "absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-20 rounded-full",
              broadcast.type === 'warning' ? "bg-orange-500" :
              broadcast.type === 'success' ? "bg-emerald-500" :
              "bg-blue-500"
            )} />
            
            <div className={cn(
              "w-12 h-12 rounded-[1.2rem] flex items-center justify-center shrink-0 shadow-inner",
              broadcast.type === 'warning' ? "bg-orange-500/20 shadow-orange-500/10" :
              broadcast.type === 'success' ? "bg-emerald-500/20 shadow-emerald-500/10" :
              "bg-blue-500/20 shadow-blue-500/10"
            )}>
              {broadcast.type === 'warning' ? <AlertCircle size={24} /> :
               broadcast.type === 'success' ? <CheckCircle2 size={24} /> :
               <Bell size={24} />}
            </div>
            
            <div className="flex-1 min-w-0 overflow-hidden relative">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Institutional Broadcast</p>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full animate-pulse",
                  broadcast.type === 'warning' ? "bg-orange-500" :
                  broadcast.type === 'success' ? "bg-emerald-500" :
                  "bg-blue-500"
                )} />
              </div>
              <div className="w-full overflow-hidden">
                <p 
                  className="text-sm sm:text-base font-black leading-tight uppercase tracking-widest animate-marquee"
                  style={{ 
                    '--marquee-duration': `${Math.max(10, broadcast.message.length * 0.15)}s` 
                  } as React.CSSProperties}
                >
                  {broadcast.message}
                </p>
              </div>
            </div>

            {broadcast.type === 'warning' && (
              <div className="hidden md:block shrink-0 px-4 py-2 bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl">
                 URGENT ACTION
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        currentView={view}
        setView={setView}
      />

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        profile={profile} 
        user={user}
        onLogOut={handleLogOut}
      />

      <main className="max-w-[98%] mx-auto w-full">
        <AnimatePresence mode="wait">
          {pageStatus[view] === false && view !== 'admin' ? (
            <PageUnavailableView key="unavailable" onBack={() => setView('dashboard')} />
          ) : (
            <>
              {view === 'dashboard' && (
            <Dashboard 
              profile={profile} 
              onCheckIn={handleCheckIn} 
              onInvest={invest} 
              setView={setView}
              totalLiveProfit={totalLiveProfit}
              onDeposit={() => setView('wallet')}
              onWithdraw={() => setView('wallet')}
            />
          )}
          {view === 'portfolio' && (
            <Portfolio userId={user?.uid} now={Date.now()} />
          )}
          {view === 'gamehub' && (
            <GameHub profile={profile} pageStatus={pageStatus} />
          )}
          {view === 'wallet' && (
            <WalletView profile={profile} userId={user?.uid} onDeposit={deposit} onWithdraw={withdraw} />
          )}
          {view === 'notifications' && (
            <Notifications userId={user?.uid} />
          )}
          {view === 'marketduel' && (
            <MarketDuel profile={profile} pageStatus={pageStatus} />
          )}
          {view === 'referral' && (
            <ReferralPage profile={profile} onNavigate={setView} />
          )}
          {view === 'faq' && (
            <FAQPage />
          )}
          {view === 'airdrop' && (
            <AirdropHub profile={profile} />
          )}
          {view === 'tiers' && (
            <TiersPage profile={profile} />
          )}
          {view === 'account' && (
            <AccountSettings profile={profile} user={user} onLogOut={handleLogOut} setView={setView} />
          )}
          {view === 'admin' && user?.email === 'infodailyyield@gmail.com' && (
            <AdminPanel pageStatus={pageStatus} />
          )}
          {view === 'invest' && (
            <InvestmentPage onInvest={invest} />
          )}
          {view === 'deposit-request' && (
            <DepositRequestPage profile={profile} prefillAmount={depositAmount} setView={setView} />
          )}
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  </div>
);
}

// --- View Components ---

const PerformanceChart = ({ liveVal }: { liveVal: number }) => {
  const data = [
    { name: '4h', value: liveVal * 0.8 },
    { name: '3h', value: liveVal * 0.85 },
    { name: '2h', value: liveVal * 0.9 },
    { name: '1h', value: liveVal * 0.95 },
    { name: 'NOW', value: liveVal },
  ];

  return (
    <div className="h-48 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
          />
          <YAxis hide />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', fontSize: '10px' }}
            itemStyle={{ color: '#10b981' }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#10b981" 
            fillOpacity={1} 
            fill="url(#colorValue)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

function Dashboard({ profile, onCheckIn, onInvest, setView, totalLiveProfit, onDeposit, onWithdraw }: { 
  profile: UserProfile | null, 
  onCheckIn: () => void,
  onInvest: (pId: string, cap: number, d: number, r: number) => void,
  setView: (v: View) => void,
  totalLiveProfit: number,
  onDeposit: () => void,
  onWithdraw: () => void
}) {
  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 pb-20"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Wallet Balance Card - FIRST CARD */}
        <div className="glass p-8 rounded-[2.5rem] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
              <Wallet size={120} />
           </div>
           <div className="relative z-10">
              <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.4em] mb-2">Available Liquidity</p>
              <h2 className="text-4xl sm:text-5xl font-black mb-10 tracking-tight flex items-center gap-3">
                 {profile ? formatCurrency(profile.balanceNGN) : '₦0.00'}
                 {profile?.isWalletFrozen && (
                   <motion.span 
                     initial={{ scale: 0 }}
                     animate={{ scale: 1 }}
                     className="p-2 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 shadow-lg shadow-red-500/5" 
                     title="Wallet Frozen"
                   >
                      <Lock size={20} className="animate-pulse" />
                   </motion.span>
                 )}
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                 <button 
                  onClick={onDeposit}
                  className="flex items-center justify-center gap-3 py-4 bg-emerald-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                 >
                    <Plus size={16} strokeWidth={3} /> Deposit
                 </button>
                 <button 
                  onClick={onWithdraw}
                  className="flex items-center justify-center gap-3 py-4 bg-white/5 hover:bg-emerald-500 hover:text-white text-white font-black rounded-2xl text-[10px] uppercase tracking-widest border border-white/10 active:scale-95 transition-all"
                 >
                    <ArrowUpRight size={16} strokeWidth={3} /> Withdraw
                 </button>
              </div>
           </div>
        </div>

        {/* Performance Stats Column */}
        <div className="space-y-4">
          <div className="glass p-6 rounded-3xl flex items-center justify-between border border-white/10 shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-white/40 text-[10px] font-black uppercase mb-1">Live Asset Yield</p>
              <p className="text-2xl font-black text-emerald-400">+{formatCurrency(totalLiveProfit)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 relative z-10">
              <TrendingUp size={24} />
            </div>
          </div>
          
          <div className="glass p-6 rounded-3xl flex items-center justify-between border border-white/10 shadow-xl">
            <div>
              <p className="text-white/40 text-[10px] font-black uppercase mb-1">Daily Streak</p>
              <p className="text-2xl font-black">{profile?.streak || 0} Sessions</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400">
              <Trophy size={24} />
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCheckIn}
            className="w-full py-5 bg-emerald-500 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-3xl shadow-xl shadow-emerald-500/20 transition-all hover:brightness-110"
          >
            Collect Daily Yield
          </motion.button>
        </div>

        {/* Summary Card */}
        <div className="glass p-6 rounded-3xl flex flex-col justify-between border border-white/10 shadow-xl">
           <div>
              <p className="text-white/40 text-[10px] font-black uppercase mb-1">Cumulative Profit</p>
              <p className="text-3xl font-black">{formatCurrency(profile?.totalProfitNGN)}</p>
           </div>
           <div className="pt-6 border-t border-white/10 mt-6">
              <div className="flex justify-between items-center mb-2">
                 <span className="text-[10px] text-white/30 uppercase font-bold">Account Tier</span>
                 <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">{profile?.tier}</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full bg-emerald-500 w-[65%]" />
              </div>
           </div>
        </div>
      </div>

      {/* Total Yield Performance Card with Graph - DIRECTLY BELOW WALLET */}
      <div className="glass p-10 rounded-[3rem] relative overflow-hidden group border border-white/10 shadow-2xl">
        <div className="flex justify-between items-start relative z-10 mb-8">
          <div>
            <h3 className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] mb-2 leading-none opacity-50 underline decoration-emerald-500/30 underline-offset-8">Total Yield Performance</h3>
            <p className="text-4xl font-black text-white flex items-baseline gap-3">
              {profile ? formatCurrency(profile.totalProfitNGN + totalLiveProfit) : '₦0.00'}
              <span className="text-xs font-medium text-emerald-400 font-mono">+{formatCurrency(totalLiveProfit)} live</span>
            </p>
          </div>
          <div className="flex gap-3 text-[10px] bg-white/5 p-1.5 rounded-xl border border-white/5">
            <span className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg font-black uppercase tracking-widest">Live Tracking</span>
          </div>
        </div>
        
        <PerformanceChart liveVal={profile?.totalProfitNGN || 0 + totalLiveProfit} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <StatBox label="Active Plans" value={profile?.activeInvestments?.length?.toString() || "0"} icon={Briefcase} color="text-emerald-400" />
        <StatBox label="Total Profit" value={profile ? formatCurrency(profile.totalProfitNGN) : "₦0"} icon={TrendingUp} color="text-emerald-400" />
        <StatBox label="Game Hub" value={profile?.totalGamesPlayed?.toString() || "0"} icon={Gamepad2} color="text-emerald-400" />
        <StatBox label="Account Status" value="Verified" icon={Shield} color="text-emerald-400" />
      </div>

      <div className="flex justify-between items-end mt-12 mb-4">
        <div>
          <h2 className="text-2xl font-black">Featured Assets</h2>
          <p className="text-white/40 text-[10px] uppercase font-black tracking-widest">Entry-level yield opportunities</p>
        </div>
        <button onClick={() => setView('invest')} className="text-[10px] text-emerald-400 font-black uppercase tracking-widest hover:underline">View All Plans</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
        {INVESTMENT_PLANS.slice(0, 2).map(plan => (
          <PlanCard 
            key={plan.id}
            title={plan.title} 
            duration={`${plan.days} Days`} 
            roi={`${plan.rate * 100}%`} 
            detail={`Fixed amount asset with ${plan.rate * 100}% return.`} 
            min={formatCurrency(plan.capital)} 
            onInvest={() => onInvest(plan.id, plan.capital, plan.days, plan.rate)}
          />
        ))}
      </div>
    </motion.div>
  );
}

function StatBox({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) {
  return (
    <div className="glass p-4 rounded-3xl border border-white/10">
      <div className={cn("p-2 rounded-xl bg-white/5 mb-3 inline-block", color)}>
        <Icon size={16} />
      </div>
      <p className="text-white/40 text-[10px] font-bold uppercase mb-1">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function PlanCard({ title, duration, roi, detail, min, highlight, onInvest }: { 
  title: string, duration: string, roi: string, detail: string, min: string, highlight?: boolean, onInvest: () => void, key?: any
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "p-8 rounded-[2.5rem] flex flex-col justify-between h-full relative overflow-hidden transition-all group",
        highlight 
          ? "bg-emerald-600 text-white shadow-2xl shadow-emerald-500/20 border-none" 
          : "glass border border-white/10 bg-white/5"
      )}
    >
      {/* Decorative accent for high-end feel */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full translate-x-12 -translate-y-12 opacity-30",
        highlight ? "bg-white" : "bg-emerald-500"
      )} />

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className={cn(
            "p-4 rounded-2xl shadow-inner",
            highlight ? "bg-white/20" : "bg-emerald-500/10 text-emerald-400"
          )}>
            <TrendingUp size={24} />
          </div>
          {highlight && (
            <div className="px-3 py-1 rounded-full bg-white/20 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
              <Sparkles size={10} /> Popular
            </div>
          )}
        </div>

        <h4 className={cn(
          "text-[10px] font-black uppercase tracking-[0.3em] mb-2",
          highlight ? "text-white/60" : "text-emerald-400/80"
        )}>
          {title} Plan
        </h4>
        <p className="text-3xl font-black mb-3 text-white">{duration}</p>
        <p className={cn(
          "text-xs leading-relaxed mb-8",
          highlight ? "text-white/80" : "text-white/40"
        )}>
          {detail}
        </p>
      </div>
      
      <div className="mt-auto relative z-10">
        <div className="p-5 rounded-3xl bg-white/10 border border-white/10 mb-6 backdrop-blur-md">
          <div className="flex justify-between items-end">
            <div>
              <p className={cn(
                "text-[8px] uppercase font-black tracking-widest mb-1",
                highlight ? "text-white/40" : "text-white/20"
              )}>Expected ROI</p>
              <p className="text-2xl font-black text-white">{roi}</p>
            </div>
            <div className="text-right">
              <p className={cn(
                "text-[8px] uppercase font-black tracking-widest mb-1",
                highlight ? "text-white/40" : "text-white/20"
              )}>Entry Capital</p>
              <p className="text-lg font-black text-white">{min}</p>
            </div>
          </div>
        </div>

        <button 
          onClick={onInvest}
          className={cn(
            "w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2",
            highlight 
              ? "bg-white text-emerald-700 shadow-xl shadow-black/10" 
              : "bg-emerald-500 text-white shadow-xl shadow-emerald-500/20"
          )}
        >
          Activate Asset <ArrowUpRight size={14} />
        </button>
      </div>
    </motion.div>
  );
}

function InvestmentPage({ onInvest }: { onInvest: (pId: string, cap: number, d: number, r: number) => void }) {
  return (
    <motion.div
      key="invest"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="space-y-12 pb-20"
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-black">Investment Plans</h2>
        <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.4em]">High-yield fixed-income asset registry</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {INVESTMENT_PLANS.map((plan, i) => (
          <PlanCard 
            key={plan.id}
            title={plan.title} 
            duration={`${plan.days} Days`} 
            roi="50% Profit" 
            detail={`Fixed asset with 50% guaranteed profit of ${formatCurrency(plan.capital * 0.5)} over ${plan.days} days.`} 
            min={formatCurrency(plan.capital)} 
            highlight={i % 4 === 0}
            onInvest={() => onInvest(plan.id, plan.capital, plan.days, plan.rate)}
          />
        ))}
      </div>
    </motion.div>
  );
}

function Portfolio({ userId, now }: { userId?: string, now: number }) {
  const [investments, setInvestments] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'investments'), where('userId', '==', userId || ''), orderBy('startTime', 'desc'));
    return onSnapshot(q, (snap) => {
      setInvestments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'investments'));
  }, [userId]);

  const calculateLiveProfit = (inv: any) => {
    const startTime = (inv.startTime as Timestamp)?.toDate()?.getTime() || 0;
    const endTime = (inv.endTime as Timestamp)?.toDate()?.getTime() || 0;
    
    if (!startTime || !endTime) return 0;
    
    const current = Math.min(now, endTime);
    const totalDuration = endTime - startTime;
    const elapsed = current - startTime;
    const progress = totalDuration > 0 ? Math.max(0, elapsed / totalDuration) : 0;
    
    const capital = Number(inv.capital) || 0;
    const rate = Number(inv.rate) || 0;
    const totalProfit = capital * rate;
    return totalProfit * progress;
  };

  useEffect(() => {
    // Settlement is handled globally in App component
  }, [investments, now]);

  return (
    <motion.div
      key="portfolio"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-20"
    >
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-black">My Portfolio</h2>
        <div className="px-4 py-2 glass rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5">
          {investments.filter(i => i.status === 'active').length} Active Assets
        </div>
      </div>

      {investments.length === 0 ? (
        <div className="glass p-16 rounded-[2.5rem] text-center border border-white/5">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 text-white/20">
            <Briefcase size={40} />
          </div>
          <p className="text-xl font-black mb-2">Initialize Your Wealth</p>
          <p className="text-white/40 text-sm mb-8 px-10">Start your first fixed-income investment today and watch your yield grow live.</p>
          <button className="px-10 py-4 bg-emerald-500 text-black font-black rounded-2xl shadow-xl shadow-emerald-500/10 active:scale-95 transition-all uppercase text-xs tracking-widest">Launch Assets</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {investments.map(inv => {
            const liveProfit = calculateLiveProfit(inv);
            const isCompleted = inv.status === 'completed';
            const startTime = (inv.startTime as Timestamp)?.toDate()?.getTime() || 0;
            const endTime = (inv.endTime as Timestamp)?.toDate()?.getTime() || 0;
            const timeLeft = Math.max(0, endTime - now);
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            return (
              <div key={inv.id} className={cn(
                "glass p-8 rounded-[2.5rem] flex flex-col gap-8 border transition-all relative overflow-hidden group",
                isCompleted ? "opacity-60 border-transparent" : "border-white/5 bg-white/5 shadow-2xl"
              )}>
                {!isCompleted && (
                   <div className="absolute top-0 left-0 h-1 bg-emerald-500 transition-all duration-1000" style={{ width: `${Math.min(100, ((now - startTime) / (endTime - startTime)) * 100)}%` }} />
                )}

                <div className="flex justify-between items-start">
                  <div className="flex gap-4 items-center">
                    <div className={cn(
                      "w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-inner",
                      isCompleted ? "bg-white/5 text-white/20" : "bg-emerald-500/10 text-emerald-400"
                    )}>
                      {isCompleted ? <CheckCircle2 size={32} /> : <TrendingUp size={32} />}
                    </div>
                    <div>
                      <p className="font-black text-2xl">
                        {INVESTMENT_PLANS.find(p => p.id === inv.planId)?.title || 'Custom Plan'}
                      </p>
                      <p className="text-[10px] text-white/40 font-black uppercase tracking-widest leading-none mt-1">Asset Class: Celestial</p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-inner",
                    inv.status === 'active' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-white/30 border border-white/5"
                  )}>
                    {inv.status}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div>
                    <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Amount Invested</p>
                    <p className="font-black text-xl">{formatCurrency(inv.capital)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Expected Payout</p>
                    <p className="font-black text-xl text-emerald-400">{formatCurrency(inv.expectedPayout || (inv.capital * (1 + inv.rate)))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Live Profit</p>
                    <p className={cn(
                      "font-black text-xl flex items-center gap-2",
                      isCompleted ? "text-white/40" : "text-emerald-400"
                    )}>
                      {formatCurrency(isCompleted ? (inv.capital * inv.rate) : liveProfit)}
                      {!isCompleted && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Countdown Timer</p>
                    <p className="font-black text-xl font-mono tabular-nums opacity-80">
                      {isCompleted ? 'MATURED' : `${days}d ${hours}h ${minutes}m ${seconds}s`}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-white/5">
                   <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-white/20" />
                      <p className="text-[10px] font-black uppercase text-white/20 tracking-widest">End Date: {new Date(endTime).toLocaleDateString()}</p>
                   </div>
                   {!isCompleted && (
                      <p className="text-[10px] font-black uppercase text-emerald-400/50 tracking-widest animate-pulse">Earning Live Yield...</p>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function GameHub({ profile, pageStatus }: { profile: UserProfile | null, pageStatus: Record<string, any> }) {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<string | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'result'>('idle');
  const [gameResult, setGameResult] = useState<{ won: boolean, amount: number, message: string } | null>(null);
  const [gameData, setGameData] = useState<any>(null);

  const games = [
    { id: 'dice', title: 'Daily Dice', fee: 50, reward: 200, color: 'from-orange-500 to-red-500', icon: Dices, description: 'Roll 7, 11 or Double 6 to win' },
    { id: 'spin', title: 'Lucky Spin', fee: 125, reward: 1000, color: 'from-purple-500 to-blue-500', icon: RefreshCw, description: 'Spin the wheel for big prizes' },
    { id: 'cards', title: 'High Yield Cards', fee: 250, reward: 1000, color: 'from-emerald-500 to-cyan-500', icon: Files, description: 'Pick the right card for ₦1,000' },
    { id: 'flip', title: 'Naira Flip', fee: 25, reward: 45, color: 'from-yellow-500 to-amber-600', icon: Coins, description: 'Heads or Tails? Instant dub' },
    { id: 'rush', title: 'Number Rush', fee: 75, reward: 300, color: 'from-blue-600 to-indigo-700', icon: Target, description: 'Guess the number in 3 tries' },
    { id: 'box', title: 'Lucky Box', fee: 100, reward: 1000, color: 'from-pink-500 to-rose-600', icon: Boxes, description: '9 boxes. 3 prizes. Pick 1' },
    { id: 'tap', title: 'Quick Tap', fee: 38, reward: 125, color: 'from-cyan-400 to-blue-500', icon: Pointer, description: '15 taps in 3 seconds' },
    { id: 'color', title: 'Color Match', fee: 63, reward: 375, color: 'from-green-400 to-emerald-600', icon: Sparkles, description: '5 rounds of color matching' },
    { id: 'crash', title: 'Crash Point', fee: 125, reward: 1000, color: 'from-slate-700 to-slate-900', icon: Zap, description: 'Cash out before the crash' },
    { id: 'scratch', title: 'Scratch Win', fee: 50, reward: 250, color: 'from-amber-400 to-orange-500', icon: Scratch, description: 'Match 3 symbols to win' },
    { id: 'hunt', title: 'Treasure Hunt', fee: 150, reward: 750, color: 'from-amber-700 to-yellow-800', icon: Gift, description: 'Find the ₦750 chest' },
    { id: 'timer', title: 'Timer Bet', fee: 88, reward: 163, color: 'from-violet-500 to-purple-700', icon: Timer, description: 'Odd or Even countdown stop' },
    { id: 'drop', title: 'Ball Drop', fee: 200, reward: 1000, color: 'from-red-500 to-rose-700', icon: ArrowDownCircle, description: 'Watch the ball hit the jackpot' },
    { id: 'wheel', title: 'Fortune Wheel', fee: 50, reward: 500, color: 'from-indigo-500 to-blue-700', icon: Disc, description: '12 sections. Up to ₦1,000' },
    { id: 'pick', title: 'Pick & Match', fee: 75, reward: 250, color: 'from-emerald-600 to-teal-800', icon: Grid, description: 'Find 3 pairs of matching cards' },
    { id: 'rocket', title: 'Rocket Cash', fee: 100, reward: 1000, color: 'from-orange-600 to-red-800', icon: Rocket, description: 'Multiplier climb. Cash out quick' },
    { id: 'lucky', title: 'Lucky Numbers', fee: 63, reward: 300, color: 'from-lime-500 to-green-700', icon: Hash, description: 'Pick 1 of 20. 3 chances to win' },
    { id: 'chest', title: 'Chest Royale', fee: 125, reward: 1000, color: 'from-amber-500 to-yellow-700', icon: Archive, description: '5 chests. One contains ₦1k' },
  ];

  const handleStartGame = async (gameId: string, fee: number) => {
    if (!profile) return;

    if (pageStatus.game_locks && pageStatus.game_locks[gameId]) {
      alert("This game module is currently locked by central administration.");
      return;
    }

    if (profile.isWalletFrozen) {
      alert("Transaction Denied: Your wallet is frozen. You cannot pay game fees at this time.");
      return;
    }

    const currentBalance = Number(profile.balanceNGN) || 0;
    if (currentBalance < fee) {
      alert("Insufficient balance. Deposit first.");
      return;
    }

    setIsInitializing(gameId);

    try {
      // Deduct fee immediately
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        balanceNGN: increment(-fee),
        walletBalance: increment(-fee),
        totalGamesPlayed: increment(1)
      });

      await setDoc(doc(collection(db, 'transactions')), {
        userId: profile.uid,
        type: 'game_fee',
        amount: fee,
        status: 'completed',
        createdAt: serverTimestamp()
      });

      // Artificial delay to make it feel like "Initializing"
      await new Promise(resolve => setTimeout(resolve, 800));

      setActiveGame(gameId);
      setGameState('playing');
      setGameResult(null);
      setGameData(null);
    } catch (err) {
      console.error(err);
      alert("Failed to initialize game. Please try again.");
    } finally {
      setIsInitializing(null);
    }
  };

  const finalizeGame = async (won: boolean, reward: number, msg: string) => {
    if (!profile) return;
    
    const minR = pageStatus.game_hub_min_reward || 100;
    const maxR = pageStatus.game_hub_max_reward || 1000;
    
    let finalReward = 0;
    if (won && reward > 0) {
      finalReward = Math.max(minR, Math.min(maxR, reward));
    }

    if (won && finalReward > 0) {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        balanceNGN: increment(finalReward),
        walletBalance: increment(finalReward),
        totalProfitNGN: increment(finalReward)
      });

      await setDoc(doc(collection(db, 'transactions')), {
        userId: profile.uid,
        type: 'game_win',
        amount: finalReward,
        status: 'completed',
        createdAt: serverTimestamp()
      });

      await setDoc(doc(collection(db, 'notifications')), {
        userId: profile.uid,
        title: 'Instant Win! 🏆',
        message: `You won ${formatCurrency(finalReward)} in ${games.find(g => g.id === activeGame)?.title}!`,
        type: 'win',
        createdAt: serverTimestamp()
      });

      // Trigger Browser Push Notification
      try {
        await fetch('/api/push/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: profile.uid,
            title: 'Instant Win! 🏆',
            body: `You won ${formatCurrency(finalReward)} in ${games.find(g => g.id === activeGame)?.title}!`,
            url: '/gamehub',
            adminSecret: 'infodailyyield_admin_2024'
          })
        });
      } catch (e) {
        console.warn('Push trigger failed', e);
      }
    }

    setGameResult({ won, amount: finalReward, message: msg });
    setGameState('result');
  };

  const closeGame = () => {
    setActiveGame(null);
    setGameState('idle');
    setGameResult(null);
  };

  return (
    <motion.div
      key="gamehub"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6 pb-20"
    >
        <div className="flex flex-col gap-2 mb-10">
          <h2 className="text-4xl font-black text-white">Quantum Game Hub</h2>
          <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.3em]">Institutional Grade Probability Assets</p>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {games.map(game => {
          const isLocked = pageStatus.game_locks && pageStatus.game_locks[game.id];
          
          return (
            <motion.div 
              key={game.id} 
              whileHover={isLocked ? {} : { y: -5 }}
              className={cn(
                "glass rounded-[2.5rem] border shadow-2xl relative group flex flex-col overflow-hidden transition-all duration-500",
                isLocked ? "opacity-60 border-red-500/20 grayscale-[0.5]" : "border-white/5"
              )}
            >
              <div className={cn("h-40 bg-gradient-to-br flex items-center justify-center relative", isLocked ? "from-red-900 to-black" : game.color)}>
                {isLocked ? (
                  <Lock size={60} className="text-red-500/50 drop-shadow-2xl" />
                ) : (
                  <game.icon size={60} className="text-white drop-shadow-2xl opacity-80 group-hover:scale-110 transition-transform duration-500" />
                )}
                <div className="absolute top-4 right-6 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest">
                  {isLocked ? 'Protocol Locked' : `Fee: ${formatCurrency(game.fee)}`}
                </div>
              </div>
              
              <div className="p-8 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className={cn("text-xl font-black mb-2 transition-colors", isLocked ? "text-red-500/50" : "text-white")}>{game.title}</h3>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-4">{isLocked ? 'Maintenance protocol active. access forbidden.' : game.description}</p>
                </div>

                <button 
                  onClick={() => handleStartGame(game.id, game.fee)}
                  disabled={isInitializing !== null || isLocked}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2",
                    isInitializing === game.id 
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-not-allowed" 
                      : isLocked 
                        ? "bg-red-500/10 text-red-500/40 border border-red-500/20 cursor-not-allowed"
                        : "bg-white/5 hover:bg-emerald-500 hover:text-black border border-white/10"
                  )}
                >
                  {isInitializing === game.id ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Initializing Assets...
                    </>
                  ) : isLocked ? (
                    <>
                      <Lock size={14} />
                      Access Denied
                    </>
                  ) : (
                    'Initialize Play'
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {activeGame && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={gameState === 'result' ? closeGame : undefined}
              className="absolute inset-0 bg-[#0a0b12]/95 backdrop-blur-2xl" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative glass p-8 sm:p-12 rounded-[3.5rem] w-full max-w-2xl border border-white/10 shadow-3xl text-center overflow-hidden"
            >
              <button 
                onClick={closeGame}
                className="absolute top-8 right-8 p-3 hover:bg-white/10 rounded-2xl transition-all z-20"
              >
                <X size={24} />
              </button>

              {gameState === 'playing' ? (
                <GameStage gameId={activeGame} onFinish={finalizeGame} />
              ) : (
                <div className="py-10">
                   <div className={cn(
                     "w-24 h-24 rounded-full mx-auto mb-8 flex items-center justify-center shadow-2xl",
                     gameResult?.won ? "bg-emerald-500 text-black animate-bounce" : "bg-red-500/20 text-red-400"
                   )}>
                      {gameResult?.won ? <Trophy size={48} strokeWidth={3} /> : <Zap size={48} />}
                   </div>
                   <h3 className="text-5xl font-black mb-4">{gameResult?.won ? 'VICTORY!' : 'HARD LUCK'}</h3>
                   <p className="text-xl font-medium text-white/60 mb-10 max-w-xs mx-auto">{gameResult?.message}</p>
                   {gameResult?.won && (
                     <div className="bg-emerald-500/10 border border-emerald-500/20 py-4 px-8 rounded-3xl inline-block mb-12">
                        <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-1">Total Payout</p>
                        <p className="text-4xl font-black text-emerald-400">+{formatCurrency(gameResult.amount)}</p>
                     </div>
                   )}
                   <button 
                    onClick={closeGame}
                    className="w-full py-5 bg-emerald-500 text-white font-black rounded-3xl text-xs uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/20"
                   >
                     Collect & Continue
                   </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function GameStage({ gameId, onFinish }: { gameId: string, onFinish: (won: boolean, r: number, m: string) => void }) {
  // --- Game-specific logic state ---
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initial setup if needed
    if (gameId === 'tap') {
      setData({ clicks: 0, timeLeft: 3, active: false });
    }
    if (gameId === 'color') {
      setData({ round: 1, target: null, options: [], waiting: true });
    }
    if (gameId === 'crash') {
      setData({ multiplier: 1.0, crashed: false, cashedOut: false });
    }
    if (gameId === 'wheel') {
      setData({ spinning: false, angle: 0 });
    }
    if (gameId === 'pick') {
      const values = [125, 125, 250, 250, 0, 0].sort(() => Math.random() - 0.5);
      setData({ cards: values.map(v => ({ value: v, flipped: false })), selection: [] });
    }
    if (gameId === 'rocket') {
      setData({ multiplier: 1.0, crashed: false, cashedOut: false, bet: 100 });
    }
    if (gameId === 'lucky') {
      setData({ selected: null, revealed: [] });
    }
    if (gameId === 'chest') {
      setData({ opened: null });
    }
  }, [gameId]);

  // 1. Daily Dice
  const playDice = () => {
    setLoading(true);
    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2;
      let won = false;
      let reward = 0;
      let msg = `You rolled ${d1} and ${d2} (Total: ${total}).`;

      if (d1 === 6 && d2 === 6) {
        won = true;
        reward = 1000;
        msg = "INSANE! Double 6 Jackpot!";
      } else if (total === 7 || total === 11) {
        won = true;
        reward = 200;
        msg = `Nice! Total ${total} is a winner.`;
      } else {
        msg += " Better luck next time.";
      }
      onFinish(won, reward, msg);
    }, 1500);
  };

  // 2. Lucky Spin
  const playSpin = () => {
    setLoading(true);
    const prizes = [0, 0, 0, 25, 50, 100, 250, 1000];
    const index = Math.floor(Math.random() * prizes.length);
    const reward = prizes[index];
    setTimeout(() => {
      onFinish(reward > 0, reward, reward > 0 ? `JACKPOT! You landed on ${formatCurrency(reward)}!` : "Zero prize. Try again!");
    }, 2500);
  };

  // 3. High Yield Cards
  const playCards = (idx: number) => {
    const cards = [0, 100, 250, 500, 1000];
    const reward = cards[idx];
    onFinish(reward > 0, reward, reward > 0 ? `Incredible! Card revealed ${formatCurrency(reward)}!` : "Empty set. Unlucky!");
  };

  // 4. Naira Flip
  const playFlip = (choice: 'heads' | 'tails') => {
    const won = Math.random() > 0.5;
    onFinish(won, won ? 45 : 0, won ? `Heads up! You guessed right.` : "Wrong side. Unlucky flip.");
  };

  // 5. Number Rush
  const [guessData, setGuessData] = useState({ target: Math.floor(Math.random() * 10) + 1, tries: 3 });
  const playRush = (guess: number) => {
    if (guess === guessData.target) {
      onFinish(true, 300, `BULLSEYE! The number was ${guessData.target}.`);
    } else {
      if (guessData.tries <= 1) {
        onFinish(false, 0, `Game Over! The number was ${guessData.target}.`);
      } else {
        setGuessData(prev => ({ ...prev, tries: prev.tries - 1 }));
      }
    }
  };

  // 6. Lucky Box
  const playBox = () => {
    const items = [0, 0, 0, 0, 0, 0, 250, 500, 1000];
    const reward = items[Math.floor(Math.random() * items.length)];
    onFinish(reward > 0, reward, reward > 0 ? `UNBOXED! You found ${formatCurrency(reward)}!` : "Empty box.");
  };

  // 7. Quick Tap
  useEffect(() => {
    if (gameId === 'tap' && data?.active && data?.timeLeft > 0) {
      const t = setInterval(() => {
        setData((prev: any) => ({ ...prev, timeLeft: prev.timeLeft - 0.1 }));
      }, 100);
      return () => clearInterval(t);
    } else if (gameId === 'tap' && data?.active && data?.timeLeft <= 0) {
      if (!data.finished) {
        setData((prev: any) => ({ ...prev, finished: true }));
        if (data.clicks >= 15) {
          onFinish(true, 125, `SPEED DEMON! You hit ${data.clicks} taps.`);
        } else {
          onFinish(false, 0, `Too slow! You only got ${data.clicks} taps.`);
        }
      }
    }
  }, [data?.active, data?.timeLeft, gameId, onFinish, data?.clicks, data?.finished]);

  // 8. Color Match
  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  const nextRound = () => {
    const target = colors[Math.floor(Math.random() * colors.length)];
    setData({ round: data.round, target, waiting: false });
  };
  const pickColor = (c: string) => {
    if (c === data.target) {
      if (data.round >= 5) {
        onFinish(true, 375, "PERFECT MATCH! 5/5 completed.");
      } else {
        setData((prev: any) => ({ ...prev, round: prev.round + 1, waiting: true }));
      }
    } else {
      onFinish(false, 0, `Mismatch at Round ${data.round}. Game Over.`);
    }
  };

  // 9. Crash Point
  useEffect(() => {
    if (gameId === 'crash' && !data?.cashedOut && !data?.crashed) {
      const crashLimit = Math.random() * 10 + 1.1;
      const interval = setInterval(() => {
        setData((prev: any) => {
          const next = prev.multiplier + 0.05;
          if (next >= crashLimit) {
            return { ...prev, crashed: true, multiplier: next };
          }
          return { ...prev, multiplier: next };
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [gameId, data?.cashedOut, data?.crashed]);

  useEffect(() => {
    if (gameId === 'crash' && data?.crashed && !data?.finished) {
      setData((prev: any) => ({ ...prev, finished: true }));
      onFinish(false, 0, `CRASHED at ${data.multiplier.toFixed(2)}x!`);
    }
  }, [gameId, data?.crashed, data?.finished, data?.multiplier, onFinish]);

  // 10. Scratch Win
  const [scratchData, setScratchData] = useState<string[]>([]);
  const startScratch = () => {
    const symbols = ['💎', '💰', '💵', '⭐', '🍀'];
    const s1 = symbols[Math.floor(Math.random() * symbols.length)];
    const won = Math.random() > 0.8; // 20% win
    let others = won ? [s1, s1, s1] : [s1, symbols[(symbols.indexOf(s1) + 1) % 5], symbols[(symbols.indexOf(s1) + 2) % 5]];
    setScratchData(others.sort(() => Math.random() - 0.5));
  };

  // 11. Treasure Hunt
  const pickChest = () => {
    const prizes = [750, 125, 0];
    const reward = prizes[Math.floor(Math.random() * prizes.length)];
    onFinish(reward > 0, reward, reward > 0 ? `TREASURE! You found ${formatCurrency(reward)}!` : "Empty chest.");
  };

  // 12. Timer Bet
  const [timerBet, setTimerBet] = useState<'odd' | 'even' | null>(null);
  const playTimer = () => {
    setLoading(true);
    setTimeout(() => {
      const res = Math.floor(Math.random() * 10) + 1;
      const isOdd = res % 2 !== 0;
      const won = (timerBet === 'odd' && isOdd) || (timerBet === 'even' && !isOdd);
      onFinish(won, won ? 163 : 0, `Timer stopped at ${res} (${isOdd ? 'Odd' : 'Even'}).`);
    }, 2000);
  };

  // 13. Ball Drop
  const playDrop = () => {
    setLoading(true);
    setTimeout(() => {
      const rewards = [0, 100, 250, 500, 1000];
      const res = rewards[Math.floor(Math.random() * rewards.length)];
      onFinish(res > 0, res, res > 0 ? `JACKPOT! Ball landed in the ${formatCurrency(res)} slot!` : "Zero slot. Try again!");
    }, 3000);
  };

  // 14. Fortune Wheel
  const playWheel = () => {
    setLoading(true);
    setData((prev: any) => ({ ...prev, spinning: true, angle: (prev.angle || 0) + 1440 + Math.random() * 360 }));
    
    setTimeout(() => {
      const prizes = [0, 10, 25, 50, 125, 250, 1000, 0, 10, 25, 50, 125];
      const result = prizes[Math.floor(Math.random() * prizes.length)];
      onFinish(result > 0, result, result > 0 ? `WHEEL MIRACLE! You won ${formatCurrency(result)}!` : "Better luck next spin!");
    }, 4000);
  };

  // 15. Pick & Match
  const playPick = (idx: number) => {
    if (!data || data.selection.length >= 2 || data.cards[idx].flipped) return;

    const newCards = [...data.cards];
    newCards[idx].flipped = true;
    const newSelection = [...data.selection, idx];

    setData({ ...data, cards: newCards, selection: newSelection });

    if (newSelection.length === 2) {
      setLoading(true);
      setTimeout(() => {
        const [i1, i2] = newSelection;
        const won = newCards[i1].value === newCards[i2].value && newCards[i1].value > 0;
        const reward = won ? newCards[i1].value : 0;
        onFinish(won, reward, won ? `MATCH FOUND! ${formatCurrency(reward)} is yours!` : "No match. Better luck next time!");
      }, 1000);
    }
  };

  // 16. Rocket Cash
  useEffect(() => {
    if (gameId === 'rocket' && !data?.cashedOut && !data?.crashed && loading) {
      const crashLimit = Math.random() < 0.2 ? 1.05 : (Math.random() * 5 + 1.2);
      const interval = setInterval(() => {
        setData((prev: any) => {
          const nextMult = prev.multiplier + (prev.multiplier * 0.02);
          if (nextMult >= crashLimit) {
            clearInterval(interval);
            setLoading(false);
            onFinish(false, 0, `ROCKET EXPLODED at ${nextMult.toFixed(2)}x!`);
            return { ...prev, crashed: true, multiplier: nextMult };
          }
          return { ...prev, multiplier: nextMult };
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [gameId, data?.cashedOut, data?.crashed, loading]);

  const cashOutRocket = () => {
    if (!data || data.crashed || data.cashedOut) return;
    setLoading(false);
    const win = Math.min(1000, data.bet * data.multiplier);
    onFinish(true, win, `SAFE LANDING! Cashed out at ${data.multiplier.toFixed(2)}x.`);
    setData({ ...data, cashedOut: true });
  };

  // 17. Lucky Numbers
  const playLucky = (num: number) => {
    setLoading(true);
    const winning = Array.from({ length: 3 }).map(() => Math.floor(Math.random() * 20) + 1);
    setTimeout(() => {
      const won = winning.includes(num);
      onFinish(won, won ? 300 : 0, won ? `NUMBER CALLED! ${num} was a winner.` : `Unlucky. Winning numbers: ${winning.join(', ')}`);
    }, 1500);
  };

  // 18. Chest Royale
  const playChest = (idx: number) => {
    setLoading(true);
    setTimeout(() => {
      const contents = [1000, 250, 250, 0, 0].sort(() => Math.random() - 0.5);
      const reward = contents[idx];
      onFinish(reward > 0, reward, reward > 0 ? `ROYAL TREASURE! ${formatCurrency(reward)} found!` : "Empty chest. The guards took it!");
    }, 1500);
  };

  return (
    <div className="space-y-10 py-6">
      {gameId === 'dice' && (
        <div className="flex flex-col items-center gap-10">
          <div className="flex justify-center gap-8">
            <motion.div animate={loading ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.2, 1] } : {}} transition={{ repeat: loading ? Infinity : 0 }} className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 shadow-inner">
               <Dices size={48} className="text-emerald-400" />
            </motion.div>
            <motion.div animate={loading ? { rotate: [0, -90, -180, -270, -360], scale: [1, 1.2, 1] } : {}} transition={{ repeat: loading ? Infinity : 0 }} className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 shadow-inner">
               <Dices size={48} className="text-emerald-400" />
            </motion.div>
          </div>
          <button onClick={playDice} disabled={loading} className="px-12 py-5 bg-emerald-500 text-white font-black rounded-3xl text-xs uppercase tracking-widest disabled:opacity-50">
            {loading ? 'Rolling...' : 'Roll Dice'}
          </button>
        </div>
      )}

      {gameId === 'spin' && (
        <div className="flex flex-col items-center gap-10">
           <motion.div 
            animate={loading ? { rotate: 3600 } : {}}
            transition={{ duration: 2.5, ease: "easeOut" }}
            className="w-48 h-48 rounded-full border-8 border-white/5 flex items-center justify-center relative bg-emerald-500/10 shadow-2xl shadow-emerald-500/10"
           >
              <RefreshCw size={80} className="text-emerald-400 opacity-40 shrink-0" />
              <div className="absolute -top-4 w-1 h-8 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
           </motion.div>
           <button onClick={playSpin} disabled={loading} className="px-12 py-5 bg-emerald-500 text-white font-black rounded-3xl text-xs uppercase tracking-widest disabled:opacity-50 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">
              {loading ? 'Spinning...' : 'Spin Wheel'}
           </button>
        </div>
      )}

      {gameId === 'cards' && (
        <div className="grid grid-cols-5 gap-4">
          {[0,1,2,3,4].map(idx => (
            <motion.button 
              key={idx}
              whileHover={{ y: -10 }}
              onClick={() => playCards(idx)}
              className="h-32 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center hover:bg-emerald-500/20 transition-all group"
            >
              <Sparkles size={24} className="text-emerald-400 opacity-20 group-hover:opacity-100" />
            </motion.button>
          ))}
        </div>
      )}

      {gameId === 'flip' && (
        <div className="flex justify-center gap-6">
          <button onClick={() => playFlip('heads')} className="w-32 h-32 glass rounded-full border border-emerald-500/20 flex flex-col items-center justify-center gap-2 hover:bg-emerald-500/10 transition-all">
             <Coins size={32} className="text-emerald-500" />
             <span className="text-[10px] font-black uppercase text-white">Heads</span>
          </button>
          <button onClick={() => playFlip('tails')} className="w-32 h-32 glass rounded-full border border-emerald-500/20 flex flex-col items-center justify-center gap-2 hover:bg-emerald-500/10 transition-all">
             <CircleIcon size={32} className="text-emerald-500" />
             <span className="text-[10px] font-black uppercase text-white">Tails</span>
          </button>
        </div>
      )}

      {gameId === 'rush' && (
        <div className="space-y-8">
           <div className="flex justify-center gap-4">
              {[1,2,3].map(t => (
                <div key={t} className={cn("w-3 h-3 rounded-full shadow-sm", t <= guessData.tries ? "bg-emerald-500" : "bg-white/10")} />
              ))}
           </div>
           <div className="grid grid-cols-5 gap-3 text-white">
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} onClick={() => playRush(n)} className="p-4 glass rounded-xl hover:bg-emerald-500 hover:text-white font-black text-sm transition-all active:scale-90">{n}</button>
              ))}
           </div>
        </div>
      )}

      {gameId === 'box' && (
        <div className="grid grid-cols-3 gap-4">
           {[...Array(9)].map((_, i) => (
             <button key={i} onClick={playBox} className="h-24 glass rounded-3xl border border-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/10 transition-all active:scale-95 shadow-lg group">
                <Boxes size={24} className="text-emerald-400 opacity-40 group-hover:opacity-100" />
             </button>
           ))}
        </div>
      )}

      {gameId === 'tap' && (
        <div className="flex flex-col items-center gap-8">
           {!data?.active ? (
              <button 
                onClick={() => setData({ ...data, active: true })} 
                className="w-48 h-48 bg-emerald-500 text-white font-black rounded-full text-xl shadow-[0_0_50px_rgba(16,185,129,0.3)] active:scale-90 transition-all"
              >
                START
              </button>
           ) : (
              <div className="space-y-8 w-full text-center">
                 <div className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">{data.timeLeft.toFixed(1)}s</div>
                 <button onClick={() => setData({ ...data, clicks: data.clicks + 1 })} className="w-48 h-48 glass-dark border-4 border-emerald-500 rounded-full text-6xl font-black active:scale-95 transition-all text-white shadow-2xl">{data.clicks}</button>
              </div>
           )}
        </div>
      )}

      {gameId === 'color' && (
        <div className="space-y-10 text-center">
           <div className="text-sm font-black uppercase tracking-widest text-white/40">Round {data?.round}/5</div>
           {data?.waiting ? (
              <button onClick={nextRound} className="px-10 py-4 bg-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Show Next Color</button>
           ) : (
              <div className="space-y-10">
                 <div className="w-24 h-24 rounded-full mx-auto shadow-2xl border-4 border-white/20" style={{ backgroundColor: data.target }} />
                 <div className="grid grid-cols-3 gap-4">
                    {colors.map(c => (
                      <button key={c} onClick={() => pickColor(c)} className="h-16 rounded-2xl shadow-lg border border-white/10 transition-transform active:scale-90" style={{ backgroundColor: c }} />
                    ))}
                 </div>
              </div>
           )}
        </div>
      )}

      {gameId === 'crash' && (
        <div className="space-y-10 text-center">
           <div className="text-8xl font-black bg-gradient-to-b from-white to-white/20 bg-clip-text text-transparent">
              {data?.multiplier.toFixed(2)}x
           </div>
           <button 
             onClick={() => {
               setData({ ...data, cashedOut: true });
               onFinish(true, Math.min(1000, Math.floor(125 * data.multiplier)), `Cashed out at ${data.multiplier.toFixed(2)}x!`);
             }} 
             className="w-full py-6 bg-red-600 text-white font-black rounded-3xl text-xl shadow-2xl shadow-red-500/20 active:scale-95 transition-all"
           >
              CASH OUT
           </button>
        </div>
      )}

      {gameId === 'scratch' && (
        <div className="flex flex-col items-center gap-10">
           {scratchData.length === 0 ? (
              <button onClick={startScratch} className="p-12 glass border-dashed border-2 border-amber-500/40 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.4em] hover:bg-amber-500/5">Swipe to Scratch</button>
           ) : (
              <div className="flex gap-4">
                 {scratchData.map((s, i) => (
                   <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.2 }} key={i} className="w-20 h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-4xl shadow-inner">
                      {s}
                   </motion.div>
                 ))}
              </div>
           )}
           {scratchData.length > 0 && (
              <button onClick={() => {
                const won = scratchData[0] === scratchData[1] && scratchData[1] === scratchData[2];
                onFinish(won, won ? 250 : 0, won ? "TRIPLE MATCH! Jackpoted." : "No match found.");
              }} className="px-10 py-4 bg-amber-500 text-black font-black rounded-2xl">Reveal Result</button>
           )}
        </div>
      )}

      {gameId === 'hunt' && (
        <div className="flex justify-center gap-6">
           {[0,1,2].map(i => (
             <button key={i} onClick={pickChest} className="w-24 h-24 glass rounded-3xl border border-amber-800/40 flex items-center justify-center hover:bg-amber-800/20 transition-all group">
                <Gift size={40} className="text-amber-700 group-hover:scale-110 transition-transform" />
             </button>
           ))}
        </div>
      )}

      {gameId === 'timer' && (
        <div className="flex flex-col items-center gap-10">
           <div className="flex gap-4">
              <button onClick={() => setTimerBet('odd')} className={cn("px-8 py-4 rounded-2xl font-black transition-all", timerBet === 'odd' ? "bg-violet-500 text-black" : "glass border border-white/10 text-white/40")}>ODD</button>
              <button onClick={() => setTimerBet('even')} className={cn("px-8 py-4 rounded-2xl font-black transition-all", timerBet === 'even' ? "bg-violet-500 text-black" : "glass border border-white/10 text-white/40")}>EVEN</button>
           </div>
           <button onClick={playTimer} disabled={!timerBet || loading} className="px-12 py-5 bg-violet-600 text-white font-black rounded-3xl text-xs uppercase tracking-widest disabled:opacity-30">
              {loading ? 'Stopping...' : 'Start Timer'}
           </button>
        </div>
      )}

      {gameId === 'drop' && (
        <div className="flex flex-col items-center gap-10">
           <div className="relative w-full h-40 flex items-center justify-center overflow-hidden">
               <motion.div animate={loading ? { y: [0, 100], x: [0, 20, -20, 10, -10, 0] } : {}} className="w-8 h-8 bg-red-500 rounded-full shadow-lg shadow-red-500/40" />
               <div className="absolute bottom-0 w-full flex justify-between px-4">
                  {[0,4,10,3,1].map(r => <div key={r} className="w-10 h-8 bg-white/5 rounded-t-lg border-t border-x border-white/10" />)}
               </div>
           </div>
           <button onClick={playDrop} disabled={loading} className="px-12 py-5 bg-red-600 text-white font-black rounded-3xl text-xs uppercase tracking-widest disabled:opacity-50">
              {loading ? 'Dropping Ball...' : 'Drop Ball'}
           </button>
        </div>
      )}

      {gameId === 'wheel' && (
        <div className="flex flex-col items-center gap-10">
           <div className="relative">
             <motion.div 
              animate={{ rotate: data?.angle || 0 }}
              transition={{ duration: 4, ease: "circOut" }}
              className="w-64 h-64 rounded-full border-8 border-white/10 relative flex items-center justify-center overflow-hidden shadow-2xl glass"
             >
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="absolute h-full w-2 bg-white/5 origin-center" style={{ transform: `rotate(${i * 30}deg)` }} />
                ))}
                <div className="absolute inset-0 flex items-center justify-center">
                   <Disc size={40} className="text-indigo-400" />
                </div>
             </motion.div>
             <div className="w-4 h-8 bg-amber-500 absolute top-0 left-1/2 -translate-x-1/2 -mt-4 rounded-full border-2 border-white shadow-lg z-10" />
           </div>
           <button onClick={playWheel} disabled={loading} className="px-12 py-5 bg-indigo-600 text-white font-black rounded-3xl text-xs uppercase tracking-widest disabled:opacity-50">
              {loading ? 'Spinning...' : 'Spin Wheel'}
           </button>
        </div>
      )}

      {gameId === 'pick' && (
        <div className="flex flex-col items-center gap-8">
           <div className="grid grid-cols-3 gap-4">
              {data?.cards?.map((card: any, i: number) => (
                <motion.div 
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => playPick(i)}
                  className={cn(
                    "w-20 h-28 rounded-xl flex items-center justify-center text-xl font-black cursor-pointer transition-all border",
                    card.flipped ? "bg-emerald-500 border-emerald-400 text-black" : "glass border-white/10 text-white/5"
                  )}
                >
                   {card.flipped ? (card.value > 0 ? formatCurrency(card.value).replace('.00', '') : '❌') : '?'}
                </motion.div>
              ))}
           </div>
           <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Match pairs of matching rewards</p>
        </div>
      )}

      {gameId === 'rocket' && (
        <div className="flex flex-col items-center gap-10">
           <div className="h-40 flex flex-col items-center justify-center">
              <motion.div 
                animate={loading ? { y: [0, -10, 0], x: [0, 2, -2, 0] } : {}}
                transition={{ repeat: Infinity, duration: 0.2 }}
                className={cn("text-6xl font-black mb-4 transition-colors", data?.crashed ? "text-red-500" : "text-orange-500")}
              >
                 {data?.multiplier?.toFixed(2) || '1.00'}x
              </motion.div>
              <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest">
                 Rocket Ascending <span className="flex gap-1">{[1,2,3].map(i => <motion.span key={i} animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}>•</motion.span>)}</span>
              </div>
           </div>
           
           {!loading && !data?.crashed && !data?.cashedOut && (
              <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                <div className="w-full relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 font-black">₦</span>
                  <input 
                    type="number"
                    value={data?.bet || 400}
                    onChange={(e) => setData({ ...data, bet: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 p-4 pl-10 rounded-2xl outline-none focus:border-orange-500 text-white font-black"
                    placeholder="Bet Amount"
                  />
                </div>
                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Max reward 10x your bet</p>
              </div>
           )}

           <div className="flex gap-4">
              {!loading && !data?.crashed && !data?.cashedOut ? (
                <button 
                  onClick={() => {
                    if (data.bet < 100) return alert("Minimum bet is ₦100");
                    setLoading(true);
                  }} 
                  className="px-12 py-5 bg-orange-600 text-white font-black rounded-3xl text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-orange-600/20"
                >
                  Ignite & Launch
                </button>
              ) : (
                <button 
                  onClick={cashOutRocket} 
                  disabled={data?.crashed || data?.cashedOut || !loading} 
                  className="px-12 py-5 bg-emerald-500 text-white font-black rounded-3xl text-xs uppercase tracking-widest disabled:opacity-30 active:scale-95 transition-all shadow-xl shadow-emerald-500/20"
                >
                  {data?.cashedOut ? "Cashed Out!" : "Eject & Cash Out"}
                </button>
              )}
           </div>
        </div>
      )}

      {gameId === 'lucky' && (
        <div className="flex flex-col items-center gap-8">
           <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: 20 }).map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => playLucky(i + 1)}
                  disabled={loading}
                  className="w-12 h-12 glass border border-white/5 rounded-xl hover:bg-emerald-500 hover:text-black font-black transition-all active:scale-95 disabled:opacity-30 text-xs"
                >
                   {i + 1}
                </button>
              ))}
           </div>
           <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Target one lucky coordinate</p>
        </div>
      )}

      {gameId === 'chest' && (
        <div className="flex flex-col items-center gap-10">
           <div className="flex gap-4">
              {[0,1,2,3,4].map(i => (
                <motion.button 
                  key={i} 
                  whileHover={{ y: -10 }}
                  onClick={() => playChest(i)}
                  disabled={loading}
                  className="w-16 h-16 glass border border-white/10 rounded-2xl flex items-center justify-center hover:bg-amber-500/20 group transition-all disabled:opacity-30"
                >
                   <Archive className="text-white/20 group-hover:text-amber-400 group-hover:scale-110 transition-transform" />
                </motion.button>
              ))}
           </div>
           <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Initialize extraction from one chest</p>
        </div>
      )}
    </div>
  );
}

function WalletView({ profile, userId, onDeposit, onWithdraw }: { 
  profile: UserProfile | null, userId?: string, onDeposit: (a: number) => void, onWithdraw: (a: number, d: any) => void 
}) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [depositRequests, setDepositRequests] = useState<any[]>([]);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<'amount' | 'details'>('amount');
  const [amount, setAmount] = useState('');
  const [details, setDetails] = useState({
    accountName: '',
    bankName: '',
    accountNumber: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (!userId) return;
    const q1 = query(collection(db, 'transactions'), where('userId', '==', userId));
    const unsub1 = onSnapshot(q1, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTransactions(docs.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 15));
    }, (err) => handleFirestoreError(err, 'list', 'transactions'));

    const q2 = query(collection(db, 'withdrawals'), where('userId', '==', userId));
    const unsub2 = onSnapshot(q2, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setWithdrawals(docs.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 10));
    }, (err) => handleFirestoreError(err, 'list', 'withdrawals'));

    const q3 = query(collection(db, 'depositRequests'), where('userId', '==', userId));
    const unsub3 = onSnapshot(q3, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDepositRequests(docs.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 10));
    }, (err) => handleFirestoreError(err, 'list', 'depositRequests'));

    return () => { unsub1(); unsub2(); unsub3(); };
  }, [userId]);

  const handleDeposit = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return alert("Enter valid amount");
    onDeposit(val);
    setAmount('');
    setIsDepositModalOpen(false);
  };

  const handleProceedWithdraw = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return alert("Enter valid amount");
    
    // Limits check before proceeding (User Specified)
    const withdrawalLimits: any = {
      tier1: { min: 15000, max: 15000 },
      tier2: { min: 15000, max: 50000 },
      tier3: { min: 15000, max: 80000 },
      premium: { min: 15000, max: Infinity }
    };

    const currentTier = profile?.tier || 'tier1';
    const { min, max } = withdrawalLimits[currentTier];

    if (val < min) {
      alert(`Minimum withdrawal for your tier (${currentTier.toUpperCase()}) is ${formatCurrency(min)}`);
      return;
    }

    if (val > max) {
      alert(`Maximum withdrawal for your tier (${currentTier.toUpperCase()}) is ${formatCurrency(max)}`);
      return;
    }

    if ((profile?.balanceNGN || 0) < val) {
      alert("Insufficient balance.");
      return;
    }

    setWithdrawStep('details');
  };

  const currentPending = withdrawals.find(w => w.status === 'pending');

  const handleWithdrawSubmit = () => {
    if (currentPending) {
        alert("You have a pending withdrawal request. Please wait for it to be processed.");
        return;
    }

    if (!details.accountName || !details.bankName || !details.accountNumber || !details.email || !details.phone) {
      alert("All fields are required");
      return;
    }
    const val = parseFloat(amount);
    onWithdraw(val, details);
    setAmount('');
    setDetails({ accountName: '', bankName: '', accountNumber: '', email: '', phone: '' });
    setWithdrawStep('amount');
    setIsWithdrawModalOpen(false);
  };

  return (
    <motion.div
      key="wallet"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 pb-20"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass p-10 rounded-[2.5rem] flex flex-col justify-between border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Total Liquidity (NGN)</p>
            <h2 className="text-6xl font-black text-emerald-400 drop-shadow-lg mb-10 flex items-center gap-4">
              {profile ? formatCurrency(profile.balanceNGN) : '₦0.00'}
              {profile?.isWalletFrozen && (
                <motion.div 
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="bg-red-500/10 border border-red-500/20 p-3 rounded-2xl shadow-2xl shadow-red-500/10" 
                  title="Administrative Hold"
                >
                   <Lock size={32} className="text-red-500 animate-pulse" />
                </motion.div>
              )}
            </h2>
          </div>
          <div className="flex gap-4 relative z-10">
            <button 
              onClick={() => setIsDepositModalOpen(true)}
              className="flex-1 py-5 bg-emerald-500 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 hover:brightness-110 transition-all text-xs uppercase tracking-widest"
            >
              <ArrowUpRight size={20} /> Deposit
            </button>
            <button 
              onClick={() => {
                if (currentPending) alert("You already have an active pending withdrawal.");
                else setIsWithdrawModalOpen(true);
              }}
              disabled={!!currentPending}
              className="flex-1 py-5 glass text-white font-black rounded-2xl flex items-center justify-center gap-3 border border-white/10 hover:bg-emerald-500 hover:text-white transition-all text-xs uppercase tracking-widest disabled:opacity-50"
            >
              <ArrowDownLeft size={20} /> Withdraw
            </button>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Wallet size={120} />
          </div>
        </div>

        {/* Withdrawal Status Section */}
        <div className="glass p-10 rounded-[2.5rem] flex flex-col border border-white/5">
          <h3 className="font-black text-xl mb-6 flex items-center gap-2">
             <RefreshCw size={20} className="text-emerald-400" /> Pending Actions
          </h3>
          <div className="space-y-6 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
             {/* Withdrawal Requests (Pending) */}
             <div className="space-y-3">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-1">Withdrawals</p>
                {withdrawals.filter(w => w.status === 'pending').length === 0 ? (
                   <p className="text-[9px] text-white/10 italic px-1">No pending withdrawals</p>
                ) : (
                   withdrawals.filter(w => w.status === 'pending').map(w => (
                     <div key={w.id} className="p-4 bg-white/5 rounded-2xl border border-white/10">
                        <div className="flex justify-between items-start mb-1">
                           <p className="font-black text-xs">{formatCurrency(w.amount)}</p>
                           <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500">
                               PENDING
                           </span>
                        </div>
                        <p className="text-[8px] text-white/30 font-medium truncate">Verifying details...</p>
                     </div>
                   ))
                )}
             </div>

             {/* Deposit Requests (Pending) */}
             <div className="space-y-3">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-1">Deposits</p>
                {depositRequests.filter(req => req.status === 'pending').length === 0 ? (
                   <p className="text-[9px] text-white/10 italic px-1">No pending verifications</p>
                ) : (
                   depositRequests.filter(req => req.status === 'pending').map(req => (
                     <div key={req.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 border-amber-500/10">
                        <div className="flex justify-between items-start mb-1">
                           <p className="font-black text-xs">{formatCurrency(req.amount)}</p>
                           <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500">
                               VERIFYING
                           </span>
                        </div>
                        <p className="text-[8px] text-white/30 font-medium truncate">Admin check in progress</p>
                     </div>
                   ))
                )}
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <History size={24} className="text-emerald-400" />
            <h3 className="text-2xl font-black">Deposit Verification Logs</h3>
          </div>
          <div className="space-y-3">
             {depositRequests.length === 0 ? (
               <div className="p-10 text-center glass rounded-[2rem] border border-dashed border-white/5 opacity-20">
                  <p className="text-xs font-bold uppercase tracking-widest">No deposit history</p>
               </div>
             ) : (
               depositRequests.map(req => (
                 <div key={req.id} className="glass p-6 rounded-[2rem] border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-4">
                       <div className={cn(
                         "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                         req.status === 'approved' ? "bg-emerald-500/10 text-emerald-400" :
                         req.status === 'rejected' ? "bg-red-500/10 text-red-500" :
                         "bg-amber-500/10 text-amber-500"
                       )}>
                          <Download size={24} />
                       </div>
                       <div>
                          <p className="font-black text-white">{formatCurrency(req.amount)}</p>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                            {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString() : 'Recent'}
                          </p>
                       </div>
                    </div>
                    <div className="text-right">
                       <span className={cn(
                         "px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                         req.status === 'approved' ? "bg-emerald-500/10 text-emerald-400" :
                         req.status === 'rejected' ? "bg-red-500/10 text-red-500" :
                         "bg-amber-500/10 text-amber-500"
                       )}>
                         {req.status}
                       </span>
                       {req.status === 'rejected' && req.rejectionReason && (
                          <p className="text-[8px] text-red-400/50 mt-1 italic max-w-[150px] truncate">{req.rejectionReason}</p>
                       )}
                    </div>
                 </div>
               ))
             )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <TrendingUp size={24} className="text-emerald-400" />
            <h3 className="text-2xl font-black">Transaction Vault</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {transactions.length === 0 ? (
              <div className="p-10 text-center glass rounded-[2rem] border border-dashed border-white/5 opacity-20">
                <p className="text-xs font-bold uppercase tracking-widest">The vault is empty</p>
              </div>
            ) : (
              transactions.map(tx => (
                <div key={tx.id} className="glass p-5 rounded-[1.8rem] flex justify-between items-center border border-white/5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                      {tx.type === 'deposit' ? <Plus size={16} /> : tx.type === 'bonus' ? <Gift size={16} /> : <TrendingUp size={16} />}
                    </div>
                    <div>
                      <p className="font-black text-sm capitalize text-white">{(tx.type || 'transaction').replace('_', ' ')}</p>
                      <p className="text-[8px] text-white/40 font-bold font-mono">{(tx.createdAt as Timestamp)?.toDate()?.toLocaleDateString() || '...'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-black text-lg",
                      tx.type === 'deposit' || tx.type === 'payout' || tx.type === 'game_win' || tx.type === 'bonus' ? "text-emerald-400" : "text-white"
                    )}>
                      {tx.type === 'deposit' || tx.type === 'payout' || tx.type === 'game_win' || tx.type === 'bonus' ? '+' : '-'} {formatCurrency(tx.amount)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isDepositModalOpen} onClose={() => setIsDepositModalOpen(false)} title="Deposit Funds">
         <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3 block px-1">Amount (NGN)</label>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
                className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-black text-2xl text-emerald-400 outline-none focus:border-emerald-500/50 transition-all placeholder:text-white/10"
              />
            </div>
            <button 
              onClick={handleDeposit}
              className="w-full py-5 bg-emerald-500 text-white font-black rounded-2xl text-xs uppercase tracking-widest"
            >
              Confirm Deposit
            </button>
         </div>
      </Modal>

      <Modal 
        isOpen={isWithdrawModalOpen} 
        onClose={() => {
          setIsWithdrawModalOpen(false);
          setWithdrawStep('amount');
        }} 
        title={withdrawStep === 'amount' ? "Initialize Withdrawal" : "Transfer Credentials"}
      >
         <div className="space-y-6">
            {withdrawStep === 'amount' ? (
              <>
                <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 mb-2">
                   <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-2">Available for Withdrawal</p>
                   <p className="text-3xl font-black text-emerald-400">{formatCurrency(profile?.balanceNGN || 0)}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3 block px-1">Amount (NGN)</label>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="20000"
                    className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-black text-2xl text-white outline-none focus:border-white/20 transition-all placeholder:text-white/10"
                  />
                  <div className="mt-2 flex justify-between px-1">
                     <p className="text-[8px] font-black uppercase text-white/20 tracking-widest">Verification Status: {profile?.kycStatus}</p>
                     <p className="text-[8px] font-black uppercase text-white/20 tracking-widest">Tier {profile?.tier} Limit</p>
                  </div>
                </div>
                <button 
                  onClick={handleProceedWithdraw}
                  className="w-full py-5 bg-emerald-500 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  Verify Amount & Proceed
                </button>
              </>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                 <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                       <label className="text-[8px] font-black uppercase text-white/40 tracking-widest px-1">Full Account Name</label>
                       <input 
                        type="text" 
                        value={details.accountName}
                        onChange={(e) => setDetails({ ...details, accountName: e.target.value })}
                        placeholder="John Doe"
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm font-bold outline-none focus:border-emerald-500/50"
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] font-black uppercase text-white/40 tracking-widest px-1">Financial Institution (Bank)</label>
                       <input 
                        type="text" 
                        value={details.bankName}
                        onChange={(e) => setDetails({ ...details, bankName: e.target.value })}
                        placeholder="Kuda, GTBank, etc."
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm font-bold outline-none focus:border-emerald-500/50"
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] font-black uppercase text-white/40 tracking-widest px-1">Account Identification Number</label>
                       <input 
                        type="text" 
                        value={details.accountNumber}
                        onChange={(e) => setDetails({ ...details, accountNumber: e.target.value })}
                        placeholder="0123456789"
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm font-bold outline-none focus:border-emerald-500/50"
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] font-black uppercase text-white/40 tracking-widest px-1">Primary Email Registry</label>
                       <input 
                        type="email" 
                        value={details.email}
                        onChange={(e) => setDetails({ ...details, email: e.target.value })}
                        placeholder="user@example.com"
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm font-bold outline-none focus:border-emerald-500/50"
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] font-black uppercase text-white/40 tracking-widest px-1">Mobile Contact Line</label>
                       <input 
                        type="tel" 
                        value={details.phone}
                        onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                        placeholder="+234..."
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm font-bold outline-none focus:border-emerald-500/50"
                       />
                    </div>
                 </div>
                 <button 
                  onClick={handleWithdrawSubmit}
                  className="w-full py-5 bg-emerald-500 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all mt-4"
                >
                  Finalize Extraction Request
                </button>
              </div>
            )}
         </div>
      </Modal>
    </motion.div>
  );
}

function Notifications({ userId }: { userId?: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', userId || ''), orderBy('createdAt', 'desc'), limit(25));
    return onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'notifications'));
  }, [userId]);

  return (
    <motion.div
      key="notifications"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="space-y-8 pb-20 max-w-4xl mx-auto"
    >
      <div className="flex flex-col gap-2 mb-10">
        <h2 className="text-4xl font-black">Notifications</h2>
        <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.4em]">System activity and security log</p>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="p-20 text-center glass rounded-[2.5rem] border border-white/5">
             <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 text-white/20">
               <Bell size={40} />
             </div>
             <p className="text-xl font-black">All Clear</p>
             <p className="text-white/40 text-sm mt-2">You don't have any new alerts or activities.</p>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className="glass p-8 rounded-[2.2rem] flex gap-8 border border-white/5 hover:bg-white/5 transition-all group">
               <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl bg-emerald-500/10 text-emerald-400">
                 {n.type === 'win' ? <Trophy size={32} /> : <Bell size={32} />}
               </div>
               <div className="flex-1">
                 <div className="flex justify-between items-start mb-2">
                   <h4 className="font-black text-xl text-white group-hover:text-emerald-400 transition-colors">{n.title || 'Notification'}</h4>
                   <p className="text-[10px] text-white/20 font-black font-mono">{(n.createdAt as Timestamp)?.toDate()?.toLocaleDateString() || 'Recent'}</p>
                 </div>
                 <p className="text-white/60 text-base leading-relaxed mb-4">{n.message}</p>
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                   <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">{(n.type || 'system')} Event</p>
                 </div>
               </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function AccountSettings({ profile, user, onLogOut, setView }: { 
  profile: UserProfile | null, 
  user: FirebaseUser | null, 
  onLogOut: () => void,
  setView: (v: View) => void 
}) {
  const [isKycSubmitOpen, setIsKycSubmitOpen] = useState(false);
  const [kycForm, setKycForm] = useState({ phone: '', address: '', username: '', email: '' });
  const [tierRequestOpen, setTierRequestOpen] = useState(false);
  const [targetTier, setTargetTier] = useState<string | null>(null);
  const [pwaModalOpen, setPwaModalOpen] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  const togglePush = async () => {
    if (!profile) return;
    setPushLoading(true);
    const newState = !profile.pushEnabled;

    const inIframe = window.self !== window.top;

    if (newState) {
      try {
        const hasPermission = await askNotificationPermission();
        if (!hasPermission) {
          if (inIframe) {
            alert("⚠️ Browsers often block notification requests inside previews. Please open the app in a 'New Tab' using the icon in the top right to enable push notifications.");
          } else {
            alert("Notification permission denied. Please enable them in your browser settings and try again.");
          }
          setPushLoading(false);
          return;
        }
        await subscribeUserToPush(profile.uid);
      } catch (err: any) {
        if (inIframe) {
           alert("Push failed: In-preview browser security often blocks notifications. Please open the app in a New Tab to complete setup.");
        } else {
           alert(`Failed to enable push notifications: ${err.message || 'Unknown error'}.`);
        }
        setPushLoading(false);
        return;
      }
    }

    try {
      await updateDoc(doc(db, 'users', profile.uid), { pushEnabled: newState });
      alert(`Push notifications ${newState ? 'enabled' : 'disabled'}!`);
    } catch (err) {
      console.error("Failed to update push settings", err);
      alert("Failed to save push settings. Please try again.");
    } finally {
      setPushLoading(false);
    }
  };

  // PWA & OS Detection
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  const getOS = () => {
    const ua = window.navigator.userAgent;
    if (/android/i.test(ua)) return 'android';
    if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return 'ios';
    return 'desktop';
  };
  const os = getOS();

  if (!profile || !user) return null;

  useEffect(() => {
    if (user) {
      setKycForm(prev => ({ ...prev, email: user.email || '', username: profile.displayName || '' }));
    }
  }, [user, profile]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('User ID Copied to Clipboard!');
  };

  const handleKycSubmit = async () => {
    if (!profile?.uid) return alert("System error: Profile not synchronized.");
    if (!kycForm.phone || !kycForm.address || !kycForm.username || !kycForm.email) return alert("Please fill all fields");
    
    await setDoc(doc(collection(db, 'kycRequests'), profile.uid), {
      uid: profile.uid,
      username: kycForm.username,
      email: kycForm.email,
      phoneNumber: kycForm.phone,
      address: kycForm.address,
      status: 'pending',
      submittedAt: serverTimestamp()
    });

    await updateDoc(doc(db, 'users', profile.uid), { kycStatus: 'pending' });
    setIsKycSubmitOpen(false);
    alert("KYC Submitted for Review!");
  };

  const handleTierUpgrade = async (requestedTier: string) => {
    if (!profile?.uid) return alert("System error: Profile not synchronized.");
    const userEmail = profile.email || auth.currentUser?.email || null;

    await setDoc(doc(collection(db, 'tierRequests')), {
      uid: profile.uid,
      email: userEmail,
      currentTier: profile.tier,
      requestedTier,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    setTierRequestOpen(false);
    alert(`Upgrade request to ${requestedTier} submitted!`);
  };

  return (
    <motion.div
      key="account"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="space-y-8 pb-40 max-w-4xl mx-auto"
    >
      <div className="flex flex-col gap-2 mb-10">
        <h2 className="text-4xl font-black">Account Settings</h2>
        <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.4em]">Identity and Security Management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Card */}
        <div className="glass p-10 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
             <div className="flex items-center gap-6 mb-10">
                <div className="relative group">
                  {profile.photoURL ? (
                    <img src={profile.photoURL} className="w-20 h-20 rounded-3xl object-cover ring-2 ring-emerald-500/20" alt="Profile" />
                  ) : (
                    <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <UserCircle size={40} />
                    </div>
                  )}
                  <button className="absolute -bottom-2 -right-2 p-2 bg-emerald-500 text-black rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                    <Upload size={14} />
                  </button>
                </div>
                <div>
                   <h3 className="text-2xl font-black">{profile.displayName || 'Anonymous User'}</h3>
                   <p className="text-white/40 text-sm font-medium">{profile.email}</p>
                </div>
             </div>

             <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Display Name</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={kycForm.username}
                      onChange={(e) => setKycForm({...kycForm, username: e.target.value})}
                      className="flex-1 bg-white/5 border border-white/10 p-3 rounded-xl outline-none focus:border-emerald-500/50 text-sm"
                    />
                    <button 
                      onClick={async () => {
                        try {
                          await updateDoc(doc(db, 'users', profile.uid), { displayName: kycForm.username });
                          alert("Display name updated!");
                        } catch (err) {
                          alert("Failed to update name.");
                        }
                      }}
                      className="px-4 bg-emerald-500 text-black font-black rounded-xl text-[10px] uppercase tracking-widest"
                    >
                      Update
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center group overflow-hidden">
                   <div>
                     <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Internal UID</p>
                     <p className="text-xs font-mono text-white/50 truncate max-w-[150px]">{profile.uid}</p>
                   </div>
                   <button onClick={() => copyToClipboard(profile.uid)} className="p-2 h-10 w-10 flex items-center justify-center hover:bg-white/10 rounded-xl transition-all"><Copy size={16} /></button>
                </div>
                
                <button 
                  onClick={onLogOut}
                  className="w-full py-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl text-[10px] uppercase font-black tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <LogOut size={14} /> End Secure Session
                </button>

                <div className="pt-6 border-t border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Push Notifications</p>
                      <p className="text-[10px] text-white/20 font-bold">Stay updated on claims and alerts</p>
                    </div>
                    <button 
                      onClick={togglePush}
                      disabled={pushLoading}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative flex items-center px-1",
                        profile.pushEnabled ? "bg-emerald-500" : "bg-white/10"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                        profile.pushEnabled ? "translate-x-6" : "translate-x-0"
                      )} />
                    </button>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Verification Status Card */}
        <div className="glass p-10 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col justify-between">
           <div>
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black">Identity Check</h3>
                <div className={cn(
                  "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-inner",
                  profile.kycStatus === 'verified' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                  profile.kycStatus === 'pending' ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                  "bg-red-500/10 text-red-400 border border-red-500/20"
                )}>
                  {profile.kycStatus}
                </div>
              </div>
              <p className="text-white/40 text-sm leading-relaxed mb-6">
                Verification is required to unlock withdrawal functionality and higher investment limits.
              </p>
           </div>
           
           {profile.kycStatus !== 'verified' && (
             <button 
              onClick={() => setIsKycSubmitOpen(true)}
              disabled={profile.kycStatus === 'pending'}
              className="w-full py-4 bg-white text-black font-black rounded-2xl text-[10px] uppercase tracking-widest disabled:opacity-50"
             >
                {profile.kycStatus === 'pending' ? 'Verification Progressive' : 'Start Identity Check'}
             </button>
           )}
           {profile.kycStatus === 'verified' && (
             <div className="w-full py-4 bg-emerald-500/10 text-emerald-400 font-black rounded-2xl text-[10px] uppercase tracking-widest text-center flex items-center justify-center gap-2">
                <Check size={16} /> Identity Fully Verified
             </div>
           )}
        </div>
      </div>

      {/* Tier/Membership Section */}
      <div className="glass p-10 rounded-[2.5rem] border border-white/5 shadow-2xl mt-8 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-5">
           <Trophy size={200} />
         </div>
         <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
               <Trophy size={28} className="text-orange-400" />
               <h3 className="text-2xl font-black">Account Membership</h3>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full md:w-1/3 p-8 rounded-[2rem] bg-emerald-500 text-black shadow-xl shadow-emerald-500/20 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Active Tier</p>
                <p className="text-4xl font-black capitalize">{profile.tier}</p>
                <div className="mt-4 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest opacity-60">
                   <Check size={14} /> Global Protocol Active
                </div>
              </div>
              
              <div className="flex-1">
                <p className="text-white/40 text-sm leading-relaxed mb-8">
                  Your current membership tier defines your operational limits. Higher tiers unlock institutional-grade liquidity access and priority asset allocation.
                </p>
                <button 
                  onClick={() => setView('tiers')}
                  className="px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                >
                  <Trophy size={16} className="text-emerald-400" /> Manage Membership & Upgrade
                </button>
              </div>
            </div>
         </div>
      </div>

      {/* App Configuration Section */}
      <div className="glass p-10 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
               <h3 className="text-xl font-black mb-2 flex items-center gap-2">
                  <Smartphone size={20} className="text-emerald-400" /> 
                  {isStandalone ? "Native Application" : "Mobile Experience"}
               </h3>
               <p className="text-white/40 text-xs max-w-md">
                  {isStandalone 
                    ? "Your session is running in native standalone mode. Updates are applied automatically on refresh." 
                    : "Add Daily Yield to your home screen for a full-screen, lightning-fast native experience."}
               </p>
            </div>
            
            <button 
               onClick={() => {
                  if (isStandalone) {
                     window.location.reload();
                  } else {
                     setPwaModalOpen(true);
                  }
               }}
               className={cn(
                  "px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95",
                  isStandalone 
                    ? "bg-white/5 hover:bg-white/10 border border-white/10 text-white" 
                    : "bg-emerald-500 text-black shadow-xl shadow-emerald-500/20"
               )}
            >
               {isStandalone ? (
                  <><RefreshCw size={16} /> Refresh App</>
               ) : (
                  <><Download size={16} /> Download App</>
               )}
            </button>
         </div>
      </div>

      {/* PWA Instructions Modal */}
      <Modal isOpen={pwaModalOpen} onClose={() => setPwaModalOpen(false)} title="Install Daily Yield">
         <div className="space-y-6">
            <div className="p-6 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-black shrink-0">
                  <Smartphone size={24} />
               </div>
               <div>
                  <p className="font-black text-white">Native Web Application</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">Enhanced Performance Active</p>
               </div>
            </div>

            <div className="space-y-4">
               {os === 'ios' ? (
                  <div className="space-y-4">
                     <p className="text-white/60 text-sm">To install on your <span className="text-white font-bold">iOS device</span>:</p>
                     <ol className="space-y-3 text-sm text-white/50 px-2 list-decimal list-inside">
                        <li>Tap the <span className="text-white font-bold">Share</span> button (the square with an arrow pointing up) at the bottom of the screen.</li>
                        <li>Scroll down and tap <span className="text-white font-bold">Add to Home Screen</span>.</li>
                        <li>Tap <span className="text-white font-bold">Add</span> in the top right corner.</li>
                     </ol>
                  </div>
               ) : os === 'android' ? (
                  <div className="space-y-4">
                     <p className="text-white/60 text-sm">To install on your <span className="text-white font-bold">Android device</span>:</p>
                     <ol className="space-y-3 text-sm text-white/50 px-2 list-decimal list-inside">
                        <li>Tap the <span className="text-white font-bold">Menu</span> (three dots) in the top right corner.</li>
                        <li>Tap <span className="text-white font-bold">Install App</span> or <span className="text-white font-bold">Add to Home Screen</span>.</li>
                        <li>Follow the on-screen prompts to confirm or tap <span className="text-white font-bold">Add</span>.</li>
                     </ol>
                  </div>
               ) : (
                  <div className="space-y-4">
                     <p className="text-white/60 text-sm">To install on your <span className="text-white font-bold">Desktop</span>:</p>
                     <ol className="space-y-3 text-sm text-white/50 px-2 list-decimal list-inside">
                        <li>Locate the <span className="text-white font-bold">Install</span> icon (laptop with arrow) in the address bar.</li>
                        <li>Follow the browser prompts to <span className="text-white font-bold">Install</span> the app.</li>
                     </ol>
                  </div>
               )}
            </div>

            <button 
               onClick={() => setPwaModalOpen(false)}
               className="w-full py-5 bg-white/5 border border-white/10 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest"
            >
               Got it, thanks!
            </button>
         </div>
      </Modal>

      {/* KYC Modal */}
      <Modal isOpen={isKycSubmitOpen} onClose={() => setIsKycSubmitOpen(false)} title="Identity Submission">
         <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Full Username</label>
                  <input 
                   type="text" 
                   value={kycForm.username} 
                   onChange={(e) => setKycForm({...kycForm, username: e.target.value})}
                   placeholder="John Doe"
                   className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-emerald-500/50" 
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Contact Email</label>
                  <input 
                   type="email" 
                   value={kycForm.email} 
                   onChange={(e) => setKycForm({...kycForm, email: e.target.value})}
                   placeholder="john@example.com"
                   className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-emerald-500/50" 
                  />
               </div>
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Active Phone Line</label>
               <input 
                type="text" 
                value={kycForm.phone} 
                onChange={(e) => setKycForm({...kycForm, phone: e.target.value})}
                placeholder="+234..."
                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-emerald-500/50" 
               />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Residential Address</label>
               <textarea 
                value={kycForm.address} 
                onChange={(e) => setKycForm({...kycForm, address: e.target.value})}
                placeholder="Full state and local address..."
                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-emerald-500/50 h-24 resize-none text-sm" 
               />
            </div>
            <button 
              onClick={handleKycSubmit}
              className="w-full py-5 bg-emerald-500 text-black font-black rounded-2xl text-[10px] uppercase tracking-widest"
            >
              Submit Global Check
            </button>
         </div>
      </Modal>
    </motion.div>
  );
}

function ProfileModal({ isOpen, onClose, profile, user, onLogOut }: { 
  isOpen: boolean, 
  onClose: () => void, 
  profile: UserProfile | null, 
  user: FirebaseUser | null,
  onLogOut: () => void 
}) {
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile?.displayName) {
      setDisplayName(profile.displayName);
    }
  }, [profile?.displayName]);

  if (!isOpen || !profile || !user) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, { displayName });
      alert("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const copyUid = () => {
    navigator.clipboard.writeText(profile.uid);
    alert("UID copied!");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#0a0b12]/90 backdrop-blur-xl" />
      <motion.div initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} className="relative glass-dark p-10 rounded-[3rem] w-full max-w-lg border border-white/5 shadow-2xl overflow-hidden">
         <div className="flex justify-between items-center mb-10">
           <h3 className="text-3xl font-black text-white">Private Profile</h3>
           <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={24} className="text-white" /></button>
         </div>

         <div className="space-y-8">
            <div className="flex justify-center flex-col items-center gap-4 mb-8">
               <div className="relative group">
                 {profile.photoURL ? (
                    <img src={profile.photoURL} alt="Avatar" className="w-24 h-24 rounded-[2rem] object-cover border-2 border-emerald-500/20" />
                 ) : (
                    <div className="w-24 h-24 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center text-emerald-400 border-2 border-emerald-500/20">
                      <UserCircle size={48} />
                    </div>
                 )}
               </div>
               <div className="text-center">
                  <p className="text-[10px] font-black uppercase text-white/30 tracking-[0.3em]">Management Level</p>
                  <p className="text-xl font-black capitalize text-emerald-400">{profile.tier}</p>
               </div>
            </div>

            <div className="space-y-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Email Address (Locked)</label>
                  <div className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white/40 cursor-not-allowed text-sm">
                    {profile.email}
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Display Name</label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-emerald-500/50 text-sm"
                  />
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">User Identification (UID)</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl font-mono text-[10px] text-white/50 truncate">
                      {profile.uid}
                    </div>
                    <button onClick={copyUid} className="p-4 glass rounded-xl hover:bg-white/10 transition-all">
                      <Copy size={16} />
                    </button>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
               <button 
                 onClick={handleSave}
                 disabled={isSaving}
                 className="py-4 bg-emerald-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-emerald-500/20"
               >
                 {isSaving ? 'Processing...' : 'Save Changes'}
               </button>
               <button 
                 onClick={() => { onLogOut(); onClose(); }}
                 className="py-4 bg-white/5 hover:bg-red-500/10 text-white/50 hover:text-red-400 border border-white/10 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all"
               >
                 Sign Out
               </button>
            </div>
         </div>
      </motion.div>
    </div>
  );
}

function MarketDuel({ profile, pageStatus }: { profile: UserProfile | null, pageStatus: Record<string, any> }) {
  const ROUND_DURATION = 5 * 60 * 60 * 1000; // 5 hours
  const WIN_LIMIT = 100;
  
  const [now, setNow] = useState(Date.now());
  const [bidAmount, setBidAmount] = useState('1000');
  const [userBids, setUserBids] = useState<any[]>([]);
  const [globalPool, setGlobalPool] = useState({ A: 0, B: 0 });
  const [adminOutcomes, setAdminOutcomes] = useState<Record<number, 'A' | 'B'>>({});
  const [showHistory, setShowHistory] = useState(false);

  const currentRoundId = Math.floor(now / ROUND_DURATION);
  const roundStartTime = currentRoundId * ROUND_DURATION;
  const timeRemaining = ROUND_DURATION - (now % ROUND_DURATION);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'marketDuelBids'), 
      where('userId', '==', profile.uid || ''),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    return onSnapshot(q, (snap) => {
      setUserBids(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'marketDuelBids'));
  }, [profile?.uid]);

  // Simulated Global Pool for the current round
  useEffect(() => {
    const seed = currentRoundId;
    const poolA = Math.floor(seededRandom(seed * 2) * 500000) + 120000;
    const poolB = Math.floor(seededRandom(seed * 3) * 500000) + 150000;
    setGlobalPool({ A: poolA, B: poolB });
  }, [currentRoundId]);

  function seededRandom(seed: number) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  useEffect(() => {
    return onSnapshot(collection(db, 'marketDuelOutcomes'), (snap) => {
      const outcomes: Record<number, 'A' | 'B'> = {};
      snap.docs.forEach(d => {
        outcomes[Number(d.id)] = d.data().winner;
      });
      setAdminOutcomes(outcomes);
    }, (err) => handleFirestoreError(err, 'list', 'marketDuelOutcomes'));
  }, []);

  // Determine winner for a past round
  const getRoundWinner = (roundId: number) => {
    if (adminOutcomes[roundId]) return adminOutcomes[roundId];
    return seededRandom(roundId) > 0.5 ? 'A' : 'B';
  };

  const handleBid = async (selection: 'A' | 'B') => {
    if (!profile) return;
    if (profile.isWalletFrozen) {
      alert("Transaction Denied: Your wallet is frozen. You cannot place new bids.");
      return;
    }

    // Restriction: User can place multiple bids on the same card, 
    // but the other card is locked once the first bid is placed.
    const existingBids = userBids.filter(b => b.roundId === currentRoundId && b.status === 'active');
    if (existingBids.length > 0 && !existingBids.some(b => b.selection === selection)) {
      alert(`Conflict Detected: You have already committed to Card ${existingBids[0].selection} for this round. The other card is now locked.`);
      return;
    }

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < 500 || amount > 50000) {
      alert("Bid must be between ₦500 and ₦50,000");
      return;
    }
    const currentBalance = Number(profile.balanceNGN) || 0;
    if (currentBalance < amount) {
      alert("Insufficient balance. Deposit first.");
      return;
    }

    const userRef = doc(db, 'users', profile.uid);
    await updateDoc(userRef, {
      balanceNGN: increment(-amount),
      walletBalance: increment(-amount)
    });

    await setDoc(doc(collection(db, 'marketDuelBids')), {
      userId: profile.uid,
      roundId: currentRoundId,
      selection,
      amount,
      status: 'active',
      createdAt: serverTimestamp()
    });

    await setDoc(doc(collection(db, 'transactions')), {
      userId: profile.uid,
      type: 'duel_bid',
      amount: amount,
      status: 'completed',
      createdAt: serverTimestamp()
    });

    alert(`Bid of ${formatCurrency(amount)} placed on Card ${selection}`);
  };

  // Settlement Effect: Check for finished rounds in user's bids
  useEffect(() => {
    if (!profile) return;
    const activeBids = userBids.filter(b => b.status === 'active' && b.roundId < currentRoundId);
    
    activeBids.forEach(async (bid) => {
      const winner = getRoundWinner(bid.roundId);
      const isWin = bid.selection === winner;
      const multiplier = pageStatus.market_duel_multiplier || 1.2;
      const payout = isWin ? bid.amount * multiplier : 0;

      const bidRef = doc(db, 'marketDuelBids', bid.id);
      await updateDoc(bidRef, { status: isWin ? 'won' : 'lost', payout });

      if (isWin) {
        const userRef = doc(db, 'users', profile.uid);
        await updateDoc(userRef, {
          balanceNGN: increment(payout),
          walletBalance: increment(payout),
          totalProfitNGN: increment(payout - bid.amount)
        });

        await setDoc(doc(collection(db, 'transactions')), {
          userId: profile.uid,
          type: 'duel_win',
          amount: payout,
          status: 'completed',
          createdAt: serverTimestamp()
        });

        await setDoc(doc(collection(db, 'notifications')), {
          userId: profile.uid,
          title: 'Duel Victory! ⚔️',
          message: `Your bid on Card ${bid.selection} won! ${formatCurrency(payout)} added to wallet.`,
          type: 'win',
          createdAt: serverTimestamp()
        });
      }
    });
  }, [userBids, currentRoundId, profile?.uid]);

  const formatTime = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  const DuelCard = ({ id, label, pool }: { id: 'A' | 'B', label: string, pool: number }) => {
    // Generate deterministic fluctuating data for graph
    const points = 30;
    const roundElapsed = now - roundStartTime;
    const progress = ( roundElapsed / ROUND_DURATION ) * 100;
    
    // Removed visual bias to keep the winner unpredictable during the round
    const deterministicWinner = getRoundWinner(currentRoundId);
    const bias = 0; // Bias removed

    const chartData = Array.from({ length: points }).map((_, i) => {
      const pointProgress = i / (points - 1);
      const seed = currentRoundId + (id === 'A' ? 100 : 200) + i;
      // Fluctuations that become more stable near the end
      const fluctuationRange = 15 * (1 - pointProgress * 0.5);
      const fluctuation = (seededRandom(seed + Math.floor(now / 10000)) * fluctuationRange) - (fluctuationRange / 2);
      
      const currentProgressValue = pointProgress * progress;
      // Add bias that grows with time
      const totalBias = pointProgress * bias * (progress / 50);
      
      return { val: currentProgressValue + fluctuation + totalBias };
    });

    const currentVal = chartData[chartData.length - 1].val;
    const hasCrossedLimit = currentVal >= WIN_LIMIT;
    
    // Check if this card is already chosen or locked
    const activeBidsInRound = userBids.filter(b => b.roundId === currentRoundId && b.status === 'active');
    const hasCommittedToSomeotherSide = activeBidsInRound.length > 0 && !activeBidsInRound.some(b => b.selection === id);
    const hasCommittedToThisSide = activeBidsInRound.some(b => b.selection === id);

    return (
      <motion.div 
        whileHover={!hasCommittedToSomeotherSide ? { scale: 1.02 } : {}}
        initial={false}
        animate={{ 
          borderColor: hasCommittedToThisSide ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.05)',
          boxShadow: hasCommittedToThisSide ? '0 0 40px rgba(16, 185, 129, 0.1)' : 'none',
          opacity: hasCommittedToSomeotherSide ? 0.4 : 1
        }}
        className={cn(
          "glass rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border relative overflow-hidden flex flex-col h-full transition-all duration-700",
          hasCommittedToThisSide && "bg-emerald-500/[0.02]"
        )}
      >
        {hasCommittedToThisSide && (
          <div className="absolute top-0 right-0 p-4">
            <div className="px-3 py-1 bg-emerald-500 text-black text-[8px] font-black uppercase tracking-[0.2em] rounded-full flex items-center gap-1 shadow-lg">
               <Target size={10} /> Active Selection
            </div>
          </div>
        )}

        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-2xl md:text-4xl font-black italic">CARD {id}</h3>
            </div>
            <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">{label}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-1">Round Pool</p>
            <p className="text-lg md:text-2xl font-black text-emerald-400">{formatCurrency(pool)}</p>
          </div>
        </div>

        <div className="h-48 w-full mb-8 relative">
           <div className={cn(
             "absolute top-0 left-0 w-full border-t border-dashed transition-colors duration-500 flex items-center gap-2 z-10",
             hasCrossedLimit ? "border-emerald-500" : "border-emerald-500/30"
           )}>
              <span className={cn(
                "text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-b-md transition-colors",
                hasCrossedLimit ? "bg-emerald-500 text-black" : "text-emerald-500/50"
              )}>
                Win Limit (100) {hasCrossedLimit && "• TARGET REACHED"}
              </span>
           </div>

           <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={chartData}>
               <defs>
                 <linearGradient id={`gradient-${id}`} x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor={hasCrossedLimit ? "#10b981" : "#10b981"} stopOpacity={0.3}/>
                   <stop offset="95%" stopColor={hasCrossedLimit ? "#10b981" : "#10b981"} stopOpacity={0}/>
                 </linearGradient>
               </defs>
               <ReferenceLine 
                 y={WIN_LIMIT} 
                 stroke={hasCrossedLimit ? "#10b981" : "rgba(16, 185, 129, 0.2)"} 
                 strokeDasharray="3 3"
                 strokeWidth={2}
               />
               <Area 
                 type="monotone" 
                 dataKey="val" 
                 stroke="#10b981" 
                 fill={`url(#gradient-${id})`} 
                 strokeWidth={3}
                 isAnimationActive={false}
                 dot={hasCrossedLimit ? { r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' } : false}
               />
             </AreaChart>
           </ResponsiveContainer>
        </div>

        <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5 mb-6">
           <div className="flex items-center gap-2">
              <Sparkles size={12} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">Yield multiplier</span>
           </div>
           <span className="text-sm font-black text-emerald-400">{(pageStatus.market_duel_multiplier || 1.2).toFixed(1)}x</span>
        </div>

        <button 
          onClick={() => handleBid(id)}
          disabled={hasCommittedToSomeotherSide}
          className={cn(
            "w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl",
            hasCommittedToThisSide
              ? "bg-emerald-500 text-black shadow-emerald-500/30 scale-[1.02]" 
              : hasCommittedToSomeotherSide 
                ? "bg-white/5 text-white/10 cursor-not-allowed" 
                : "bg-white/10 text-white hover:bg-emerald-500 hover:text-black"
          )}
        >
          {hasCommittedToThisSide ? `RE-BID ON CARD ${id}` : hasCommittedToSomeotherSide ? 'CARD LOCKED' : `SELECT CARD ${id}`}
        </button>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-20"
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-black text-white">Market Duel</h2>
        <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.3em]">Predict the Market Momentum</p>
      </div>

      <div className="glass p-8 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-white/5 rounded-2xl">
               <Timer className="text-emerald-400" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase text-white/30 tracking-widest leading-none mb-1">Round ID: #{currentRoundId}</p>
               <p className="text-2xl font-black">Round ends in {formatTime(timeRemaining)}</p>
            </div>
         </div>
         <div className="h-px md:h-12 w-full md:w-px bg-white/10" />
         <div className="flex-1 max-w-sm w-full">
            <div className="relative">
               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-black">₦</span>
               <input 
                 type="number" 
                 value={bidAmount}
                 onChange={(e) => setBidAmount(e.target.value)}
                 className="w-full bg-white/5 border border-white/10 p-5 pl-10 rounded-2xl outline-none focus:border-emerald-500/50 text-sm font-black"
                 placeholder="Enter Bid Amount"
               />
               <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-white/20 tracking-tighter">Min: ₦500</span>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <DuelCard id="A" label="Momentum High" pool={globalPool.A} />
         <DuelCard id="B" label="Stability Low" pool={globalPool.B} />
      </div>

      <div className="space-y-6">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <h3 className="text-2xl font-black">Bid Performance</h3>
              <div className="h-px flex-1 bg-white/5" />
            </div>
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="ml-4 px-6 py-2 glass rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
            >
               <History size={14} className="text-emerald-400" />
               {showHistory ? 'Hide History' : 'View History'}
            </button>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(showHistory ? userBids : userBids.filter(b => b.status === 'active')).length > 0 ? (
              (showHistory ? userBids : userBids.filter(b => b.status === 'active')).map(bid => (
                <div key={bid.id} className="glass p-6 rounded-2xl border border-white/5 flex items-center justify-between group h-24">
                   <div className="flex items-center gap-5">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center font-black",
                        bid.selection === 'A' ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                      )}>
                        {bid.selection}
                      </div>
                      <div>
                        <p className="text-lg font-black">{formatCurrency(bid.amount)}</p>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Round #{bid.roundId}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className={cn(
                        "text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full",
                        bid.status === 'won' ? "bg-emerald-500 text-black" : 
                        bid.status === 'lost' ? "bg-red-500/20 text-red-400" :
                        "bg-white/5 text-white/40"
                      )}>
                         {bid.status === 'active' ? 'IN PROGRESS' : bid.status.toUpperCase()}
                      </p>
                      {bid.status === 'won' && (
                        <p className="text-emerald-400 font-black text-sm mt-1">+{formatCurrency(bid.payout)}</p>
                      )}
                   </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-12 text-center text-white/20 font-black uppercase tracking-[0.4em]">
                {showHistory ? "No bid records found" : "No active bids currently pending"}
              </div>
            )}
         </div>
      </div>
    </motion.div>
  );
}

// --- FAQ Component ---

interface FAQItemProps {
  question: string;
  answer: string;
  index: number;
  key?: React.Key;
}

const FAQItem = ({ question, answer, index }: FAQItemProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass rounded-[2rem] border border-white/5 overflow-hidden mb-4"
    >
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 text-left flex justify-between items-center hover:bg-white/5 transition-all"
      >
        <span className="font-black text-sm uppercase tracking-wider text-white/80">{question}</span>
        <ChevronRight size={20} className={cn("text-emerald-500 transition-transform duration-300", isOpen ? "rotate-90" : "")} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 pb-6 text-white/50 text-sm leading-relaxed"
          >
            <div className="pt-2 border-t border-white/5">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface FAQ {
  id: string;
  question: string;
  answer: string;
  order: number;
}

function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'faqs'), orderBy('order', 'asc'));
    return onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setFaqs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        // Populating real content for the knowledge base
        const realFAQs = [
          {
            id: 'f1',
            question: "How do I make a deposit?",
            answer: "Navigate to the 'Wallet' tab and click 'Deposit'. You can choose between Direct Bank Transfer or automated verification. For manual transfers, ensure you upload a clear proof of payment to expedite verification by our institutional audit team.",
            order: 1
          },
          {
            id: 'f2',
            question: "What are the withdrawal limits?",
            answer: "The withdrawal limits are strictly defined by your membership tier: Tier 1 (Fixed ₦15,000), Tier 2 (₦15,000 - ₦50,000), Tier 3 (₦15,000 - ₦80,000), and Premium (₦15,000 - Unlimited). The platform-wide minimum deposit is ₦3,000.",
            order: 2
          },
          {
            id: 'f3',
            question: "How do Account Tiers work?",
            answer: "Our platform uses a ranking system (Tier 1, Tier 2, Tier 3, and Premium). Higher tiers unlock increased daily yield limits, priority withdrawal processing, and exclusive high-stakes investment opportunities. You can request an upgrade in the 'Membership Upgrade' section.",
            order: 3
          },
          {
            id: 'f4',
            question: "Are the games provably fair?",
            answer: "Yes. Every game in the Quantum Game Hub utilizes cryptographically secure algorithms and quantum-safe probability models. We ensure 100% transparency; you can verify the integrity of every roll, spin, or cards flip.",
            order: 4
          },
          {
            id: 'f5',
            question: "How does the referral system work?",
            answer: "When a new client signs up using your unique referral code and the referral is approved, both you and the referred client receive bonuses (₦1,000 for you and ₦500 for them) credited to your available liquidity.",
            order: 5
          },
          {
            id: 'f6',
            question: "How secure is my account and data?",
            answer: "We utilize multi-layer encryption, including AES-256 for data at rest and TLS 1.3 for data in transit. Your personal information and financial records are stored in a distributed, SOC 2 compliant environment.",
            order: 6
          },
          {
            id: 'f7',
            question: "What happens if I forget my password?",
            answer: "You can initiate a password reset from the login screen. A secure link will be sent to your registered email address. For accounts linked with Google, simply use the standard Google OAuth flow.",
            order: 7
          },
          {
            id: 'f8',
            question: "Why was my account suspended?",
            answer: "Suspensions occur if our automated risk management system detects violations of our Terms of Service, such as multiple accounts, fraudulent activity, or suspicious referral patterns. You can contact support for an appeal.",
            order: 8
          },
          {
            id: 'f9',
            question: "What are Investment Plans?",
            answer: "Investment plans are fixed-income assets where you lock a specific capital for a set duration to earn a'guaranteed yield. Returns vary based on the capital and the duration of the asset class.",
            order: 9
          },
          {
            id: 'f10',
            question: "How can I contact support?",
            answer: "You can reach us 24/7 via the WhatsApp link in the Support Center or by emailing infodailyyield@gmail.com. We typically respond within 15 minutes during market hours.",
            order: 10
          }
        ];
        // Set state immediately for UI
        setFaqs(realFAQs);
        
        // Optionally seed the DB if needed, but for now just show them
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'list', 'faqs');
      setLoading(false);
    });
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto pb-40"
    >
      <div className="text-center mb-16">
        <h2 className="text-5xl font-black text-white mb-4">Support <span className="text-emerald-500">Center</span></h2>
        <p className="text-white/40 uppercase tracking-[0.4em] text-[10px] font-black">Knowledge Base & Assistance</p>
      </div>

      {loading ? (
        <div className="py-20 text-center opacity-20">
           <RefreshCw size={48} className="mx-auto mb-4 animate-spin" />
           <p className="font-black uppercase tracking-widest text-sm">Syncing FAQ data...</p>
        </div>
      ) : (
        <div className="space-y-2 mb-16">
          {faqs.map((faq: FAQ, i: number) => (
            <FAQItem key={faq.id} index={i} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      )}

      <div className="glass p-10 rounded-[3.5rem] border border-emerald-500/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5">
           <HelpCircle size={120} className="text-emerald-500" />
        </div>
        <div className="relative z-10 text-center">
          <h3 className="text-3xl font-black text-white mb-4">Still need help?</h3>
          <p className="text-white/40 text-sm mb-10 max-w-md mx-auto">Our support team is available 24/7 to assist with your liquidity needs and platform inquiries.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a 
              href="https://wa.me/447310239556" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 py-5 bg-emerald-500 text-black font-black rounded-3xl text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <MessageCircle size={20} /> Chat on WhatsApp
            </a>
            <a 
              href="mailto:infodailyyield@gmail.com"
              className="flex items-center justify-center gap-3 py-5 bg-white/5 hover:bg-white/10 text-white font-black rounded-3xl text-sm uppercase tracking-widest border border-white/10 active:scale-95 transition-all"
            >
              <Send size={20} /> Send Email
            </a>
          </div>
          
          <div className="mt-10 pt-10 border-t border-white/5 flex flex-col items-center gap-2">
             <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Official Channels Only</p>
             <p className="text-emerald-500/40 text-xs font-mono">support.dailyyield.terminal</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TiersPage({ profile }: { profile: UserProfile | null }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [upgradeForm, setUpgradeForm] = useState({
    requestedTier: 'tier2',
    message: ''
  });

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'tierRequests'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [profile?.uid]);

  const handleSubmitRequest = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // Ensure email and username are never undefined
      const userEmail = profile.email || auth.currentUser?.email || null;
      const userName = profile.displayName || auth.currentUser?.displayName || userEmail?.split('@')[0] || 'Investor';

      const docRef = await addDoc(collection(db, 'tierRequests'), {
        userId: profile.uid,
        uid: profile.uid, 
        email: userEmail,
        username: userName,
        currentTier: profile.tier,
        requestedTier: upgradeForm.requestedTier,
        message: upgradeForm.message,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      console.log("Tier request submitted with ID:", docRef.id);
      alert("Request sent successfully. Our institutional audit team will verify your account status.");
      setShowUpgradeModal(false);
      setUpgradeForm({ requestedTier: 'tier2', message: '' });
    } catch (err: any) {
      console.error("Tier upgrade submission error:", err);
      handleFirestoreError(err, 'create', 'tierRequests');
    } finally {
      setLoading(false);
    }
  };

  const TIERS_LIST = [
    { id: 'tier1', label: 'Tier 1 - Basic', color: 'bg-slate-400' },
    { id: 'tier2', label: 'Tier 2 - Advanced', color: 'bg-blue-400' },
    { id: 'tier3', label: 'Tier 3 - Expert', color: 'bg-purple-400' },
    { id: 'premium', label: 'Premium - Institutional', color: 'bg-emerald-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-12 pb-32"
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-black text-white">Membership Upgrades</h2>
        <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.4em]">Elevate your investment capacity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass p-10 rounded-[3rem] border border-white/5 space-y-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <Trophy size={40} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-1">Current Standing</p>
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{profile?.tier} Account</h3>
            </div>
          </div>
          
          <p className="text-white/50 text-sm leading-relaxed">
            Your current membership level determines your daily liquidity limits and priority within the Quantum network. High-tier accounts bypass standard audit delays.
          </p>

          <button 
            onClick={() => setShowUpgradeModal(true)}
            className="w-full py-6 bg-emerald-500 text-black font-black rounded-3xl text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
          >
            Request Rank Upgrade
          </button>
        </div>

        <div className="glass p-10 rounded-[3rem] border border-white/5 flex flex-col h-full">
          <h3 className="text-2xl font-black mb-8 flex items-center gap-3 text-white">
            <History size={24} className="text-emerald-400" /> Tier Logs
          </h3>
          <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {requests.length > 0 ? (
              requests.map((req) => (
                <div key={req.id} className="p-6 bg-white/5 rounded-3xl border border-white/5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-white text-sm uppercase tracking-widest">{req.requestedTier}</p>
                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">
                        {req.createdAt?.toDate().toLocaleDateString()}
                      </p>
                    </div>
                    <div className={cn(
                      "px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em]",
                      req.status === 'pending' ? "bg-amber-500/10 text-amber-500" :
                      req.status === 'approved' ? "bg-emerald-500/10 text-emerald-500" :
                      "bg-red-500/10 text-red-500"
                    )}>
                      {req.status}
                    </div>
                  </div>
                  {req.status === 'rejected' && req.rejectionNote && (
                    <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                      <p className="text-[8px] font-black text-red-500/50 uppercase tracking-widest mb-1">Rejection Note</p>
                      <p className="text-[10px] text-red-400 leading-relaxed font-bold">{req.rejectionNote}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-20">
                <ChevronRight size={40} className="rotate-90 mb-2" />
                <p className="text-[8px] font-black uppercase tracking-widest">No requests found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} title="Request Upgrade">
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase text-white/30 tracking-widest block mb-2">Current Tier</label>
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-white font-black opacity-50 capitalize">
              {profile?.tier}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-white/30 tracking-widest block mb-2">Target Upgrade</label>
            <select 
              value={upgradeForm.requestedTier}
              onChange={(e) => setUpgradeForm({ ...upgradeForm, requestedTier: e.target.value })}
              className="w-full bg-[#0a0b12] border border-white/10 p-5 rounded-2xl outline-none focus:border-emerald-500/50 text-white font-black capitalize"
            >
              {TIERS_LIST.filter(t => t.id !== profile?.tier).map(t => (
                <option key={t.id} value={t.id} className="bg-[#0a0b12]">{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-white/30 tracking-widest block mb-2">Justification Message</label>
            <textarea 
              value={upgradeForm.message}
              onChange={(e) => setUpgradeForm({ ...upgradeForm, message: e.target.value })}
              className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-emerald-500/50 text-white text-sm min-h-[120px]"
              placeholder="Tell our underwriters why you deserve an upgrade..."
            />
          </div>
          <button 
            onClick={handleSubmitRequest}
            disabled={loading}
            className="w-full py-6 bg-emerald-500 text-black font-black rounded-3xl text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Transmit Request'}
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}

function ReferralPage({ profile, onNavigate }: { profile: UserProfile | null, onNavigate?: (v: any) => void }) {
  const [redeemCode, setRedeemCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [referralLogs, setReferralLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'referrals'),
      where('referrerUid', '==', profile.uid || ''),
      orderBy('timestamp', 'desc')
    );
    const unsubReferrals = onSnapshot(q, (snap) => {
      setReferrals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'referrals'));

    const qLogs = query(
      collection(db, 'referralRequests'),
      where('referredUserId', '==', profile.uid || ''),
      orderBy('createdAt', 'desc')
    );
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      setReferralLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'referralRequests'));

    return () => {
      unsubReferrals();
      unsubLogs();
    };
  }, [profile?.uid]);

  const handleRedeem = async () => {
    if (!profile || !redeemCode.trim()) return;
    if (profile.hasRedeemedCode) {
      alert("You already redeemed a code");
      return;
    }
    const code = redeemCode.trim().toUpperCase();
    if (code === profile.referralCode) {
      alert("You cannot redeem your own code");
      return;
    }

    setLoading(true);
    try {
      // 1. Check if user already redeemed
      if (profile.hasRedeemedCode) {
        alert("You have already redeemed a code.");
        setLoading(false);
        return;
      }

      // 2. Check if the code is valid (find the referrer)
      const q = query(collection(db, 'users'), where('referralCode', '==', code), limit(1));
      const referrerSnap = await getDocs(q);
      
      if (referrerSnap.empty) {
        alert("Invalid referral code");
        setLoading(false);
        return;
      }

      const referrerData = referrerSnap.docs[0].data() as UserProfile;
      if (referrerData.uid === profile.uid) {
        alert("You cannot redeem your own code.");
        setLoading(false);
        return;
      }

      // 3. Check for existing pending request
      const reqQ = query(
        collection(db, 'referralRequests'), 
        where('referredUserId', '==', profile.uid),
        where('status', '==', 'pending'),
        limit(1)
      );
      const existingReq = await getDocs(reqQ);
      if (!existingReq.empty) {
        alert("You already have a pending referral request.");
        setLoading(false);
        return;
      }

      // 4. Create the request
      await addDoc(collection(db, 'referralRequests'), {
        referrerCode: code,
        referrerUid: referrerSnap.docs[0].id,
        referredUserId: profile.uid,
        referredUsername: profile.displayName || 'User',
        status: 'pending',
        createdAt: serverTimestamp()
      });

      alert(`Request sent. Awaiting admin approval.`);
      setRedeemCode('');
    } catch (error: any) {
      console.error("Redeem error:", error);
      alert("Failed to send request: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-32"
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-black text-white">Referral System</h2>
        <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.3em]">Invite friends and share ₦1,500 in total bonuses</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* My Code Section */}
          <div className="glass p-10 rounded-[3rem] border border-white/5 space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-4">Your Invitation Code</p>
              
              {(profile?.totalDepositedNGN || 0) > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-white/5 border border-white/10 p-6 rounded-3xl text-3xl font-black text-emerald-400 tracking-wider">
                    {profile?.referralCode || 'GENERATING...'}
                  </div>
                  <button 
                    onClick={() => {
                      if (profile?.referralCode) {
                        navigator.clipboard.writeText(profile.referralCode);
                        alert("Code copied!");
                      }
                    }}
                    className="p-6 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/10 transition-all text-white"
                  >
                    <Copy size={28} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-10 rounded-3xl bg-white/[0.02] border border-dashed border-white/10 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                    <Lock size={32} />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold mb-1">Code Locked</p>
                    <p className="text-white/40 text-[10px] leading-relaxed uppercase tracking-wider">Make your first deposit (Min ₦3,000)<br/>to unlock your referral rewards.</p>
                  </div>
                  <button 
                    onClick={() => onNavigate?.('wallet')}
                    className="mt-2 px-6 py-3 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20"
                  >
                    Deposit Now
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                <p className="text-[10px] uppercase font-black text-white/30 mb-2 tracking-widest">Total Referrals</p>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-black text-white">{profile?.totalReferrals || 0}</p>
                  <p className="text-[10px] font-bold text-white/20 mb-1">Accounts</p>
                </div>
              </div>
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                <p className="text-[10px] uppercase font-black text-white/30 mb-2 tracking-widest">Total Earned</p>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-black text-emerald-400">{formatCurrency(profile?.referralEarnings || 0)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Redeem Section */}
          <div className="glass p-10 rounded-[3rem] border border-white/5 space-y-6">
            <h3 className="text-2xl font-black flex items-center gap-3">
              <Sparkles className="text-amber-400" size={24} /> Redeem Invitation
            </h3>
            <p className="text-sm text-white/50 leading-relaxed">
              Enter a friend's referral code to credit them with ₦1,000 and earn ₦500 yourself upon approval. This action is one-time only.
            </p>
            <div className="space-y-4">
              <input 
                type="text"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value)}
                placeholder="Ex: DY-A9K2M5"
                disabled={profile?.hasRedeemedCode || loading}
                className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-emerald-500/50 text-white font-black tracking-widest placeholder:opacity-20"
              />
              <button 
                onClick={handleRedeem}
                disabled={profile?.hasRedeemedCode || loading || !redeemCode.trim()}
                className={cn(
                  "w-full py-6 rounded-3xl font-black text-[12px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-2xl",
                  profile?.hasRedeemedCode 
                    ? "bg-white/5 text-white/20 cursor-not-allowed" 
                    : "bg-emerald-500 text-black shadow-emerald-500/20"
                )}
              >
                {loading ? 'Processing...' : profile?.hasRedeemedCode ? 'Code Already Redeemed' : 'Redeem Now'}
              </button>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div className="space-y-6">
          <div className="glass p-10 rounded-[3rem] border border-white/5 flex flex-col h-full">
             <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
                <History className="text-emerald-400" size={24} /> Recent Referrals
             </h3>
             <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                {referrals.length > 0 ? (
                  referrals.map((ref) => (
                    <div key={ref.id} className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-white/[0.08] transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                          <UserCircle size={24} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-white truncate">{ref.redeemerEmail}</p>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                            {ref.timestamp?.toDate().toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 font-black tracking-tighter text-lg">+₦1,000</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-20">
                     <Files size={48} />
                     <p className="font-black uppercase tracking-[0.3em] text-[10px]">No referrals yet</p>
                  </div>
                )}
             </div>
          </div>

          <div className="glass p-10 rounded-[3rem] border border-white/5 flex flex-col h-full">
             <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
                <Sparkles className="text-emerald-400" size={24} /> Redemption Status
             </h3>
             <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                {referralLogs.length > 0 ? (
                  referralLogs.map((log) => (
                    <div key={log.id} className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-white/[0.08] transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/50">
                          <Hash size={24} />
                        </div>
                        <div>
                          <p className="font-black text-white">Code: {log.referrerCode}</p>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                            {log.createdAt?.toDate().toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                          log.status === 'pending' ? "bg-amber-500/10 text-amber-500" :
                          log.status === 'approved' ? "bg-emerald-500/10 text-emerald-400" :
                          "bg-red-500/10 text-red-500"
                        )}>
                          {log.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-20">
                     <History size={48} />
                     <p className="font-black uppercase tracking-[0.3em] text-[10px]">No redemption logs</p>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#0a0b12]/90 backdrop-blur-xl" />
      <motion.div initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} className="relative glass-dark p-10 rounded-[3rem] w-full max-w-lg border border-white/5 shadow-2xl">
         <div className="flex justify-between items-center mb-8">
           <h3 className="text-3xl font-black text-white">{title}</h3>
           <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={24} className="text-white" /></button>
         </div>
         {children}
      </motion.div>
    </div>
  );
}

/**
 * Diagnoses and handles Firestore permission errors with detailed context.
 */
interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
  }
}

/**
 * Diagnoses and handles Firestore permission errors with detailed context.
 */
function handleFirestoreError(error: any, operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write', path: string | null = null) {
  if (error?.code === 'permission-denied') {
    const authInfo = auth.currentUser ? {
      userId: auth.currentUser.uid,
      email: auth.currentUser.email || 'N/A',
      emailVerified: auth.currentUser.emailVerified,
      isAnonymous: auth.currentUser.isAnonymous,
    } : {
      userId: 'not-authenticated',
      email: 'N/A',
      emailVerified: false,
      isAnonymous: false,
    };

    const errorInfo = {
      error: error.message,
      operationType,
      path,
      authInfo
    };

    console.error("Firestore Security Error:", JSON.stringify(errorInfo, null, 2));
    alert(`Security Error: You do not have permission to perform this ${operationType} operation.`);
  } else {
    console.error(`Firestore ${operationType} Error:`, error);
  }
}

/**
 * Validates connection to Firestore.
 */
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'system', 'health-check'));
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: Client is offline.");
    }
  }
}

type AdminTab = 'users' | 'broadcast' | 'alerts' | 'withdrawals' | 'kyc' | 'tiers' | 'registry' | 'faq' | 'airdrop' | 'referrals' | 'system' | 'deposits' | 'referral_requests' | 'investments' | 'page_management' | 'market_duel' | 'wallet_security' | 'fees';

function DepositRequestPage({ profile, prefillAmount, setView }: { profile: UserProfile | null, prefillAmount: number, setView: (v: View) => void }) {
  const [amount, setAmount] = useState(prefillAmount || 0);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(profile?.email || '');
  const [transactionId, setTransactionId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (prefillAmount) setAmount(prefillAmount);
  }, [prefillAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!file) {
      alert("Please upload your payment receipt photo.");
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    try {
      const currentAuthUid = auth.currentUser?.uid;
      console.log("DEBUG: Auth/Profile status:", {
        currentAuthUid,
        profileUid: profile.uid,
        match: currentAuthUid === profile.uid
      });

      if (!currentAuthUid) {
        throw new Error("User not authenticated with Firebase Auth");
      }

      console.log("DEBUG: Starting deposit submission (Cloudinary)", { userId: profile.uid, amount, phone });
      
      // 1. Upload file to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'dailyyield');
      formData.append('cloud_name', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dkc6byrwm');

      const receiptUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dkc6byrwm'}/image/upload`, true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            setUploadProgress(progress);
            console.log("DEBUG: Cloudinary Progress:", Math.round(progress) + "%");
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 201) {
            const response = JSON.parse(xhr.responseText);
            console.log("DEBUG: Cloudinary Success:", response.secure_url);
            resolve(response.secure_url);
          } else {
            console.error("DEBUG: Cloudinary Error Status:", xhr.status, xhr.responseText);
            try {
              const errData = JSON.parse(xhr.responseText);
              reject(new Error(errData.error?.message || "Cloudinary upload failed"));
            } catch {
              reject(new Error(`Cloudinary upload failed with status ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => {
          console.error("DEBUG: Cloudinary Network Error");
          reject(new Error("Network error during Cloudinary upload"));
        };

        xhr.send(formData);
      });

      console.log("DEBUG: Image available at:", receiptUrl);

      // 2. Create deposit request doc
      const currentUid = auth.currentUser?.uid;
      if (!currentUid) throw new Error("No authenticated UID found");

      const payload = {
        userId: currentUid,
        username: profile.displayName || 'Investor',
        email: email,
        phone: phone,
        amount: Number(amount),
        receiptUrl: receiptUrl,
        transactionId: transactionId || '',
        status: 'pending',
        createdAt: serverTimestamp()
      };
      
      console.log("DEBUG: Final Deposit Payload:", JSON.stringify({
        ...payload,
        createdAt: 'serverTimestamp()'
      }));
      
      console.log("DEBUG: Saving to Firestore...");
      try {
        await addDoc(collection(db, 'depositRequests'), payload);
      } catch (fErr: any) {
        handleFirestoreError(fErr, 'create', 'depositRequests');
      }
      console.log("DEBUG: Submission complete!");

      alert("Deposit request sent successfully! Awaiting admin approval.");
      setView('wallet');
    } catch (err: any) {
      console.error("DEBUG: Full submission error:", err);
      // Give a more descriptive error if it's storage related
      if (err.code?.includes('storage/')) {
        alert(`Storage Error: ${err.message}. Please ensure you have enabled Firebase Storage in your console.`);
      } else {
        alert("Failed to submit request: " + (err.message || "Unknown connectivity error"));
      }
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-xl mx-auto space-y-10 py-10 pb-32"
    >
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 mx-auto">
          <Upload size={32} />
        </div>
        <h2 className="text-4xl font-black text-white">Deposit Proof</h2>
        <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.3em] max-w-xs mx-auto">Upload your receipt to complete the verification process</p>
      </div>

      <form onSubmit={handleSubmit} className="glass p-10 rounded-[3rem] border border-white/10 space-y-8">
        <div className="space-y-6">
          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-white/30 tracking-widest pl-2">Deposit Amount (₦)</label>
             <input 
               type="number"
               value={amount}
               readOnly
               className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-xl font-bold text-white/50 cursor-not-allowed outline-none"
               required
             />
             <p className="text-[8px] font-bold text-emerald-500/50 uppercase tracking-widest pl-2">Locked to initiated payment amount</p>
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-white/30 tracking-widest pl-2">Phone Number</label>
             <input 
               type="tel"
               value={phone}
               onChange={(e) => setPhone(e.target.value)}
               placeholder="Enter registered phone"
               className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white focus:border-emerald-500/50 transition-all outline-none"
               required
             />
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-white/30 tracking-widest pl-2">Email Address</label>
             <input 
               type="email"
               value={email}
               onChange={(e) => setEmail(e.target.value)}
               className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white focus:border-emerald-500/50 transition-all outline-none"
               required
             />
          </div>
          <div className="space-y-3">
             <div className="flex justify-between items-center px-2">
               <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Transaction ID (Optional)</label>
               <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-tighter bg-emerald-500/5 px-2 py-1 rounded-full">Speed Up Approval</span>
             </div>
             <input 
               type="text"
               value={transactionId}
               onChange={(e) => setTransactionId(e.target.value)}
               placeholder="Enter transaction ref/ID"
               className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white focus:border-emerald-500/50 transition-all outline-none"
             />
             <div className="px-2 space-y-1">
               <p className="text-[9px] text-white/40 leading-relaxed">
                 To find this, go to your <span className="text-white/60">payment receipt</span> in your bank app and copy the <span className="text-white/60">Transaction ID</span> or <span className="text-white/60">Reference Number</span>.
               </p>
               <p className="text-[9px] text-emerald-500/60 font-bold italic">
                 Note: Providing this ID helps our team verify and approve your deposit much faster.
               </p>
             </div>
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-white/30 tracking-widest pl-2">Receipt Photo</label>
             <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/10 rounded-3xl cursor-pointer hover:bg-white/5 transition-all group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                   {file ? (
                     <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="text-emerald-500 mb-2" size={32} />
                        <span className="text-[10px] font-black text-white/60 tracking-widest uppercase">{file.name}</span>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center gap-2">
                        <Upload className="text-white/20 group-hover:text-emerald-400 group-hover:scale-110 transition-all" size={32} />
                        <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mt-2">Choose receipt file</p>
                     </div>
                   )}
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
             </label>
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full py-6 bg-emerald-500 text-black text-[12px] font-black uppercase tracking-[0.2em] rounded-[2rem] shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all flex flex-col items-center justify-center gap-1"
        >
          {loading ? (
             <>
               <div className="flex items-center gap-3">
                 <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
                 <span>{uploadProgress > 0 && uploadProgress < 100 ? `Uploading ${Math.round(uploadProgress)}%` : 'Syncing Data...'}</span>
               </div>
               {uploadProgress > 0 && (
                 <div className="w-48 h-1 bg-black/10 rounded-full overflow-hidden mt-2">
                    <motion.div 
                      className="h-full bg-black" 
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                    />
                 </div>
               )}
             </>
          ) : (
             <div className="flex items-center gap-3">
               <span>Submit Verification</span> <ArrowUpRight size={18} />
             </div>
          )}
        </button>
      </form>
    </motion.div>
  );
}

function AdminPanel({ pageStatus }: { pageStatus: Record<string, boolean> }) {
  const [users, setUsers] = useState<any[]>([]);
  const [kycRequests, setKycRequests] = useState<any[]>([]);
  const [tierRequests, setTierRequests] = useState<any[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);
  const [depositRequests, setDepositRequests] = useState<any[]>([]);
  const [referralRequests, setReferralRequests] = useState<any[]>([]);
  const [globalInvestments, setGlobalInvestments] = useState<Investment[]>([]);
  const [marketDuelBids, setMarketDuelBids] = useState<any[]>([]);
  const [marketDuelOutcomes, setMarketDuelOutcomes] = useState<Record<number, 'A' | 'B'>>({});
  const [search, setSearch] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'success'>('info');
  const [alertForm, setAlertForm] = useState({ userId: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userAlertMessage, setUserAlertMessage] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [faqForm, setFaqForm] = useState({ id: '', question: '', answer: '', order: 0 });
  const [isEditingFAQ, setIsEditingFAQ] = useState(false);
  const [airdrops, setAirdrops] = useState<any[]>([]);
  const [airdropForm, setAirdropForm] = useState({ name: '', description: '', amount: '' });
  const [isCreatingAirdrop, setIsCreatingAirdrop] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const handleSystemMigration = async () => {
    if (!confirm("This will update all user documents to ensure missing fields are added and initialize necessary collections. Proceed?")) return;
    setIsMigrating(true);
    try {
      // 1. Initialize Collections (The "Add immediately" request)
      // Create a hidden system document to ensure collection exists in console
      const colls = ['depositRequests', 'withdrawals', 'kycRequests', 'tierRequests', 'airdrops', 'faqs', 'broadcast', 'system'];
      for (const coll of colls) {
        try {
          const snap = await getDocs(query(collection(db, coll), limit(1)));
          if (snap.empty) {
            console.log(`Initializing collection: ${coll}`);
            await setDoc(doc(db, coll, '_init_'), {
              type: 'system_init',
              description: 'Collection initialized by system sync',
              createdAt: serverTimestamp(),
              hidden: true
            });
          }
        } catch (e) {
          console.warn(`Error initializing ${coll}:`, e);
        }
      }

      // 2. Try Server-Side Migration First
      const response = await fetch('/api/admin/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: 'migrate_secret_2024' })
      });
      
      const resText = await response.text();
      let data;
      try {
        data = JSON.parse(resText);
      } catch (e) {
        console.warn("Server returned non-JSON response:", resText);
      }

      if (data?.success) {
        alert(`Server Migration successful! Updated ${data.migratedCount} users.`);
        setIsMigrating(false);
        return;
      }

      // 2. Fallback to Client-Side Migration if server fails or returns error
      console.log("Server migration failed or returned error. Attempting client-side fallback...");
      const usersSnap = await getDocs(collection(db, 'users'));
      let count = 0;
      
      const migrationPromises = usersSnap.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        const updates: any = {};
        
        if (userData.hasDepositedBefore === undefined) {
          updates.hasDepositedBefore = false;
          updates.firstDepositBonusClaimed = false;
        } else {
          if (userData.firstDepositBonusClaimed === undefined) {
             updates.firstDepositBonusClaimed = userData.hasDepositedBefore;
          }
        }
        if (userData.walletBalance === undefined) updates.walletBalance = userData.balanceNGN || 0;
        if (userData.balanceNGN === undefined) updates.balanceNGN = 0;
        if (userData.isWalletFrozen === undefined) updates.isWalletFrozen = false;
        if (userData.referralActive === undefined) updates.referralActive = false;
        if (userData.totalProfitNGN === undefined) updates.totalProfitNGN = userData.totalProfit || 0;
        if (!userData.referralCode) updates.referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        if (userData.referralEarnings === undefined) updates.referralEarnings = 0;
        if (userData.totalReferrals === undefined) updates.totalReferrals = 0;
        if (userData.totalDepositedNGN === undefined) updates.totalDepositedNGN = 0;
        if (userData.totalWithdrawnNGN === undefined) updates.totalWithdrawnNGN = 0;
        if (userData.kycStatus === undefined) updates.kycStatus = 'unverified';
        if (userData.hasRedeemedCode === undefined) updates.hasRedeemedCode = false;
        if (!userData.tier) updates.tier = 'tier1';
        if (userData.streak === undefined) updates.streak = 0;
        if (userData.totalGamesPlayed === undefined) updates.totalGamesPlayed = 0;

        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, 'users', userDoc.id), updates);
          count++;
        }
      });

      await Promise.all(migrationPromises);
      alert(`Client Migration successful! Updated ${count} users.`);
    } catch (err: any) {
      alert("Migration error: " + err.message);
    } finally {
      setIsMigrating(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users' && selectedUser) {
      // Fetch referred users for the selected user
      const qReferrals = query(collection(db, 'referrals'), where('referrerUid', '==', selectedUser.uid || selectedUser.id || ''));
      const unsubscribe = onSnapshot(qReferrals, (snap) => {
        setReferredUsers(snap.docs.map(d => d.data()));
      });
      return () => unsubscribe();
    }
  }, [activeTab, selectedUser]);

  useEffect(() => {
    // Listen to all users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => handleFirestoreError(err, 'list', 'users'));

    // Listen to KYC requests
    const unsubKyc = onSnapshot(query(collection(db, 'kycRequests'), where('status', '==', 'pending')), (snap) => {
      setKycRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'kycRequests'));

    // Listen to Tier requests
    const unsubTier = onSnapshot(query(collection(db, 'tierRequests'), where('status', '==', 'pending')), (snap) => {
      setTierRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'tierRequests'));

    // Listen to Withdrawal requests
    const unsubWithdrawal = onSnapshot(query(collection(db, 'withdrawals'), where('status', '==', 'pending')), (snap) => {
      setWithdrawalRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'withdrawals'));

    // Listen to Deposit requests
    const unsubDeposits = onSnapshot(query(collection(db, 'depositRequests'), where('status', '==', 'pending')), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort manually to avoid index issues for now
      setDepositRequests(docs.sort((a: any, b: any) => {
        const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bt - at;
      }));
    }, (err) => handleFirestoreError(err, 'list', 'depositRequests'));

    // Listen to Referral requests
    const unsubReferralReqs = onSnapshot(query(collection(db, 'referralRequests'), where('status', '==', 'pending')), (snap) => {
      setReferralRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'referralRequests'));

    // Listen to Global Investments
    const unsubInvestments = onSnapshot(collection(db, 'investments'), (snap) => {
      setGlobalInvestments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'investments'));

    // Listen to Market Duel Bids
    const unsubDuelBids = onSnapshot(query(collection(db, 'marketDuelBids'), where('status', '==', 'active')), (snap) => {
      setMarketDuelBids(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'marketDuelBids'));

    // Listen to Market Duel Outcomes
    const unsubDuelOutcomes = onSnapshot(collection(db, 'marketDuelOutcomes'), (snap) => {
      const outcomes: Record<number, 'A' | 'B'> = {};
      snap.docs.forEach(d => {
        outcomes[Number(d.id)] = d.data().winner;
      });
      setMarketDuelOutcomes(outcomes);
    }, (err) => handleFirestoreError(err, 'list', 'marketDuelOutcomes'));

    // Listen to FAQs
    const unsubFaqs = onSnapshot(query(collection(db, 'faqs'), orderBy('order', 'asc')), (snap) => {
      setFaqs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubUsers();
      unsubKyc();
      unsubTier();
      unsubWithdrawal();
      unsubDeposits();
      unsubReferralReqs();
      unsubInvestments();
      unsubDuelBids();
      unsubDuelOutcomes();
      unsubFaqs();
    };
  }, []);

  const handleBanUser = async (uid: string) => {
    await updateDoc(doc(db, 'users', uid), {
      banned: true,
      banReason: "Suspicious and full activities"
    });
    alert("User Banned!");
  };

  const handleUnbanUser = async (uid: string) => {
    await updateDoc(doc(db, 'users', uid), {
      banned: false
    });
    alert("User Unbanned!");
  };

  const handleApproveKYC = async (uid: string) => {
    await updateDoc(doc(db, 'users', uid), { kycStatus: 'verified' });
    await updateDoc(doc(db, 'kycRequests', uid), { status: 'verified' });
    alert("KYC Approved!");
  };

  const handleRejectKYC = async (uid: string) => {
    await updateDoc(doc(db, 'users', uid), { kycStatus: 'rejected' });
    await updateDoc(doc(db, 'kycRequests', uid), { status: 'rejected' });
    alert("KYC Rejected!");
  };

  const handleApproveTier = async (requestId: string, uid: string, tier: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { tier });
      await updateDoc(doc(db, 'tierRequests', requestId), { status: 'approved' });
      
      await setDoc(doc(collection(db, 'notifications')), {
        userId: uid,
        title: 'Tier Upgrade Approved! 🏆',
        message: `Your membership has been upgraded to ${tier}. Enjoy exclusive benefits!`,
        type: 'success',
        createdAt: serverTimestamp()
      });

      // Trigger Push
      await triggerPush(uid, 'Tier Upgrade Approved! 🏆', `Welcome to ${tier.toUpperCase()}! Your new membership status is active.`, '/tiers');

      alert(`Tier ${tier} Approved!`);
    } catch (err: any) {
      handleFirestoreError(err, 'update', 'tierRequests');
    }
  };

  const handleRejectTier = async (requestId: string, uid: string, note?: string) => {
    try {
      await updateDoc(doc(db, 'tierRequests', requestId), { 
        status: 'rejected',
        adminNote: note || ''
      });
      
      await setDoc(doc(collection(db, 'notifications')), {
        userId: uid,
        title: 'Upgrade Request Rejected 🛡️',
        message: `Your tier upgrade request was not approved. Note: ${note || 'Standard policy check failure.'}`,
        type: 'alert',
        createdAt: serverTimestamp()
      });

      // Trigger Push
      await triggerPush(uid, 'Upgrade Request Rejected 🛡️', note || 'Your membership upgrade request was not successful at this time.', '/tiers');

      alert("Tier Request Rejected!");
    } catch (err: any) {
      handleFirestoreError(err, 'update', 'tierRequests');
    }
  };

  const handleAddFunds = async (uid: string, amount: number, reason: string) => {
    if (isNaN(amount) || amount <= 0) return;
    try {
      await updateDoc(doc(db, 'users', uid), { 
        balanceNGN: increment(amount),
        walletBalance: increment(amount)
      });
      
      const txId = doc(collection(db, 'transactions')).id;
      await setDoc(doc(db, 'transactions', txId), {
        userId: uid,
        type: 'bonus',
        amount: amount,
        status: 'completed',
        createdAt: serverTimestamp(),
        description: `Allocation of ₦${amount.toLocaleString()} from Admin - ${reason}`
      });

      await setDoc(doc(collection(db, 'notifications')), {
        userId: uid,
        title: 'Funds Added! 💰',
        message: `Allocation of ₦${amount.toLocaleString()} from Admin credited to your account.`,
        type: 'success',
        createdAt: serverTimestamp()
      });
      
      alert("Funds added successfully!");
    } catch (err: any) {
      handleFirestoreError(err, 'update', `users/${uid}`);
    }
  };

  const handleDeductFunds = async (uid: string, amount: number, reason: string) => {
    if (isNaN(amount) || amount <= 0) return;
    try {
      await updateDoc(doc(db, 'users', uid), { 
        balanceNGN: increment(-amount),
        walletBalance: increment(-amount)
      });
      
      const txId = doc(collection(db, 'transactions')).id;
      await setDoc(doc(db, 'transactions', txId), {
        userId: uid,
        type: 'game_fee',
        amount: amount,
        status: 'completed',
        createdAt: serverTimestamp(),
        description: `Deduction of ₦${amount.toLocaleString()} from your account by Admin - ${reason}`
      });

      await setDoc(doc(collection(db, 'notifications')), {
        userId: uid,
        title: 'Funds Deducted 🛡️',
        message: `₦${amount.toLocaleString()} deducted from your account by Admin. Reason: ${reason}`,
        type: 'alert',
        createdAt: serverTimestamp()
      });
      
      alert("Funds deducted successfully!");
    } catch (err: any) {
      handleFirestoreError(err, 'update', `users/${uid}`);
    }
  };

  const handleApproveWithdrawal = async (requestId: string, uid: string, amount: number) => {
     try {
       await updateDoc(doc(db, 'withdrawals', requestId), { status: 'approved' });
       
       // Update cumulative stats
       await updateDoc(doc(db, 'users', uid), {
         totalWithdrawnNGN: increment(amount)
       });

       await setDoc(doc(collection(db, 'notifications')), {
         userId: uid,
         title: 'Withdrawal Approved! ✅',
         message: `Your withdrawal of ${formatCurrency(amount)} has been successfully processed.`,
         type: 'payout',
         createdAt: serverTimestamp()
       });

       // Trigger Push
       await triggerPush(uid, 'Withdrawal Approved! ✅', `₦${amount.toLocaleString()} has been dispatched to your bank account.`, '/wallet');

       alert("Withdrawal Approved!");
       
       setTimeout(async () => {
          await updateDoc(doc(db, 'withdrawals', requestId), { status: 'approved_done' });
       }, 3000);
     } catch (err: any) {
       handleFirestoreError(err, 'update', 'withdrawals');
     }
  };

  const handleRejectWithdrawal = async (requestId: string, uid: string, amount: number) => {
     await updateDoc(doc(db, 'withdrawals', requestId), { status: 'rejected' });
     // Refund the amount
     await updateDoc(doc(db, 'users', uid), {
        balanceNGN: increment(amount)
     });

     await setDoc(doc(collection(db, 'notifications')), {
       userId: uid,
       title: 'Withdrawal Rejected ❌',
       message: `Your withdrawal of ${formatCurrency(amount)} was declined. Funds have been returned to your balance.`,
       type: 'alert',
       createdAt: serverTimestamp()
     });

     // Trigger Push
     await triggerPush(uid, 'Withdrawal Rejected ❌', `Your ₦${amount.toLocaleString()} withdrawal request was unsuccessful. Funds reverted.`, '/wallet');

     alert("Withdrawal Rejected! Amount refunded to user balance.");
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage) return;
    await setDoc(doc(db, 'broadcast', 'current'), {
      message: broadcastMessage,
      type: broadcastType,
      createdAt: serverTimestamp()
    });
    
    // Trigger Push Broadcast
    await broadcastPush('New Platform Update! 📢', broadcastMessage, '/dashboard');
    
    setBroadcastMessage('');
    alert("Broadcast Sent!");
  };

  const handleDeleteBroadcast = async () => {
    await deleteDoc(doc(db, 'broadcast', 'current'));
    alert("Broadcast Deleted Entirely!");
  };

  const handleApproveDeposit = async (req: any) => {
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', req.userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      if (!userData) {
        alert("User not found!");
        return;
      }

      const amount = Number(req.amount);
      let bonus = 0;
      
      // Determine if first deposit
      const isFirstDeposit = !userData.hasDepositedBefore;
      if (isFirstDeposit) {
        bonus = 3000;
      }

      // 1. Update Deposit Request
      batch.update(doc(db, 'depositRequests', req.id), { 
        status: 'approved', 
        approvedAt: serverTimestamp() 
      });

      // 2. Update User Balance
      batch.update(userRef, {
        balanceNGN: increment(amount + bonus),
        walletBalance: increment(amount + bonus),
        totalDepositedNGN: increment(amount),
        hasDepositedBefore: true,
        firstDepositBonusClaimed: isFirstDeposit || userData.firstDepositBonusClaimed || false,
        updatedAt: serverTimestamp()
      });

      // 3. Log Main Transaction
      const txRef = doc(collection(db, 'transactions'));
      batch.set(txRef, {
        userId: req.userId,
        type: 'deposit',
        amount: amount,
        status: 'completed',
        createdAt: serverTimestamp(),
        description: `Manual deposit approval via ${req.phone}`
      });

      // 4. Log Bonus Transaction if applicable
      if (bonus > 0) {
        const bonusTxRef = doc(collection(db, 'transactions'));
        batch.set(bonusTxRef, {
          userId: req.userId,
          type: 'bonus',
          amount: bonus,
          status: 'completed',
          createdAt: serverTimestamp(),
          description: 'First deposit welcome bonus 🎁'
        });
      }

      // 5. Notify User
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        userId: req.userId,
        title: 'Deposit Approved! 💰',
        message: `Your deposit of ₦${amount.toLocaleString()} has been approved.${bonus > 0 ? ' You also received a ₦3,000 first deposit bonus!' : ''}`,
        type: 'success',
        createdAt: serverTimestamp()
      });

      await batch.commit();
      
      // Trigger Push
      await triggerPush(req.userId, 'Deposit Approved! 💰', `Your account has been credited with ₦${(amount + bonus).toLocaleString()}.`, '/wallet');

      alert("Deposit approved and credited successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Approval failed: " + err.message);
    }
  };

  const handleRejectDeposit = async (reqId: string, userId: string) => {
    const reason = prompt("Enter rejection reason (optional):") || "Receipt verification failed";
    try {
      await updateDoc(doc(db, 'depositRequests', reqId), { 
        status: 'rejected', 
        rejectedAt: serverTimestamp(),
        rejectionReason: reason
      });

      await setDoc(doc(collection(db, 'notifications')), {
        userId: userId,
        title: 'Deposit Rejected 🛡️',
        message: `Your deposit request was rejected. Reason: ${reason}. Please contact support if this is an error.`,
        type: 'alert',
        createdAt: serverTimestamp()
      });

      alert("Deposit rejected.");
    } catch (err: any) {
      alert("Rejection failed: " + err.message);
    }
  };

  const handleApproveReferral = async (req: any) => {
    setLoading(true);
    try {
      const bonus = 1000;
      const redeemerBonus = 500;
      const batch = writeBatch(db);

      // 1. Update Request
      batch.update(doc(db, 'referralRequests', req.id), { status: 'approved', approvedAt: serverTimestamp() });

      // 2. Credit Referrer (+1,000)
      const referrerRef = doc(db, 'users', req.referrerUid);
      batch.update(referrerRef, {
        balanceNGN: increment(bonus),
        totalReferrals: increment(1),
        referralEarnings: increment(bonus),
        updatedAt: serverTimestamp()
      });

      // 3. Update Redeemer (Referred User) & Credit Bonus (+500)
      const redeemerRef = doc(db, 'users', req.referredUserId);
      batch.update(redeemerRef, {
        balanceNGN: increment(redeemerBonus),
        hasRedeemedCode: true,
        referredBy: req.referrerCode,
        referrerUid: req.referrerUid,
        updatedAt: serverTimestamp()
      });

      // 4. Log Referral Interaction (for "Recent Referrals" list)
      const referralId = `${req.referredUserId}_${req.referrerUid}`;
      batch.set(doc(db, 'referrals', referralId), {
        referrerUid: req.referrerUid,
        referrerEmail: 'Approved Request',
        redeemerUid: req.referredUserId,
        redeemerUsername: req.referredUsername,
        redeemerEmail: 'Approved Request',
        redeemerJoined: serverTimestamp(),
        code: req.referrerCode,
        timestamp: serverTimestamp()
      });

      // 5. Log Transaction for Referrer
      const txRef = doc(collection(db, 'transactions'));
      batch.set(txRef, {
        userId: req.referrerUid,
        type: 'bonus',
        amount: bonus,
        status: 'completed',
        createdAt: serverTimestamp(),
        description: `Referral bonus from approval of @${req.referredUsername}`
      });

      // 5b. Log Transaction for Redeemer
      const redeemerTxRef = doc(collection(db, 'transactions'));
      batch.set(redeemerTxRef, {
        userId: req.referredUserId,
        type: 'bonus',
        amount: redeemerBonus,
        status: 'completed',
        createdAt: serverTimestamp(),
        description: `Welcome bonus for redeeming referral code from @${req.referrerCode}`
      });

      // 6. Create Notification for Referrer
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        userId: req.referrerUid,
        title: 'Referral Bonus Approved! 🎁',
        message: `Admin approved your referral for @${req.referredUsername}. ₦${bonus.toLocaleString()} credited.`,
        type: 'win',
        createdAt: serverTimestamp()
      });

      // 6b. Create Notification for Redeemer
      const redeemerNotifRef = doc(collection(db, 'notifications'));
      batch.set(redeemerNotifRef, {
        userId: req.referredUserId,
        title: 'Welcome Bonus Credited! 🎁',
        message: `Your referral redemption for code ${req.referrerCode} was approved. ₦${redeemerBonus.toLocaleString()} credited to your balance.`,
        type: 'success',
        createdAt: serverTimestamp()
      });

      await batch.commit();
      alert("Referral Approved & Bonus Credited!");
    } catch (err: any) {
      console.error(err);
      alert("Approval failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectReferral = async (reqId: string) => {
    try {
      await updateDoc(doc(db, 'referralRequests', reqId), { status: 'rejected', rejectedAt: serverTimestamp() });
      alert("Referral Rejected");
    } catch (err: any) {
      alert("Rejection failed: " + err.message);
    }
  };

  const handleCancelDeposit = async (requestId: string) => {
    try {
      const res = await fetch('/api/admin/deposits/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, adminSecret: 'infodailyyield_admin_2024' })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Deposit Cancelled.");
      } else {
        alert("Cancellation failed: " + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert("Error cancelling deposit: " + err.message);
    }
  };

  const handleSendAlert = async () => {
    if (!alertForm.userId || !alertForm.message) return;
    await setDoc(doc(collection(db, 'notifications')), {
      userId: alertForm.userId,
      title: 'Admin Message 🛡️',
      message: alertForm.message,
      type: 'alert',
      createdAt: serverTimestamp()
    });

    // Trigger Push
    await triggerPush(alertForm.userId, 'Admin Message 🛡️', alertForm.message, '/notifications');

    setAlertForm({ userId: '', message: '' });
    alert("Alert Sent!");
  };

  const handleSendPersonalizedAlert = async (uid: string) => {
    if (!userAlertMessage) return;
    await setDoc(doc(collection(db, 'notifications')), {
      userId: uid,
      title: 'Personalized Admin Alert 🛡️',
      message: userAlertMessage,
      type: 'alert',
      createdAt: serverTimestamp()
    });

    // Trigger Push
    await triggerPush(uid, 'Personalized Admin Alert 🛡️', userAlertMessage, '/notifications');

    setUserAlertMessage('');
    alert("Personalized Alert Sent!");
  };

  const handleUpdateBalance = async (uid: string) => {
    if (!selectedUser) return;
    const amount = parseFloat(newBalance);
    if (isNaN(amount)) return;
    
    const delta = amount - (selectedUser.balanceNGN || 0);

    try {
      await updateDoc(doc(db, 'users', uid), { 
        balanceNGN: amount 
      });
      
      await setDoc(doc(collection(db, 'transactions')), {
        userId: uid,
        type: delta >= 0 ? 'payout' : 'game_fee', 
        amount: Math.abs(delta),
        status: 'completed',
        createdAt: serverTimestamp(),
        description: 'Admin balance adjustment'
      });
      
      setNewBalance('');
      alert("Balance updated successfully!");
    } catch (err: any) {
      handleFirestoreError(err, 'update', `users/${uid}`);
    }
  };

  const handleSaveFAQ = async () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) return;
    
    const faqData = {
      question: faqForm.question,
      answer: faqForm.answer,
      order: Number(faqForm.order) || 0,
      updatedAt: serverTimestamp()
    };

    try {
      if (isEditingFAQ && faqForm.id) {
        await updateDoc(doc(db, 'faqs', faqForm.id), faqData);
        alert("FAQ updated successfully!");
      } else {
        await setDoc(doc(collection(db, 'faqs')), {
          ...faqData,
          createdAt: serverTimestamp()
        });
        alert("FAQ added successfully!");
      }
      setFaqForm({ id: '', question: '', answer: '', order: 0 });
      setIsEditingFAQ(false);
    } catch (err: any) {
      handleFirestoreError(err, isEditingFAQ ? 'update' : 'create', `faqs/${faqForm.id || 'new'}`);
    }
  };

  const handleDeleteFAQ = async (id: string) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;
    try {
      await deleteDoc(doc(db, 'faqs', id));
      alert("FAQ deleted successfully!");
    } catch (err: any) {
      handleFirestoreError(err, 'delete', `faqs/${id}`);
    }
  };

  useEffect(() => {
    return onSnapshot(collection(db, 'airdrops'), (snap) => {
      setAirdrops(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, 'list', 'airdrops'));
  }, []);

  const handleSaveAirdrop = async () => {
    if (!airdropForm.name || !airdropForm.description || !airdropForm.amount) return alert("Fill all fields");
    try {
      // 1. Create the Airdrop
      await setDoc(doc(collection(db, 'airdrops')), {
        ...airdropForm,
        amount: Number(airdropForm.amount),
        status: 'active',
        totalClaims: 0,
        createdAt: serverTimestamp()
      });

      // 2. Synchronize all users with any missing fields/features
      // The user requested to "add all new fields and feature to firebase(all users doc)"
      const usersSnap = await getDocs(collection(db, 'users'));
      const updatePromises = usersSnap.docs.map(async (userDoc) => {
        const data = userDoc.data();
        const updates: any = {};

        // Ensure key fields exist for all users
        if (data.balanceNGN === undefined) updates.balanceNGN = 0;
        if (data.totalProfitNGN === undefined) updates.totalProfitNGN = 0;
        if (data.kycStatus === undefined) updates.kycStatus = 'unverified';
        if (data.tier === undefined) updates.tier = 'tier1';
        if (data.totalReferrals === undefined) updates.totalReferrals = 0;
        if (data.referralEarnings === undefined) updates.referralEarnings = 0;
        
        // Referral system sync
        if (!data.referralCode) {
          updates.referralCode = generateReferralCode();
        }
        if (data.hasRedeemedCode === undefined) updates.hasRedeemedCode = data.hasRedeemed !== undefined ? data.hasRedeemed : false;
        if (data.referrerUid === undefined) updates.referrerUid = '';
        if (data.referredBy === undefined) updates.referredBy = '';

        if (Object.keys(updates).length > 0) {
          return updateDoc(userDoc.ref, updates);
        }
      });

      await Promise.all(updatePromises);

      setAirdropForm({ name: '', description: '', amount: '' });
      setIsCreatingAirdrop(false);
      alert("Airdrop Deployed & System Synchronized for all users! 🚀");
    } catch (err: any) {
      handleFirestoreError(err, 'create', 'airdrops');
    }
  };

  const handleDeleteAirdrop = async (id: string) => {
    if (!confirm("Remove this Airdrop? Users will no longer see it.")) return;
    try {
      await deleteDoc(doc(db, 'airdrops', id));
      alert("Airdrop Terminated.");
    } catch (err: any) {
      handleFirestoreError(err, 'delete', `airdrops/${id}`);
    }
  };

  const toggleAirdropStatus = async (id: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, 'airdrops', id), {
        status: currentStatus === 'active' ? 'hidden' : 'active'
      });
    } catch (err: any) {
      handleFirestoreError(err, 'update', `airdrops/${id}`);
    }
  };

  const [globalFeeAmount, setGlobalFeeAmount] = useState<number>(0);
  const [globalFeeDescription, setGlobalFeeDescription] = useState<string>('');

  const handleChargeGlobalFee = async () => {
    if (globalFeeAmount <= 0 || !globalFeeDescription.trim()) {
      alert("Please provide a valid amount and description.");
      return;
    }

    if (!confirm(`Are you sure you want to deduct ₦${globalFeeAmount.toLocaleString()} from all eligible users? (Balance must be ≥ ₦${globalFeeAmount.toLocaleString()})`)) {
      return;
    }

    setLoading(true);
    try {
      // 1. Get all users with balance >= globalFeeAmount
      const usersSnap = await getDocs(query(collection(db, 'users'), where('balanceNGN', '>=', globalFeeAmount)));
      const victims = usersSnap.docs;

      if (victims.length === 0) {
        alert(`No users found with a balance of at least ₦${globalFeeAmount.toLocaleString()}.`);
        setLoading(false);
        return;
      }

      // 2. Process in batches
      const BATCH_SIZE = 150;
      let processed = 0;

      for (let i = 0; i < victims.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = victims.slice(i, i + BATCH_SIZE);

        for (const userDoc of chunk) {
          const userId = userDoc.id;
          
          const deduction = globalFeeAmount;
          
          batch.update(userDoc.ref, {
            balanceNGN: increment(-deduction),
            updatedAt: serverTimestamp()
          });

          const txRef = doc(collection(db, 'transactions'));
          batch.set(txRef, {
            userId,
            type: 'fee',
            amount: deduction,
            status: 'completed',
            createdAt: serverTimestamp(),
            description: globalFeeDescription
          });

          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            userId,
            title: 'Maintenance Fee Deducted 💸',
            message: `${globalFeeDescription} (₦${deduction.toLocaleString()})`,
            type: 'alert',
            createdAt: serverTimestamp()
          });
        }

        await batch.commit();
        processed += chunk.length;
      }

      victims.forEach(u => {
        triggerPush(u.id, "Account Update", globalFeeDescription, "/dashboard");
      });

      alert(`Success! Fee charged to ${processed} users.`);
      setGlobalFeeAmount(0);
      setGlobalFeeDescription('');
    } catch (err) {
      console.error(err);
      alert("Error charging global fee.");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(search.toLowerCase()) || 
    (u.uid || u.id)?.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-40 max-w-7xl mx-auto px-4">
      <div className="flex flex-col gap-4 mb-8">
        <h2 className="text-4xl font-black text-emerald-400">Admin Command Center</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'users', label: 'Users', icon: UserCircle },
            { id: 'broadcast', label: 'Global Broadcast', icon: Bell },
            { id: 'alerts', label: 'Target User Alert', icon: MessageCircle },
            { id: 'withdrawals', label: 'Withdrawal Requests', icon: ArrowDownCircle },
            { id: 'deposits', label: 'Deposit Requests', icon: PlusCircle },
            { id: 'kyc', label: 'Identity Verification', icon: Shield },
            { id: 'tiers', label: 'Membership Upgrade', icon: Trophy },
            { id: 'registry', label: 'Global Clients Registry', icon: Files },
            { id: 'referrals', label: 'Referrals Leaderboard', icon: Trophy },
            { id: 'referral_requests', label: 'Referral Requests', icon: Sparkles },
            { id: 'page_management', label: 'Page Management', icon: ShieldAlert },
            { id: 'wallet_security', label: 'Wallet Security', icon: Lock },
            { id: 'market_duel', label: 'Market Duel Control', icon: Zap },
            { id: 'investments', label: 'Global Investments', icon: BarChart3 },
            { id: 'faq', label: 'FAQ & Support', icon: HelpCircle },
            { id: 'airdrop', label: 'Airdrop Command', icon: Zap },
            { id: 'system', label: 'System Sync', icon: Database },
            { id: 'fees', label: 'Charge Fees', icon: CreditCard },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => { setActiveTab(btn.id as AdminTab); setSelectedUser(null); }}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all",
                activeTab === btn.id 
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" 
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              )}
            >
              <btn.icon size={16} />
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center opacity-20 animate-pulse">
           <RefreshCw size={48} className="mx-auto mb-4 animate-spin" />
           <p className="font-black uppercase tracking-widest text-sm">Synchronizing Admin Data...</p>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'fees' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
               <div className="glass p-12 rounded-[3.5rem] border border-white/5">
                  <div className="flex items-center gap-6 mb-12">
                     <div className="w-16 h-16 rounded-[1.5rem] bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <CreditCard size={36} />
                     </div>
                     <div>
                        <h3 className="text-3xl font-black text-white px-2">Global Fee Protocol</h3>
                        <p className="text-amber-500 font-bold px-2">Deduct maintenance or service fees from all active wallets</p>
                     </div>
                  </div>

                  <div className="space-y-8">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-white/30 tracking-widest pl-2">Fee Amount (₦)</label>
                        <input 
                          type="number"
                          value={globalFeeAmount || ''}
                          onChange={(e) => setGlobalFeeAmount(Number(e.target.value))}
                          placeholder="Enter amount to deduct..."
                          className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white text-xl font-bold outline-none focus:border-amber-500/50 transition-all"
                        />
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-white/30 tracking-widest pl-2">Fee Description & Reason</label>
                        <textarea 
                          value={globalFeeDescription}
                          onChange={(e) => setGlobalFeeDescription(e.target.value)}
                          placeholder="Explain what this fee is for (e.g., Monthly Security Maintenance)..."
                          className="w-full h-32 bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none focus:border-amber-500/50 transition-all resize-none"
                        />
                     </div>

                     <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-3xl">
                        <div className="flex gap-4">
                           <AlertCircle className="text-amber-500 shrink-0" size={24} />
                           <div>
                              <p className="text-xs font-black text-amber-500 uppercase tracking-widest mb-1">Critical Action</p>
                              <p className="text-[11px] text-white/60 leading-relaxed font-medium">This action will deduct the specified amount from <b>EVERY</b> user with a balance greater than zero. Users with frozen wallets will also be charged. All affected users will receive a push notification and an in-app alert.</p>
                           </div>
                        </div>
                     </div>

                     <button 
                       onClick={handleChargeGlobalFee}
                       disabled={loading || !globalFeeAmount || !globalFeeDescription}
                       className="w-full py-6 bg-amber-500 text-black text-[12px] font-black uppercase tracking-[0.2em] rounded-[2rem] shadow-2xl shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-20 disabled:grayscale disabled:scale-100 flex items-center justify-center gap-3"
                     >
                       <Zap size={18} /> Charge Global Fee
                     </button>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-8 max-w-2xl mx-auto">
               <div className="glass p-12 rounded-[3.5rem] border border-white/5 text-center">
                  <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-10 text-emerald-400">
                    <Database size={48} />
                  </div>
                  <h3 className="text-3xl font-black mb-4">Core System Migration</h3>
                  <p className="text-white/40 text-sm mb-12 leading-relaxed px-10">
                    Execute a deep synchronization across all registered user profiles. This will ensure every account document contains the latest security fields, referral parameters, and yield-tracking metrics.
                  </p>
                  
                  <button
                    onClick={handleSystemMigration}
                    disabled={isMigrating}
                    className={cn(
                      "w-full py-6 rounded-[2rem] font-black uppercase text-[12px] tracking-[0.3em] transition-all flex items-center justify-center gap-4",
                      isMigrating 
                        ? "bg-white/10 text-white/20 cursor-not-allowed" 
                        : "bg-emerald-500 text-black shadow-2xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95"
                    )}
                  >
                    {isMigrating ? (
                      <>
                        <RefreshCw size={20} className="animate-spin" />
                        Synchronizing Database...
                      </>
                    ) : (
                      <>
                        <Shield size={20} /> Deploy Global Update
                      </>
                    )}
                  </button>

                  <div className="mt-12 p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 text-left">
                    <div className="flex gap-4 items-start">
                      <AlertTriangle className="text-amber-500 shrink-0" size={24} />
                      <div>
                        <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest mb-1">Administrative Note</p>
                        <p className="text-white/40 text-[10px] leading-relaxed">
                          This operation will initialize fields like `firstDepositBonusClaimed`, `totalProfitNGN`, and generate missing referral codes. This is an irreversible structural update.
                        </p>
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'users' && !selectedUser && (
            <div className="space-y-8">
               <div className="glass p-10 rounded-[3rem] border border-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl font-black text-white px-2">Active Users</h3>
                    <p className="text-emerald-400 font-bold px-2">{users.length} Registered Accounts</p>
                  </div>
                  <div className="relative w-72 flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                      <input 
                        type="text" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search users..."
                        className="w-full bg-white/5 border border-white/10 pl-10 pr-4 py-3 rounded-xl outline-none focus:border-emerald-500/50 text-white text-sm"
                      />
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 {filteredUsers.map(u => (
                   <div key={u.id} className="glass p-8 rounded-[2.5rem] border border-white/5 group hover:border-emerald-500/20 transition-all">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                          <UserCircle size={32} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-lg text-white truncate">{u.displayName || 'Unnamed'}</p>
                          <p className="text-[10px] font-mono text-white/40 truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="p-4 bg-white/5 rounded-2xl">
                          <p className="text-[8px] uppercase font-black text-white/30 mb-1">Balance</p>
                          <p className="text-sm font-black text-emerald-400">{formatCurrency(u.balanceNGN)}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl">
                          <p className="text-[8px] uppercase font-black text-white/30 mb-1">Tier</p>
                          <p className="text-sm font-black uppercase">{u.tier}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-6">
                         <div className="flex items-center gap-2">
                           <div className={cn("w-2 h-2 rounded-full", u.kycStatus === 'verified' ? 'bg-emerald-500' : 'bg-amber-500')} />
                           <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">{u.kycStatus}</span>
                         </div>
                         {u.banned && <span className="text-[8px] font-black text-red-500 uppercase px-2 py-1 bg-red-500/10 rounded border border-red-500/20">Banned</span>}
                      </div>
                      <button 
                        onClick={() => setSelectedUser(u)}
                        className="w-full py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                      >
                         View Profile <ChevronRight size={14} />
                      </button>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'tiers' && (
            <div className="space-y-8">
              <div className="glass p-10 rounded-[3rem] border border-white/5">
                <h3 className="text-3xl font-black mb-8">Tier Upgrade Requests</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] font-black uppercase text-white/30 tracking-widest">
                        <th className="pb-4 px-4 text-center">Username</th>
                        <th className="pb-4 px-4 text-center">Current Tier</th>
                        <th className="pb-4 px-4 text-center">Requested Tier</th>
                        <th className="pb-4 px-4 text-center">Message</th>
                        <th className="pb-4 px-4 text-center">Date</th>
                        <th className="pb-4 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {tierRequests.map(req => (
                        <tr key={req.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-6 px-4 text-center font-bold text-white">@{req.username}</td>
                          <td className="py-6 px-4 text-center text-xs font-black uppercase text-white/40">{req.currentTier}</td>
                          <td className="py-6 px-4 text-center font-black text-emerald-400 uppercase">{req.requestedTier}</td>
                          <td className="py-6 px-4 text-center text-xs text-white/50 max-w-xs">{req.message}</td>
                          <td className="py-6 px-4 text-center text-[10px] text-white/20">
                            {req.createdAt?.toDate().toLocaleDateString()}
                          </td>
                          <td className="py-6 px-4">
                            <div className="flex justify-center gap-2">
                              <button 
                                onClick={() => handleApproveTier(req.id, req.userId || req.uid, req.requestedTier)}
                                className="px-4 py-2 bg-emerald-500 text-black text-[10px] font-black uppercase rounded-lg shadow-lg shadow-emerald-500/20"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => {
                                  const note = prompt("Enter rejection reason:");
                                  if (note !== null) handleRejectTier(req.id, req.userId, note);
                                }}
                                className="px-4 py-2 bg-red-500/20 text-red-400 text-[10px] font-black uppercase rounded-lg border border-red-500/20"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tierRequests.length === 0 && (
                     <div className="py-20 text-center text-white/20 font-black uppercase tracking-widest text-[10px]">
                        No pending tier requests
                     </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && selectedUser && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300 px-1">
               <button 
                 onClick={() => setSelectedUser(null)}
                 className="flex items-center gap-2 text-white/40 hover:text-white transition-colors font-black text-[10px] uppercase tracking-widest"
               >
                 <ArrowDownLeft size={16} className="rotate-45" /> Back to Users List
               </button>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                     <div className="glass p-10 rounded-[3.5rem] border border-white/5 space-y-8">
                        <div className="flex items-center justify-between">
                           <h3 className="text-2xl font-black">Financial Matrix</h3>
                           <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  const amt = prompt("Amount to ADD (₦):");
                                  const reason = prompt("Reason for allocation:");
                                  if (amt && reason) handleAddFunds(selectedUser.uid, parseFloat(amt), reason);
                                }}
                                className="px-5 py-2.5 bg-emerald-500 text-black text-[10px] font-black uppercase rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                              >
                                <Plus size={16} /> Add Funds
                              </button>
                              <button 
                                onClick={() => {
                                  const amt = prompt("Amount to DEDUCT (₦):");
                                  const reason = prompt("Reason for deduction:");
                                  if (amt && reason) handleDeductFunds(selectedUser.uid, parseFloat(amt), reason);
                                }}
                                className="px-5 py-2.5 bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-black uppercase rounded-xl flex items-center gap-2"
                              >
                                <Trash2 size={16} /> Deduct Funds
                              </button>
                           </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                           <div className="p-6 bg-white/5 rounded-3xl">
                              <p className="text-[8px] font-black uppercase text-white/30 mb-2">Wallet</p>
                              <p className="text-xl font-black text-emerald-400">{formatCurrency(selectedUser.balanceNGN)}</p>
                           </div>
                           <div className="p-6 bg-white/5 rounded-3xl">
                              <p className="text-[8px] font-black uppercase text-white/30 mb-2">Yield Profit</p>
                              <p className="text-xl font-black text-white">{formatCurrency(selectedUser.totalProfitNGN)}</p>
                           </div>
                           <div className="p-6 bg-white/5 rounded-3xl">
                              <p className="text-[8px] font-black uppercase text-white/30 mb-2">Deposits</p>
                              <p className="text-xl font-black text-white">{formatCurrency(selectedUser.totalDepositedNGN || 0)}</p>
                           </div>
                           <div className="p-6 bg-white/5 rounded-3xl">
                              <p className="text-[8px] font-black uppercase text-white/30 mb-2">Withdrawals</p>
                              <p className="text-xl font-black text-white">{formatCurrency(selectedUser.totalWithdrawnNGN || 0)}</p>
                           </div>
                        </div>
                     </div>
                     <div className="glass p-10 rounded-[3.5rem] border border-white/5">
                        <div className="flex items-center gap-6 mb-10">
                           <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                              <UserCircle size={48} />
                           </div>
                           <div>
                              <h3 className="text-3xl font-black text-white mb-1">{selectedUser.displayName || 'Unnamed User'}</h3>
                              <p className="text-emerald-400 font-mono text-sm">{selectedUser.uid}</p>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           <div className="p-5 bg-white/5 rounded-3xl">
                              <p className="text-[8px] uppercase font-black text-white/30 mb-2">Email Address</p>
                              <p className="text-xs font-bold truncate">{selectedUser.email}</p>
                           </div>
                           <div className="p-5 bg-white/5 rounded-3xl">
                              <p className="text-[8px] uppercase font-black text-white/30 mb-2">Phone Number</p>
                              <p className="text-xs font-bold truncate">{selectedUser.phone || 'N/A'}</p>
                           </div>
                           <div className="p-5 bg-white/5 rounded-3xl">
                              <p className="text-[8px] uppercase font-black text-white/30 mb-2">Wallet Balance</p>
                              <p className="text-xs font-black text-emerald-400">{formatCurrency(selectedUser.balanceNGN)}</p>
                           </div>
                           <div className="p-5 bg-white/5 rounded-3xl">
                              <p className="text-[8px] uppercase font-black text-white/30 mb-2">Membership Tier</p>
                              <p className="text-xs font-black uppercase">{selectedUser.tier}</p>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                           <div className="p-5 bg-white/5 rounded-3xl">
                              <p className="text-[8px] uppercase font-black text-white/30 mb-2">Deposited Before</p>
                              <p className="text-xs font-black uppercase text-emerald-400">{selectedUser.hasDepositedBefore ? 'Yes' : 'No'}</p>
                           </div>
                           <div className="p-5 bg-white/5 rounded-3xl">
                              <p className="text-[8px] uppercase font-black text-white/30 mb-2">Referral Active</p>
                              <p className="text-xs font-black uppercase text-emerald-400">{selectedUser.referralActive ? 'Active' : 'Locked'}</p>
                           </div>
                        </div>
                     </div>

                     <div className="glass p-10 rounded-[3.5rem] border border-white/5">
                        <h4 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                           <Shield className="text-amber-400" /> Identity Verification Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 text-xl px-2">
                           <div>
                              <p className="text-[10px] uppercase font-black text-white/30 mb-2">Submitted Username</p>
                              <p className="font-bold">{selectedUser.kycDocs?.username || 'N/A'}</p>
                           </div>
                           <div>
                              <p className="text-[10px] uppercase font-black text-white/30 mb-2">Residential Address</p>
                              <p className="font-bold">{selectedUser.kycDocs?.address || 'N/A'}</p>
                           </div>
                           <div>
                              <p className="text-[10px] uppercase font-black text-white/30 mb-2">Registration Email</p>
                              <p className="font-bold">{selectedUser.kycDocs?.email || selectedUser.email}</p>
                           </div>
                           <div>
                              <p className="text-[10px] uppercase font-black text-white/30 mb-2">Contact Phone</p>
                              <p className="font-bold">{selectedUser.kycDocs?.phoneNumber || selectedUser.phone || 'N/A'}</p>
                           </div>
                        </div>
                        <div className="flex gap-4">
                           <button 
                             onClick={() => handleApproveKYC(selectedUser.uid)} 
                             className="flex-1 py-4 bg-emerald-500 text-black font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                           >
                              Verify KYC Approval
                           </button>
                           <button 
                             onClick={() => handleRejectKYC(selectedUser.uid)} 
                             className="flex-1 py-4 bg-red-500/10 text-red-500 border border-red-500/20 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                           >
                              Reject KYC Submission
                           </button>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-8">
                     <div className="glass p-10 rounded-[3.5rem] border border-red-500/10">
                        <h4 className="text-xl font-black text-white mb-6">Ban Controls</h4>
                        {selectedUser.banned ? (
                           <button 
                             onClick={() => handleUnbanUser(selectedUser.uid)}
                             className="w-full py-5 bg-emerald-500 text-black font-black rounded-2xl text-[10px] uppercase tracking-widest"
                           >
                             Lift Account Suspension
                           </button>
                        ) : (
                           <button 
                             onClick={() => handleBanUser(selectedUser.uid)}
                             className="w-full py-5 bg-red-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest"
                           >
                             Enforce Ban Policy
                           </button>
                        )}
                     </div>

                     <div className="glass p-10 rounded-[3.5rem] border border-blue-500/10">
                        <h4 className="text-xl font-black text-white mb-6">Send Targeted Message</h4>
                        <textarea 
                           className="w-full h-32 bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-blue-500/50 text-white text-sm mb-4 resize-none"
                           placeholder="Type a message to show only in this user's notification center..."
                           value={userAlertMessage}
                           onChange={(e) => setUserAlertMessage(e.target.value)}
                        />
                        <button 
                          onClick={() => handleSendPersonalizedAlert(selectedUser.uid)}
                          className="w-full py-5 bg-blue-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20"
                        >
                           Dispatch Notification
                        </button>
                     </div>

                     <div className="glass p-10 rounded-[3.5rem] border border-blue-500/10">
                        <h4 className="text-xl font-black text-white mb-6">Referral Performance</h4>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                           <div className="p-4 bg-white/5 rounded-2xl">
                              <p className="text-[8px] uppercase font-black text-white/30 mb-1">Affiliate Code</p>
                              <p className="text-sm font-black text-blue-400 tracking-widest">{selectedUser.referralCode}</p>
                           </div>
                           <div className="p-4 bg-white/5 rounded-2xl">
                              <p className="text-[8px] uppercase font-black text-white/30 mb-1">Total Earned</p>
                              <p className="text-sm font-black text-emerald-400">{formatCurrency(selectedUser.referralEarnings || 0)}</p>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Referred Proxies ({selectedUser.totalReferrals || 0})</p>
                           <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                              {referredUsers.length > 0 ? referredUsers.map((ref, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                                   <span className="text-[10px] font-bold text-white/60 truncate max-w-[150px]">{ref.redeemerEmail}</span>
                                   <span className="text-[8px] font-black text-white/20 uppercase">{ref.timestamp?.toDate().toLocaleDateString()}</span>
                                </div>
                              )) : (
                                <p className="text-[10px] text-white/20 italic">No direct referrals detected.</p>
                              )}
                           </div>
                        </div>
                      </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'referral_requests' && (
            <div className="space-y-8">
               <div className="glass p-10 rounded-[3rem] border border-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl font-black text-white px-2">Referral Requests</h3>
                    <p className="text-emerald-400 font-bold px-2">{referralRequests.length} Pending Actions</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-4">
                  {referralRequests.length === 0 ? (
                    <div className="text-center py-20 opacity-30">
                       <Sparkles size={48} className="mx-auto mb-4" />
                       <p className="font-bold uppercase tracking-widest text-sm">No pending referral requests</p>
                    </div>
                  ) : (
                    referralRequests.map(req => (
                      <div key={req.id} className="glass p-8 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                           <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                             <UserPlus size={32} />
                           </div>
                           <div>
                              <p className="font-black text-xl text-white">@{req.referredUsername}</p>
                              <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">
                                Referred By: <span className="text-emerald-400">{req.referrerCode}</span>
                              </p>
                              <p className="text-[10px] text-white/20 font-medium">
                                 {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleString() : 'Just now'}
                              </p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <button 
                             onClick={() => handleApproveReferral(req)}
                             className="px-8 py-4 bg-emerald-500 text-black font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95"
                           >
                             Accept Request
                           </button>
                           <button 
                             onClick={() => handleRejectReferral(req.id)}
                             className="px-8 py-4 bg-white/5 text-white/50 hover:text-white border border-white/10 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all"
                           >
                             Reject
                           </button>
                        </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
          )}

          {activeTab === 'wallet_security' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="glass p-10 rounded-[3rem] border border-white/5">
                  <h3 className="text-3xl font-black text-white px-2">Wallet Security Hub</h3>
                  <p className="text-red-400 font-bold px-2">Manage user wallet restrictions and freezing protocols</p>
               </div>

               <div className="space-y-4">
                  {filteredUsers.map(u => (
                    <div key={u.uid || u.id} className="glass p-8 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-white/10 transition-all">
                       <div className="flex items-center gap-6">
                          <div className={cn(
                            "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500",
                            u.isWalletFrozen ? "bg-red-500 text-black shadow-2xl shadow-red-500/20" : "bg-white/5 text-white/40"
                          )}>
                             <Lock size={28} className={cn(u.isWalletFrozen ? "animate-pulse" : "")} />
                          </div>
                          <div>
                             <div className="flex items-center gap-3 mb-1">
                                <p className="text-xl font-black text-white leading-none">@{u.displayName || 'Anonymous'}</p>
                                {u.isWalletFrozen && (
                                  <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[8px] font-black uppercase tracking-widest rounded-full border border-red-500/20">FROZEN</span>
                                )}
                             </div>
                             <p className="text-[10px] font-black uppercase text-white/20 tracking-tighter">{u.email}</p>
                          </div>
                       </div>

                       <div className="flex items-center gap-4">
                          <div className="text-right mr-4">
                             <p className="text-[8px] font-black uppercase text-white/20 tracking-widest mb-1">Current Balance</p>
                             <p className="text-lg font-black text-emerald-400">{formatCurrency(u.balanceNGN || 0)}</p>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                const targetId = u.uid || u.id;
                                await updateDoc(doc(db, 'users', targetId), {
                                  isWalletFrozen: !u.isWalletFrozen // STATUS UPDATED
                                });
                                                                 // Send notifications
                                 const title = !u.isWalletFrozen ? "Wallet Restricted! 🔒" : "Wallet Restored! 🔓";
                                 const message = !u.isWalletFrozen 
                                   ? "Your wallet has been placed on an administrative hold. Please contact institutional support for clarification."
                                   : "Your wallet restriction has been lifted. You can now perform capital operations.";
                                 
                                 await addDoc(collection(db, 'notifications'), {
                                   userId: targetId,
                                   title,
                                   message,
                                   type: !u.isWalletFrozen ? 'alert' : 'success',
                                   createdAt: serverTimestamp()
                                 });

                                 await triggerPush(targetId, title, message, '/dashboard');

                                 alert(`Wallet ${!u.isWalletFrozen ? 'Frozen' : 'Unfrozen'} for @${u.displayName}`);
                              } catch (err) {
                                console.error(err);
                                alert("Failed to update wallet status.");
                              }
                            }}
                            className={cn(
                              "px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95",
                              u.isWalletFrozen 
                                ? "bg-white/5 text-white/40 hover:bg-emerald-500 hover:text-black border border-white/5" 
                                : "bg-red-500 text-black shadow-xl shadow-red-500/20"
                            )}
                          >
                             {u.isWalletFrozen ? 'Emergency Unfreeze' : 'Freeze Wallet'}
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'market_duel' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="glass p-10 rounded-[3rem] border border-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl font-black text-white px-2">Market Duel Control</h3>
                    <p className="text-emerald-400 font-bold px-2">Manage outcomes and monitor active bids</p>
                  </div>
                  <div className="bg-emerald-500/10 px-6 py-4 rounded-2xl border border-emerald-500/20 text-center">
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Current Round ID</p>
                    <p className="text-xl font-black text-white">#{Math.floor(Date.now() / (5 * 60 * 60 * 1000))}</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="glass p-10 rounded-[3rem] border border-white/5">
                    <div className="flex items-center gap-4 mb-8">
                       <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                          <Settings size={24} />
                       </div>
                       <div>
                          <h4 className="text-xl font-black text-white/80">Min/Max Game Rewards</h4>
                          <p className="text-[10px] font-black uppercase text-white/20 tracking-widest">Global Game Hub constraints</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div>
                          <label className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3 block px-2">Min Reward (NGN)</label>
                          <input 
                            type="number" 
                            defaultValue={pageStatus.game_hub_min_reward || 100}
                            onBlur={async (e) => {
                              const val = Number(e.target.value);
                              try {
                                await setDoc(doc(db, 'system', 'page_status'), { game_hub_min_reward: val }, { merge: true });
                              } catch (err) { console.error(err); }
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-black focus:border-amber-500/50 transition-all outline-none"
                          />
                       </div>
                       <div>
                          <label className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3 block px-2">Max Reward (NGN)</label>
                          <input 
                            type="number" 
                            defaultValue={pageStatus.game_hub_max_reward || 1000}
                            onBlur={async (e) => {
                              const val = Number(e.target.value);
                              try {
                                await setDoc(doc(db, 'system', 'page_status'), { game_hub_max_reward: val }, { merge: true });
                              } catch (err) { console.error(err); }
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-black focus:border-amber-500/50 transition-all outline-none"
                          />
                       </div>
                    </div>
                  </div>

                  <div className="glass p-10 rounded-[3rem] border border-white/5">
                    <div className="flex flex-col justify-between h-full">
                      <div>
                        <h4 className="text-xl font-black text-white/80">Global Payout Multiplier</h4>
                        <p className="text-[10px] font-black uppercase text-white/20 tracking-widest mt-1">Sets the return rate for winning bids</p>
                      </div>
                      <div className="mt-8 grid grid-cols-5 gap-2">
                        {[1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0].map((m) => (
                          <button
                            key={m}
                            onClick={async () => {
                              try {
                                await setDoc(doc(db, 'system', 'page_status'), {
                                  market_duel_multiplier: m
                                }, { merge: true });
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className={cn(
                              "py-3 rounded-xl font-black text-xs transition-all border",
                              (pageStatus.market_duel_multiplier || 1.2) === m 
                                ? "bg-emerald-500 text-black border-emerald-500" 
                                : "bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:text-white"
                            )}
                          >
                            {m}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
               </div>

               <div className="glass p-12 rounded-[3.5rem] border border-white/5">
                  <div className="flex items-center gap-6 mb-12">
                     <div className="w-16 h-16 rounded-[1.5rem] bg-red-500/10 flex items-center justify-center text-red-500">
                        <Lock size={36} />
                     </div>
                     <div>
                        <h3 className="text-3xl font-black text-white px-2">Game Hub Access Matrix</h3>
                        <p className="text-red-400 font-bold px-2">Lock or unlock specific gaming modules</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {[
                        { id: 'dice', label: 'Daily Dice' },
                        { id: 'spin', label: 'Lucky Spin' },
                        { id: 'cards', label: 'High Yield Cards' },
                        { id: 'flip', label: 'Naira Flip' },
                        { id: 'rush', label: 'Number Rush' },
                        { id: 'box', label: 'Lucky Box' },
                        { id: 'tap', label: 'Quick Tap' },
                        { id: 'color', label: 'Color Match' },
                        { id: 'crash', label: 'Crash Point' },
                        { id: 'scratch', label: 'Scratch Win' },
                        { id: 'hunt', label: 'Treasure Hunt' },
                        { id: 'timer', label: 'Timer Bet' },
                        { id: 'drop', label: 'Ball Drop' },
                        { id: 'wheel', label: 'Fortune Wheel' },
                        { id: 'pick', label: 'Pick & Match' },
                        { id: 'rocket', label: 'Rocket Cash' },
                        { id: 'lucky', label: 'Lucky Numbers' },
                        { id: 'chest', label: 'Chest Royale' },
                     ].map((g) => {
                       const currentLocks = pageStatus.game_locks || {};
                       const isLocked = currentLocks[g.id] === true;
                       
                       return (
                         <div key={g.id} className="flex items-center justify-between p-6 bg-white/5 border border-white/5 rounded-3xl group">
                            <div>
                               <p className={cn("text-xs font-black uppercase transition-colors", isLocked ? "text-red-500" : "text-white")}>{g.label}</p>
                               <p className="text-[8px] font-black uppercase text-white/10 tracking-widest">{isLocked ? 'Protocol Locked' : 'Active'}</p>
                            </div>
                            <button
                              onClick={async () => {
                                const newLocks = { ...currentLocks, [g.id]: !isLocked };
                                try {
                                  await setDoc(doc(db, 'system', 'page_status'), {
                                    game_locks: newLocks
                                  }, { merge: true });
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className={cn(
                                "w-10 h-6 rounded-full relative transition-all duration-500",
                                isLocked ? "bg-red-500" : "bg-white/10"
                              )}
                            >
                               <div className={cn(
                                 "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-lg",
                                 isLocked ? "left-5" : "left-1"
                               )} />
                            </button>
                         </div>
                       );
                     })}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {['A', 'B'].map((cardId) => {
                    const currentRound = Math.floor(Date.now() / (5 * 60 * 60 * 1000));
                    const bidsOnThisCard = marketDuelBids.filter(b => b.selection === cardId && b.roundId === currentRound);
                    const totalAmount = bidsOnThisCard.reduce((sum, b) => sum + (b.amount || 0), 0);
                    const isManualWinner = marketDuelOutcomes[currentRound] === cardId;

                    return (
                      <div key={cardId} className={cn(
                        "glass p-10 rounded-[3.5rem] border transition-all duration-500",
                        isManualWinner ? "border-emerald-500/50 bg-emerald-500/[0.03]" : "border-white/5"
                      )}>
                         <div className="flex justify-between items-center mb-10">
                            <div>
                               <div className="flex items-center gap-3 mb-2">
                                  <h4 className="text-4xl font-black italic text-white leading-none">CARD {cardId}</h4>
                                  {isManualWinner && (
                                    <span className="px-3 py-1 bg-emerald-500 text-black text-[8px] font-black uppercase tracking-widest rounded-full">Manual Winner Set</span>
                                  )}
                               </div>
                               <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Active Pool Weight</p>
                            </div>
                            <div className="text-right">
                               <p className="text-[9px] font-black uppercase text-white/20 tracking-tighter mb-1">Total Active Vol.</p>
                               <p className="text-2xl font-black text-emerald-400">{formatCurrency(totalAmount)}</p>
                            </div>
                         </div>

                         <div className="space-y-4 mb-10">
                            <button
                              onClick={async () => {
                                try {
                                  await setDoc(doc(db, 'marketDuelOutcomes', currentRound.toString()), {
                                    winner: cardId,
                                    updatedAt: serverTimestamp()
                                  });
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className={cn(
                                "w-full py-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95",
                                isManualWinner 
                                  ? "bg-emerald-500 text-black shadow-2xl shadow-emerald-500/20" 
                                  : "bg-white/5 text-white/40 hover:bg-emerald-500/10 hover:text-emerald-400 border border-white/5 hover:border-emerald-500/20"
                              )}
                            >
                               {isManualWinner ? "WINNER PROTOCOL ENABLED" : `SET CARD ${cardId} AS WINNER`}
                            </button>
                            {isManualWinner && (
                              <button 
                                onClick={async () => {
                                  try {
                                    await deleteDoc(doc(db, 'marketDuelOutcomes', currentRound.toString()));
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="w-full text-[9px] font-black text-white/20 uppercase tracking-widest hover:text-red-500/50 transition-colors"
                              >
                                Reset to Random Outcome
                              </button>
                            )}
                         </div>

                         <div className="space-y-3">
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest px-2 mb-4">Live Bids ({bidsOnThisCard.length})</p>
                            <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                               {bidsOnThisCard.length > 0 ? bidsOnThisCard.map((bid) => {
                                 const bidder = users.find(u => (u.uid || u.id) === bid.userId);
                                 return (
                                   <div key={bid.id} className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5 group hover:border-white/10 transition-all">
                                      <div className="flex items-center gap-3">
                                         <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30 text-[10px] font-black">
                                            {bidder?.displayName?.charAt(0) || '?'}
                                         </div>
                                         <div>
                                            <p className="text-[11px] font-bold text-white leading-none mb-1">@{bidder?.displayName || 'Unknown'}</p>
                                            <p className="text-[8px] font-black text-white/20 uppercase tracking-tighter leading-none">{bid.userId.slice(0, 10)}...</p>
                                         </div>
                                      </div>
                                      <p className="text-xs font-black text-white">{formatCurrency(bid.amount)}</p>
                                   </div>
                                 );
                               }) : (
                                 <div className="text-center py-10 opacity-10">
                                    <Zap size={24} className="mx-auto mb-2" />
                                    <p className="text-[9px] font-black uppercase tracking-widest">No Bids on Card {cardId}</p>
                                 </div>
                               )}
                            </div>
                         </div>
                      </div>
                    );
                  })}
               </div>
            </div>
          )}

          {activeTab === 'page_management' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
               <div className="glass p-12 rounded-[3.5rem] border border-white/5">
                  <div className="flex items-center gap-6 mb-12">
                     <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <ShieldAlert size={36} />
                     </div>
                     <div>
                        <h3 className="text-3xl font-black text-white px-2">Page Management</h3>
                        <p className="text-emerald-400 font-bold px-2">Control global feature accessibility</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {[
                       { id: 'dashboard', label: 'Executive Dashboard' },
                       { id: 'portfolio', label: 'Liquidity Portfolio' },
                       { id: 'invest', label: 'Wealth Packages' },
                       { id: 'gamehub', label: 'Game Hub' },
                       { id: 'marketduel', label: 'Market Duel' },
                       { id: 'wallet', label: 'Financial Wallet' },
                       { id: 'referral', label: 'Affiliate Network' },
                       { id: 'faq', label: 'Support & FAQ' },
                       { id: 'airdrop', label: 'Airdrop Terminal' },
                       { id: 'tiers', label: 'Membership Tiers' },
                       { id: 'notifications', label: 'Notification Center' },
                       { id: 'account', label: 'User Account' },
                       { id: 'deposit-request', label: 'Manual Deposits' },
                     ].map((pg) => {
                       // We can use a local listener or the same one from App if we passed it
                       // For now, let's assume we maintain local list state and sync on toggle
                       const isEnabled = pageStatus[pg.id] !== false;
                       
                       return (
                         <div key={pg.id} className="flex items-center justify-between p-6 bg-white/5 border border-white/5 rounded-3xl">
                            <div>
                               <p className="text-sm font-black text-white">{pg.label}</p>
                               <p className="text-[10px] font-black uppercase text-white/20 tracking-widest">{pg.id}</p>
                            </div>
                            <button
                              onClick={async () => {
                                const newStatus = !isEnabled;
                                try {
                                  await setDoc(doc(db, 'system', 'page_status'), {
                                    [pg.id]: newStatus
                                  }, { merge: true });
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className={cn(
                                "w-14 h-8 rounded-full relative transition-all duration-300",
                                isEnabled ? "bg-emerald-500" : "bg-white/10"
                              )}
                            >
                               <div className={cn(
                                 "absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300",
                                 isEnabled ? "left-7" : "left-1"
                               )} />
                            </button>
                         </div>
                       );
                     })}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'investments' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="glass p-10 rounded-[3rem] border border-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl font-black text-white px-2">Global Investments</h3>
                    <p className="text-emerald-400 font-bold px-2">{globalInvestments.length} Active & Matured Plans</p>
                  </div>
                  <div className="relative w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                    <input 
                      type="text" 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search username or UID..."
                      className="w-full bg-white/5 border border-white/10 pl-10 pr-4 py-3 rounded-xl outline-none focus:border-emerald-500/50 text-white text-sm"
                    />
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-8">
                  {users
                    .filter(u => {
                      const userInvestments = globalInvestments.filter(i => i.userId === u.uid || i.userId === u.id);
                      if (userInvestments.length === 0) return false;
                      return (
                        u.displayName?.toLowerCase().includes(search.toLowerCase()) || 
                        (u.uid || u.id)?.toLowerCase().includes(search.toLowerCase()) ||
                        u.email?.toLowerCase().includes(search.toLowerCase())
                      );
                    })
                    .map(u => {
                      const userInvestments = globalInvestments.filter(i => i.userId === u.uid || i.userId === u.id)
                        .sort((a,b) => {
                          const at = a.startTime?.toMillis ? a.startTime.toMillis() : 0;
                          const bt = b.startTime?.toMillis ? b.startTime.toMillis() : 0;
                          return bt - at;
                        });
                      
                      return (
                        <div key={u.id} className="glass p-10 rounded-[3.5rem] border border-white/5">
                           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-10 border-b border-white/5">
                              <div className="flex items-center gap-6">
                                 <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                    <UserCircle size={36} />
                                 </div>
                                 <div>
                                    <h4 className="text-2xl font-black text-white">@{u.displayName || 'Unnamed'}</h4>
                                    <p className="text-[10px] font-black uppercase text-white/30 tracking-[0.3em]">{u.uid}</p>
                                    <div className="flex items-center gap-4 mt-2">
                                       <div className="flex items-center gap-1">
                                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                          <span className="text-[10px] font-black uppercase text-emerald-400/60 tracking-tighter">Balance: {formatCurrency(u.balanceNGN)}</span>
                                       </div>
                                       <span className="text-[10px] font-black uppercase text-white/20 tracking-tighter">Tier: {u.tier}</span>
                                    </div>
                                 </div>
                              </div>
                              <div className="flex gap-4">
                                 <div className="bg-white/5 px-6 py-4 rounded-2xl border border-white/5 text-center">
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Total Yields</p>
                                    <p className="text-lg font-black text-emerald-400">{formatCurrency(u.totalProfitNGN || 0)}</p>
                                 </div>
                                 <div className="bg-white/5 px-6 py-4 rounded-2xl border border-white/5 text-center">
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Active Plans</p>
                                    <p className="text-lg font-black text-white">{userInvestments.filter(i => i.status === 'active').length}</p>
                                 </div>
                              </div>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                              {userInvestments.map(inv => {
                                const isMatured = new Date() > (inv.endTime?.toDate ? inv.endTime.toDate() : new Date(inv.endTime));
                                const duration = inv.durationDays || 3;
                                const expectedPayout = inv.capital * (1 + (inv.rate || 0.5));

                                return (
                                  <div key={inv.id} className={cn(
                                    "p-6 rounded-[2rem] border transition-all",
                                    inv.status === 'active' 
                                      ? "bg-white/5 border-emerald-500/10 hover:border-emerald-500/30" 
                                      : "bg-white/[0.02] border-white/5 grayscale opacity-60"
                                  )}>
                                     <div className="flex justify-between items-start mb-6">
                                        <div>
                                           <div className="flex items-center gap-2 mb-1">
                                              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{inv.planId} Package</p>
                                              {inv.status === 'active' && !isMatured && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                              )}
                                           </div>
                                           <p className="text-xl font-black text-white">{formatCurrency(inv.capital)}</p>
                                        </div>
                                        <div className={cn(
                                          "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                                          inv.status === 'active' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-white/30 border-white/5"
                                        )}>
                                          {inv.status}
                                        </div>
                                     </div>

                                     <div className="space-y-3 mb-6">
                                        <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5">
                                           <p className="text-[9px] font-black text-white/20 uppercase tracking-tighter">ROI Rate</p>
                                           <p className="text-xs font-black text-emerald-400">+{((inv.rate || 0) * 100).toFixed(0)}%</p>
                                        </div>
                                        <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5">
                                           <p className="text-[9px] font-black text-white/20 uppercase tracking-tighter">Expected Payout</p>
                                           <p className="text-xs font-black text-white">{formatCurrency(expectedPayout)}</p>
                                        </div>
                                     </div>

                                     <div className="space-y-4">
                                        <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.2em]">
                                           <span className="text-white/20">Duration</span>
                                           <span className="text-white/60">{inv.durationDays} Days</span>
                                        </div>
                                        <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.2em]">
                                           <span className="text-white/20">Start</span>
                                           <span className="text-white/60">{inv.startTime?.toDate ? inv.startTime.toDate().toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.2em]">
                                           <span className="text-white/20">Maturity</span>
                                           <span className="text-white/60">{inv.endTime?.toDate ? inv.endTime.toDate().toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                     </div>
                                  </div>
                                );
                              })}
                           </div>
                        </div>
                      );
                    })}
                  
                  {globalInvestments.length === 0 && (
                    <div className="py-40 text-center glass rounded-[4rem] border border-dashed border-white/5 opacity-10">
                       <BarChart3 size={80} className="mx-auto mb-8" />
                       <p className="text-2xl font-black uppercase tracking-[0.5em]">No Global Investments Logged</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'referrals' && !selectedUser && (
            <div className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="glass p-8 rounded-[2.5rem] border border-white/5">
                    <p className="text-[10px] uppercase font-black text-white/30 mb-2 tracking-widest">Global Referral Volume</p>
                    <p className="text-4xl font-black text-white">
                      {users.reduce((acc, u) => acc + (u.totalReferrals || 0), 0)}
                    </p>
                 </div>
                 <div className="glass p-8 rounded-[2.5rem] border border-white/5">
                    <p className="text-[10px] uppercase font-black text-white/30 mb-2 tracking-widest">Total Referral Payouts</p>
                    <p className="text-4xl font-black text-emerald-400">
                      {formatCurrency(users.reduce((acc, u) => acc + (u.referralEarnings || 0), 0))}
                    </p>
                 </div>
               </div>

               <div className="glass p-8 rounded-[3rem] border border-white/5 overflow-hidden">
                  <div className="flex items-center justify-between mb-8 px-2">
                    <h3 className="text-2xl font-black text-white">Referral Leaderboard</h3>
                    <div className="relative w-72">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                      <input 
                        type="text" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search referral code/user..."
                        className="w-full bg-white/5 border border-white/10 pl-10 pr-4 py-3 rounded-xl outline-none focus:border-emerald-500/50 text-white text-sm"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/5 text-[10px] font-black uppercase text-white/30 tracking-widest">
                          <th className="pb-4 px-4">Username</th>
                          <th className="pb-4 px-4">Referral Code</th>
                          <th className="pb-4 px-4">Total Referrals</th>
                          <th className="pb-4 px-4">Earnings</th>
                          <th className="pb-4 px-4">Referred By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {users
                          .filter(u => 
                            u.displayName?.toLowerCase().includes(search.toLowerCase()) || 
                            u.referralCode?.toLowerCase().includes(search.toLowerCase())
                          )
                          .sort((a,b) => (b.totalReferrals || 0) - (a.totalReferrals || 0))
                          .map(u => (
                          <tr 
                            key={u.id} 
                            onClick={() => { setSelectedUser(u); setActiveTab('users'); }}
                            className="group hover:bg-white/5 cursor-pointer transition-colors"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs font-black">
                                  {u.displayName?.charAt(0) || 'U'}
                                </div>
                                <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">@{u.displayName || 'Unnamed'}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 font-mono text-xs text-white/60">{u.referralCode}</td>
                            <td className="py-4 px-4 font-black">{u.totalReferrals || 0}</td>
                            <td className="py-4 px-4 font-black text-emerald-400">{formatCurrency(u.referralEarnings || 0)}</td>
                            <td className="py-4 px-4 text-xs text-white/30">{u.referredBy || 'Organic'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'broadcast' && (
            <div className="glass p-12 rounded-[4rem] border border-emerald-500/10 max-w-4xl mx-auto">
               <h3 className="text-4xl font-black mb-8 flex items-center gap-4">
                  <Bell className="text-emerald-400" size={40} /> Global Broadcast
               </h3>
               <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3 block">Urgency Level</label>
                    <div className="flex gap-4">
                       {['info', 'success', 'warning'].map(t => (
                         <button 
                           key={t}
                           onClick={() => setBroadcastType(t as any)}
                           className={cn(
                             "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                             broadcastType === t ? "bg-white text-black" : "bg-white/5 text-white/40 hover:bg-white/10"
                           )}
                         >
                           {t}
                         </button>
                       ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3 block">Announcement Message</label>
                    <textarea 
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Type system-wide announcement message..."
                      className="w-full h-40 bg-white/5 border border-white/10 p-6 rounded-3xl outline-none focus:border-emerald-500/50 text-white font-black text-lg shadow-inner"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button onClick={handleSendBroadcast} className="flex-1 py-6 bg-emerald-500 text-black font-black rounded-3xl text-[12px] uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/40 active:scale-95 transition-all">
                        Launch Global Transmission
                    </button>
                    <button onClick={handleDeleteBroadcast} className="px-10 py-6 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white font-black rounded-3xl active:scale-95 transition-all">
                        <Trash2 size={24} />
                    </button>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="glass p-12 rounded-[4rem] border border-blue-500/10 max-w-4xl mx-auto">
               <h3 className="text-4xl font-black mb-8 flex items-center gap-4">
                  <MessageCircle className="text-blue-400" size={40} /> Targeted Alert Dispatch
               </h3>
               <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3 block">Recipient ID (UID)</label>
                      <input 
                        type="text" 
                        value={alertForm.userId}
                        onChange={(e) => setAlertForm({...alertForm, userId: e.target.value})}
                        placeholder="User Identification Code..."
                        className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-blue-500/50 text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3 block">Notification Title</label>
                      <input 
                        type="text" 
                        readOnly
                        value="System Security 🛡️"
                        className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white/40 font-bold opacity-50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3 block">Secret Message Content</label>
                    <textarea 
                      value={alertForm.message}
                      onChange={(e) => setAlertForm({...alertForm, message: e.target.value})}
                      placeholder="Type private message for specific recipient..."
                      className="w-full h-40 bg-white/5 border border-white/10 p-6 rounded-3xl outline-none focus:border-blue-500/50 text-white font-bold text-lg shadow-inner"
                    />
                  </div>
                  <button onClick={handleSendAlert} className="w-full py-6 bg-blue-500 text-white font-black rounded-3xl text-[12px] uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/40 active:scale-95 transition-all mt-4">
                      Initiate Private Transmission
                  </button>
               </div>
            </div>
          )}

          {activeTab === 'withdrawals' && (
            <div className="space-y-8">
               <h3 className="text-3xl font-black text-white flex items-center gap-4 px-2">
                  <ArrowDownCircle className="text-red-400" size={32} /> Pending Liquidations ({withdrawalRequests.length})
               </h3>
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {withdrawalRequests.map(req => (
                    <div key={req.id} className="p-10 glass rounded-[3.5rem] border border-white/10 space-y-8 hover:border-emerald-500/30 transition-all">
                       <div className="flex justify-between items-start">
                          <div className="space-y-1">
                             <p className="text-[11px] font-black text-emerald-400 tracking-[0.3em] uppercase opacity-60">Payout Requested</p>
                             <p className="font-black text-4xl text-white">{formatCurrency(req.amount)}</p>
                             <p className="text-[10px] text-white/40 font-mono font-bold truncate underline decoration-white/10 underline-offset-4 pt-2">{req.userEmail}</p>
                             <span className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-black uppercase text-white/60 border border-white/10 mt-4 inline-block tracking-widest">{req.tier} Priority</span>
                          </div>
                          <div className="flex flex-col gap-3">
                             <button onClick={() => handleApproveWithdrawal(req.id, req.userId, req.amount)} className="p-5 bg-emerald-500 text-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-500/20">
                                <Check size={28} />
                             </button>
                             <button onClick={() => handleRejectWithdrawal(req.id, req.userId, req.amount)} className="p-5 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-xl shadow-red-500/10">
                                <X size={28} />
                             </button>
                          </div>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                             <p className="text-[10px] uppercase font-black text-white/30 mb-2 tracking-[0.2em]">Bank Client Name</p>
                             <p className="text-sm font-black text-white">{req.details?.accountName}</p>
                          </div>
                          <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                             <p className="text-[10px] uppercase font-black text-white/30 mb-2 tracking-[0.2em]">Beneficiary Institution</p>
                             <p className="text-sm font-black text-white">{req.details?.bankName}</p>
                          </div>
                          <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                             <p className="text-[10px] uppercase font-black text-white/30 mb-2 tracking-[0.2em]">Banking Credentials</p>
                             <p className="text-sm font-black font-mono text-emerald-400">{req.details?.accountNumber}</p>
                          </div>
                          <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                             <p className="text-[10px] uppercase font-black text-white/30 mb-2 tracking-[0.2em]">Validated Contact</p>
                             <p className="text-sm font-black text-white">{req.details?.phone}</p>
                          </div>
                       </div>
                    </div>
                  ))}
                  {withdrawalRequests.length === 0 && (
                     <div className="col-span-full py-40 text-center opacity-10 flex flex-col items-center justify-center">
                        <Wallet size={80} className="mx-auto mb-8" />
                        <p className="font-black uppercase tracking-[0.5em] text-2xl">Liquidity Desk Clear</p>
                     </div>
                  )}
               </div>
            </div>
          )}

           {activeTab === 'deposits' && (
            <div className="space-y-8">
               <div className="glass p-10 rounded-[3rem] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="p-5 bg-emerald-500/10 rounded-2xl text-emerald-400">
                      <ArrowDownCircle size={32} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-white">Deposit Requests</h3>
                      <p className="text-emerald-400 font-bold">{depositRequests.length} Pending Verifications</p>
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {depositRequests.map(req => (
                    <div key={req.id} className="p-10 glass rounded-[3.5rem] border border-white/10 space-y-8 hover:border-emerald-500/20 transition-all">
                       <div className="flex justify-between items-start">
                          <div className="flex flex-col gap-1">
                             <p className="font-black text-2xl text-white">@{req.username || 'User'}</p>
                             <p className="text-[10px] font-mono font-black text-white/20 tracking-widest">{req.email}</p>
                             <p className="text-emerald-400 font-bold text-xs">{req.phone}</p>
                          </div>
                          <div className="bg-white/5 px-6 py-4 rounded-3xl border border-white/10 text-center">
                             <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Amount</p>
                             <p className="text-2xl font-black text-emerald-400">{formatCurrency(req.amount)}</p>
                          </div>
                       </div>

                       {req.transactionId && (
                         <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl space-y-2 mb-4">
                            <p className="text-[10px] font-black uppercase text-emerald-500/50 tracking-widest pl-2">Transaction ID / Reference</p>
                            <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5 mx-2">
                               <code className="text-emerald-400 font-mono text-[10px] select-all text-center flex-1">{req.transactionId}</code>
                               <button 
                                 onClick={() => {
                                   navigator.clipboard.writeText(req.transactionId);
                                 }}
                                 className="p-2 hover:bg-white/5 rounded-lg text-emerald-500/50 hover:text-emerald-400 transition-all shrink-0"
                               >
                                  <Files size={14} />
                               </button>
                            </div>
                         </div>
                       )}

                       <div className="space-y-4">
                          <p className="text-[10px] font-black uppercase text-white/30 tracking-widest pl-2">Payment Receipt</p>
                          {req.receiptUrl ? (
                            <div className="relative group rounded-3xl overflow-hidden border border-white/10 bg-black/40 aspect-video">
                              <img 
                                src={req.receiptUrl} 
                                alt="Receipt" 
                                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700 cursor-zoom-in"
                                onClick={() => window.open(req.receiptUrl, '_blank')}
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="p-10 rounded-3xl bg-white/5 border border-dashed border-white/10 text-center text-white/20">
                              <p className="font-bold text-xs uppercase tracking-widest">No Image Attached</p>
                            </div>
                          )}
                       </div>

                       <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between">
                          <div>
                             <p className="text-[9px] uppercase font-black text-white/30 mb-1 tracking-widest">Request Date</p>
                             <p className="text-xs font-bold text-white/60">{req.createdAt?.toDate ? req.createdAt.toDate().toLocaleString() : 'N/A'}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-[9px] uppercase font-black text-white/30 mb-1 tracking-widest">Status</p>
                             <span className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 bg-amber-500/10 text-amber-500 rounded-lg">Verification Pending</span>
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => handleApproveDeposit(req)}
                            className="bg-emerald-500 text-black py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                             Approve Funds <CheckCircle2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleRejectDeposit(req.id, req.userId)}
                            className="bg-red-500/10 text-red-400 border border-red-500/20 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                          >
                             Reject Request
                          </button>
                       </div>
                    </div>
                  ))}

                  {depositRequests.length === 0 && (
                    <div className="col-span-full py-40 text-center glass rounded-[3rem] border border-dashed border-white/5 opacity-30">
                       <ArrowDownCircle size={48} className="mx-auto mb-4" />
                       <p className="font-black uppercase tracking-[0.3em] text-sm">No pending deposit verifications</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'kyc' && (
            <div className="space-y-8">
               <h3 className="text-3xl font-black text-white flex items-center gap-4 px-2">
                  <Shield className="text-amber-400" size={32} /> Verification Queue ({kycRequests.length})
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {kycRequests.map(req => (
                    <div key={req.id} className="p-10 glass rounded-[3.5rem] border border-white/10 space-y-8 hover:border-amber-500/20 transition-all flex flex-col">
                       <div className="flex justify-between items-start mb-2">
                          <div className="min-w-0">
                             <p className="font-black text-2xl text-white truncate mb-1">{req.username}</p>
                             <p className="text-[9px] font-mono font-black text-white/20 truncate tracking-widest">{req.uid}</p>
                          </div>
                       </div>
                       <div className="space-y-4 flex-1">
                          <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                             <p className="text-[9px] uppercase font-black text-white/30 mb-1 tracking-widest">Client Email</p>
                             <p className="text-sm font-bold truncate">{req.email}</p>
                          </div>
                          <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                             <p className="text-[9px] uppercase font-black text-white/30 mb-1 tracking-widest">Client Phone</p>
                             <p className="text-sm font-bold truncate">{req.phoneNumber}</p>
                          </div>
                          <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                             <p className="text-[9px] uppercase font-black text-white/30 mb-1 tracking-widest">Residential Location</p>
                             <p className="text-sm font-bold leading-tight line-clamp-2">{req.address}</p>
                          </div>
                       </div>
                       <div className="flex gap-4 pt-6">
                          <button onClick={() => handleApproveKYC(req.uid)} className="flex-1 py-5 bg-emerald-500 text-black rounded-2xl flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all text-[11px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20">
                             <Check size={18} /> Legitimize
                          </button>
                          <button onClick={() => handleRejectKYC(req.uid)} className="p-5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-xl shadow-red-500/10">
                             <X size={20} />
                          </button>
                       </div>
                    </div>
                  ))}
                  {kycRequests.length === 0 && (
                     <div className="col-span-full py-40 text-center opacity-10 flex flex-col items-center justify-center">
                        <Shield size={80} className="mx-auto mb-8" />
                        <p className="font-black uppercase tracking-[0.5em] text-2xl">Identity Desk Clear</p>
                     </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'registry' && (
            <div className="glass p-10 rounded-[3.5rem] border border-white/5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                 <div>
                    <h3 className="text-3xl font-black mb-1">Global Client Registry</h3>
                    <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em]">Total Registered Accounts: {filteredUsers.length}</p>
                 </div>
                 <div className="relative w-full md:w-[28rem]">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                    <input 
                     type="text" 
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     placeholder="Global search by identity, email, or credentials..."
                     className="w-full bg-white/5 border border-white/10 pl-16 pr-8 py-6 rounded-[2rem] outline-none focus:border-emerald-500/50 text-white font-black text-sm tracking-widest placeholder:text-white/10 shadow-inner overflow-hidden"
                    />
                 </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                 <table className="w-full text-left border-separate border-spacing-y-4">
                    <thead>
                       <tr className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">
                          <th className="px-10 pb-4">Client Identity</th>
                          <th className="px-6 pb-4 text-center">Liquidity</th>
                          <th className="px-6 pb-4 text-center text-blue-400">Referrals</th>
                          <th className="px-6 pb-4 text-center">Tier</th>
                          <th className="px-6 pb-4 text-center">Total In/Out</th>
                          <th className="px-6 pb-4 text-center">Status</th>
                          <th className="px-10 pb-4 text-right">Directive</th>
                       </tr>
                    </thead>
                    <tbody>
                       {filteredUsers.map(u => (
                          <tr key={u.id} className="group transition-all">
                             <td className="px-10 py-8 glass rounded-l-[2.5rem] border-r border-white/5 group-hover:bg-white/[0.05]">
                                <div className="flex items-center gap-6">
                                   <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg border border-emerald-500/10 group-hover:rotate-3 transition-transform">
                                      <UserCircle size={36} />
                                   </div>
                                   <div className="min-w-0">
                                      <p className="font-black text-xl text-white truncate tracking-wide">{u.displayName || 'Unnamed'}</p>
                                      <p className="text-[11px] font-mono text-white/30 font-bold truncate opacity-60 tracking-wider mb-2">{u.email}</p>
                                      <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{u.uid}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-6 py-8 glass text-center border-r border-white/5 group-hover:bg-white/[0.05]">
                                <p className="font-black text-2xl text-emerald-400 mb-1">{formatCurrency(u.balanceNGN)}</p>
                                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Available</p>
                             </td>
                             <td className="px-6 py-8 glass text-center border-r border-white/5 group-hover:bg-white/[0.05]">
                                <p className="font-black text-2xl text-blue-400 mb-1">{u.totalReferrals || 0}</p>
                                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Affiliates</p>
                             </td>
                             <td className="px-6 py-8 glass text-center border-r border-white/5 group-hover:bg-white/[0.05]">
                                <span className="px-5 py-2 bg-white/5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-white/50 border border-white/5 shadow-xl">
                                   {u.tier}
                                </span>
                             </td>
                             <td className="px-6 py-8 glass text-center border-r border-white/5 group-hover:bg-white/[0.05]">
                                <div className="space-y-1">
                                   <p className="text-[10px] font-black text-emerald-500 tracking-widest flex items-center justify-center gap-1">
                                      <Plus size={8} /> {formatCurrency(u.totalDepositedNGN || 0)}
                                   </p>
                                   <p className="text-[10px] font-black text-red-500 tracking-widest flex items-center justify-center gap-1">
                                      - {formatCurrency(u.totalWithdrawnNGN || 0)}
                                   </p>
                                </div>
                             </td>
                             <td className="px-6 py-8 glass text-center border-r border-white/5 group-hover:bg-white/[0.05]">
                                <div className="flex flex-col items-center gap-2">
                                   <div className="flex items-center gap-2">
                                      <div className={cn("w-3 h-3 rounded-full shadow-2xl", u.kycStatus === 'verified' ? 'bg-emerald-500 shadow-emerald-500/50' : u.kycStatus === 'pending' ? 'bg-amber-500 shadow-amber-500/50' : 'bg-red-500 shadow-red-500/50')} />
                                      <span className="text-[11px] font-black uppercase text-white/50 tracking-widest">{u.kycStatus}</span>
                                   </div>
                                   {u.banned && <span className="text-[9px] font-black text-red-500 uppercase px-3 py-1 bg-red-500/10 rounded-lg border border-red-500/20 shadow-lg shadow-red-500/5">Denied</span>}
                                </div>
                             </td>
                             <td className="px-10 py-8 glass rounded-r-[2.5rem] text-right group-hover:bg-white/[0.05]">
                                <div className="flex justify-end gap-3 scale-90 md:scale-100 origin-right">
                                   <button 
                                     onClick={() => { setSelectedUser(u); setActiveTab('users'); }}
                                     className="px-8 py-4 bg-white/5 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5 shadow-xl"
                                   >
                                      Manage
                                   </button>
                                   {u.banned ? (
                                     <button onClick={() => handleUnbanUser(u.id)} className="px-8 py-4 bg-emerald-500 text-black font-black rounded-2xl text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                                        RESTORE
                                     </button>
                                   ) : (
                                     <button onClick={() => handleBanUser(u.id)} className="px-8 py-4 bg-red-500/20 text-red-400 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-xl">
                                        BLOCK
                                     </button>
                                   )}
                                </div>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="glass p-10 rounded-[3.5rem] border border-white/5">
                  <h3 className="text-3xl font-black mb-8 flex items-center gap-3">
                    <HelpCircle className="text-emerald-500" size={32} /> 
                    {isEditingFAQ ? 'Modify FAQ Entry' : 'Add New FAQ Entry'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                     <div className="md:col-span-2">
                        <label className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3 block">Question</label>
                        <input 
                          type="text" 
                          value={faqForm.question}
                          onChange={(e) => setFaqForm({...faqForm, question: e.target.value})}
                          placeholder="What is Daily Yield?"
                          className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-emerald-500/50 text-white font-bold"
                        />
                     </div>
                     <div className="md:col-span-2">
                        <label className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3 block">Answer</label>
                        <textarea 
                          value={faqForm.answer}
                          onChange={(e) => setFaqForm({...faqForm, answer: e.target.value})}
                          placeholder="Provide the explanation here..."
                          className="w-full h-32 bg-white/5 border border-white/10 p-5 rounded-3xl outline-none focus:border-emerald-500/50 text-white text-sm leading-relaxed resize-none"
                        />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3 block">Display Order</label>
                        <input 
                          type="number" 
                          value={faqForm.order}
                          onChange={(e) => setFaqForm({...faqForm, order: parseInt(e.target.value) || 0})}
                          className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-emerald-500/50 text-white font-bold"
                        />
                     </div>
                     <div className="flex items-end gap-3">
                        <button 
                          onClick={handleSaveFAQ}
                          className="flex-1 py-5 bg-emerald-500 text-black font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                        >
                           {isEditingFAQ ? 'Commit Edit' : 'Add to FAQ'}
                        </button>
                        {isEditingFAQ && (
                          <button 
                            onClick={() => { setIsEditingFAQ(false); setFaqForm({ id: '', question: '', answer: '', order: 0 }); }}
                            className="px-8 py-5 bg-white/5 text-white/50 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-white/10"
                          >
                             Cancel
                          </button>
                        )}
                     </div>
                  </div>
               </div>

               <div className="glass p-10 rounded-[3.5rem] border border-white/5">
                  <h4 className="text-xl font-black text-white/50 mb-8 uppercase tracking-widest">Active Knowledge Base Items</h4>
                  <div className="space-y-4">
                     {faqs.map((f) => (
                       <div key={f.id} className="p-6 bg-white/5 rounded-3xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:border-emerald-500/30 transition-all">
                          <div className="min-w-0 flex-1">
                             <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black text-white/40">Order: {f.order}</span>
                                <h5 className="font-black text-white truncate">{f.question}</h5>
                             </div>
                             <p className="text-white/30 text-xs line-clamp-1">{f.answer}</p>
                          </div>
                          <div className="flex gap-2">
                             <button 
                               onClick={() => { setIsEditingFAQ(true); setFaqForm(f); }}
                               className="p-3 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white rounded-xl transition-all"
                             >
                                <Settings size={18} />
                             </button>
                             <button 
                               onClick={() => handleDeleteFAQ(f.id)}
                               className="p-3 bg-red-500/10 text-red-500/40 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                             >
                                <Trash2 size={18} />
                             </button>
                          </div>
                       </div>
                     ))}
                     {faqs.length === 0 && (
                       <p className="py-20 text-center text-white/10 italic">No FAQ items currently stored.</p>
                     )}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'airdrop' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="glass p-10 rounded-[3.5rem] border border-emerald-500/10">
                  <h3 className="text-3xl font-black mb-8 flex items-center gap-3 text-white">
                    <Zap className="text-emerald-400" size={32} /> Airdrop Deployment
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="md:col-span-2">
                        <label className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3 block">Drop Name</label>
                        <input 
                           type="text" 
                           value={airdropForm.name}
                           onChange={(e) => setAirdropForm({...airdropForm, name: e.target.value})}
                           placeholder="Community Loyalty Rewards Phase 1"
                           className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-emerald-500/50 text-white font-bold"
                        />
                     </div>
                     <div className="md:col-span-2">
                        <label className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3 block">Description</label>
                        <textarea 
                           value={airdropForm.description}
                           onChange={(e) => setAirdropForm({...airdropForm, description: e.target.value})}
                           placeholder="Exclusive rewards for our early adopters and loyal stakers."
                           className="w-full h-32 bg-white/5 border border-white/10 p-5 rounded-3xl outline-none focus:border-emerald-500/50 text-white text-sm resize-none"
                        />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3 block">NGN Reward Value</label>
                        <input 
                           type="number" 
                           value={airdropForm.amount}
                           onChange={(e) => setAirdropForm({...airdropForm, amount: e.target.value})}
                           placeholder="2000"
                           className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-emerald-500/50 text-emerald-400 font-black text-xl"
                        />
                     </div>
                     <div className="flex items-end">
                        <button 
                           onClick={handleSaveAirdrop}
                           className="w-full py-5 bg-emerald-500 text-black font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                        >
                           Launch Quantum Airdrop 🛸
                        </button>
                     </div>
                  </div>
               </div>

               <div className="glass p-10 rounded-[3.5rem] border border-white/5 overflow-hidden">
                  <h4 className="text-xl font-black text-white/60 mb-8 uppercase tracking-widest">Active Airdrop Registry</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-black uppercase text-white/30 tracking-widest border-b border-white/5">
                          <th className="pb-4 px-4">Drop Name</th>
                          <th className="pb-4 px-4">Amount</th>
                          <th className="pb-4 px-4">Claims</th>
                          <th className="pb-4 px-4">Status</th>
                          <th className="pb-4 px-4 text-right">Commander</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {airdrops.map(ad => (
                          <tr key={ad.id} className="group hover:bg-white/[0.02] transition-all">
                            <td className="py-6 px-4">
                              <p className="font-black text-white">{ad.name}</p>
                              <p className="text-[10px] text-white/30 line-clamp-1">{ad.description}</p>
                            </td>
                            <td className="py-6 px-4">
                              <span className="font-black text-emerald-400">{formatCurrency(ad.amount)}</span>
                            </td>
                            <td className="py-6 px-4">
                               <div className="flex items-center gap-2">
                                  <UserCheck size={14} className="text-white/40" />
                                  <span className="font-mono text-sm text-white/60">{ad.totalClaims || 0}</span>
                               </div>
                            </td>
                            <td className="py-6 px-4">
                               <span className={cn(
                                 "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                 ad.status === 'active' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-white/40 border border-white/10"
                               )}>
                                 {ad.status}
                               </span>
                            </td>
                            <td className="py-6 px-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => toggleAirdropStatus(ad.id, ad.status)}
                                  className="p-2 bg-white/5 text-white/40 rounded-lg hover:bg-white/10 hover:text-white transition-all"
                                >
                                  {ad.status === 'active' ? <Ban size={16} /> : <Play size={16} />}
                                </button>
                                <button 
                                  onClick={() => handleDeleteAirdrop(ad.id)}
                                  className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {airdrops.length === 0 && (
                      <p className="py-20 text-center text-white/10 italic">No historical airdrop data detected.</p>
                    )}
                  </div>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AirdropHub({ profile }: { profile: UserProfile | null }) {
  const [airdrops, setAirdrops] = useState<any[]>([]);
  const [userClaims, setUserClaims] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const qAirdrops = query(collection(db, 'airdrops'), where('status', '==', 'active'), orderBy('createdAt', 'desc'));
    const unsubscribeAirdrops = onSnapshot(qAirdrops, (snap) => {
      setAirdrops(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const qClaims = collection(db, 'users', profile.uid, 'airdropsClaimed');
    const unsubscribeClaims = onSnapshot(qClaims, (snap) => {
      const claims: Record<string, any> = {};
      snap.docs.forEach(d => { claims[d.id] = d.data(); });
      setUserClaims(claims);
      setLoading(false);
    });
    return () => { unsubscribeAirdrops(); unsubscribeClaims(); };
  }, [profile]);

  const handleClaim = async (airdrop: any) => {
    if (!profile) return;
    if (userClaims[airdrop.id]) return alert("Already claimed!");
    try {
      const claimRef = doc(db, 'users', profile.uid, 'airdropsClaimed', airdrop.id);
      const userRef = doc(db, 'users', profile.uid);
      const airdropRef = doc(db, 'airdrops', airdrop.id);
      const txRef = doc(collection(db, 'transactions'));
      await setDoc(claimRef, { claimed: true, claimedAt: serverTimestamp(), amount: airdrop.amount, airdropName: airdrop.name });
      await updateDoc(userRef, { 
        balanceNGN: increment(airdrop.amount),
        walletBalance: increment(airdrop.amount)
      });
      await updateDoc(airdropRef, { totalClaims: increment(1) });
      await setDoc(txRef, { userId: profile.uid, type: 'payout', amount: airdrop.amount, status: 'completed', description: `Airdrop - ${airdrop.name}`, createdAt: serverTimestamp() });
      await setDoc(doc(collection(db, 'notifications')), { userId: profile.uid, title: 'Airdrop Claimed! 🎁', message: `Claimed ${airdrop.name}`, type: 'success', createdAt: serverTimestamp() });
      
      // Trigger Push
      await triggerPush(profile.uid, 'Airdrop Claimed! 🎁', `You successfully claimed the ${airdrop.name} airdrop of ${formatCurrency(airdrop.amount)}.`, '/airdrop');
      
      alert(`Claimed ${airdrop.name}!`);
    } catch (err: any) { handleFirestoreError(err, 'create', `airdropsClaimed/${airdrop.id}`); }
  };

  if (!profile) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 pb-20 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-black flex items-center gap-4 text-white">Quantum Airdrop Hub <Zap className="text-emerald-400" /></h2>
        <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.4em]">Elite reward distribution protocol</p>
      </div>
      {loading ? <div className="py-20 flex justify-center"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div> : (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {airdrops.map((ad) => {
              const isClaimed = !!userClaims[ad.id];
              return (
                <div key={ad.id} className="glass p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-between relative overflow-hidden">
                  {isClaimed && <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">Already Claimed</div>}
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 mb-6 font-black italic">DY</div>
                    <h3 className="text-xl font-black mb-2 text-white">{ad.name}</h3>
                    <p className="text-white/40 text-sm leading-relaxed mb-8">{ad.description}</p>
                  </div>
                  <div>
                    <div className="flex justify-between items-end mb-6">
                      <div><p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Value</p><p className="text-2xl font-black text-emerald-400">{formatCurrency(ad.amount)}</p></div>
                      <div className="text-right"><p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Status</p><p className={cn("text-xs font-bold", isClaimed ? "text-emerald-400" : "text-amber-400")}>{isClaimed ? "Secured" : "Available"}</p></div>
                    </div>
                    <button onClick={() => handleClaim(ad)} disabled={isClaimed} className={cn("w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all", isClaimed ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-emerald-500 text-black hover:scale-[1.02]")}>{isClaimed ? "Claim Secured" : "Claim Quantum Airdrop"}</button>
                  </div>
                </div>
              );
            })}
          </div>
          {airdrops.length === 0 && <div className="glass p-20 rounded-[3.5rem] text-center border border-white/5"><Boxes className="w-16 h-16 text-white/10 mx-auto mb-6 opacity-40" /><p className="text-white/20 font-black uppercase tracking-widest">No active airdrops detected.</p></div>}
          <div className="mt-20">
            <h3 className="text-2xl font-black mb-8 uppercase tracking-widest flex items-center gap-3 text-white"><History size={24} className="text-white/40" /> Your Claim History</h3>
            <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden">
               <div className="divide-y divide-white/5">
                 {Object.entries(userClaims).sort((a: any, b: any) => (b[1].claimedAt?.seconds || 0) - (a[1].claimedAt?.seconds || 0)).map(([id, claim]: [string, any]) => (
                   <div key={id} className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-all">
                      <div className="flex items-center gap-4"><div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl"><Check size={18} /></div>
                        <div><p className="font-black text-white">{claim.airdropName}</p><p className="text-[10px] text-white/30 font-bold font-mono">{claim.claimedAt?.toDate()?.toLocaleString()}</p></div></div>
                      <div className="text-right"><p className="font-black text-emerald-400 text-lg">+{formatCurrency(claim.amount)}</p><p className="text-[9px] text-white/20 uppercase font-black tracking-[0.2em]">Verified Secure</p></div>
                   </div>
                 ))}
                 {Object.keys(userClaims).length === 0 && <div className="py-20 text-center"><p className="text-white/10 italic">No historical claims detected.</p></div>}
               </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

