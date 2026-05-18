/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Droplet, 
  Search, 
  User, 
  History, 
  Plus, 
  Phone, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle,
  Menu,
  ChevronLeft,
  LifeBuoy,
  MessageSquare,
  AlertCircle,
  Languages,
  LogOut,
  LogIn,
  Mic,
  MicOff
} from 'lucide-react';
import { onSnapshot, collection, doc, setDoc, updateDoc, addDoc, query, where, orderBy, getDocs, onSnapshot as onSnapshotFirestore } from 'firebase/firestore';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, db as firestore, signInWithGoogle } from './lib/firebase';
import { checkEligibility, BLOOD_GROUPS, WAIT_PERIOD_DAYS } from './lib/eligibility';
import { getDonorStatsFromFirestore, searchDonorsInFirestore, type Donor } from './lib/repository';
import { translations, type Language } from './lib/translations';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// UTILS
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// FIRESTORE ERROR HANDLING
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// SHARED UI COMPONENTS
const Button = ({ children, onClick, variant = 'primary', className, disabled, type = 'button', size = 'default' }: any) => {
  const variants: any = {
    primary: "bg-[#C62828] text-white hover:bg-[#B71C1C] shadow-lg shadow-red-100",
    secondary: "bg-white text-[#1A237E] border border-slate-200 hover:bg-slate-50 shadow-sm",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100",
    success: "bg-[#2E7D32] text-white hover:bg-[#1B5E20] shadow-lg shadow-green-100",
    navy: "bg-[#1A237E] text-white hover:bg-[#0D147A] shadow-lg shadow-blue-100"
  };
  
  const sizes: any = {
    default: "py-4 px-6",
    sm: "py-2 px-4 text-sm",
    xs: "py-1.5 px-3 text-[10px]"
  };

  return (
    <button 
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className }: any) => (
  <div className={cn("bg-white rounded-3xl p-6 shadow-sm border border-slate-200", className)}>
    {children}
  </div>
);

const Header = ({ lang, onToggleLang, user }: { lang: Language, onToggleLang: () => void, user: FirebaseUser | null }) => {
  const t = translations[lang];
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 mb-6 lg:rounded-3xl lg:mt-4 lg:mx-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#C62828] rounded-xl flex items-center justify-center text-white shadow-lg">
          <Droplet size={24} fill="white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1A237E] leading-tight">{t.appName}</h1>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{t.ruralNetwork}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-[10px] font-bold text-slate-600 hover:bg-slate-200 transition-all border border-slate-200"
        >
          <Languages size={14} />
          {lang === 'en' ? 'ಕನ್ನಡ' : 'English'}
        </button>
        {user && (
          <button 
            onClick={() => signOut(auth)}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  );
};

// TYPES
type View = 'SPLASH' | 'HOME' | 'REGISTER' | 'DONOR_DASH' | 'SEARCH' | 'RESULTS' | 'HISTORY' | 'AI_HELP';

export default function App() {
  const [view, setView] = useState<View>('SPLASH');
  const [lang, setLang] = useState<Language>('en');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  const [activeDonor, setActiveDonor] = useState<Donor | null>(null);
  const [searchParams, setSearchParams] = useState({ bloodGroup: '', location: '' });
  const [searchResults, setSearchResults] = useState<Donor[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [stats, setStats] = useState({ total: 0, eligible: 0, ready: 0 });

  const t = translations[lang];

  // SEED DATA FUNCTION
  const seedSampleData = async () => {
    const donorsRef = collection(firestore, 'donors');
    const snapshot = await getDocs(donorsRef);
    if (snapshot.size < 5) {
      console.log('Seeding sample donors...');
      const samples = [
        { name: 'Ramesh Kumara', bloodGroup: 'O+', location: 'Dharwad', village: 'Hebballi', phone: '+91 98765 43210', isReadyToDonate: true, lastDonationDate: '2023-12-10', registeredAt: Date.now(), userId: 'sample1' },
        { name: 'Anita Patil', bloodGroup: 'B+', location: 'Hubli', village: 'Keshwapur', phone: '+91 87654 32109', isReadyToDonate: true, lastDonationDate: '2024-01-15', registeredAt: Date.now(), userId: 'sample2' },
        { name: 'Siddharth M', bloodGroup: 'A-', location: 'Dharwad', village: 'Saptapur', phone: '+91 76543 21098', isReadyToDonate: true, lastDonationDate: '2023-11-20', registeredAt: Date.now(), userId: 'sample3' },
        { name: 'Priya Hegde', bloodGroup: 'AB+', location: 'Dharwad', village: 'Malmaddi', phone: '+91 65432 10987', isReadyToDonate: true, lastDonationDate: '2024-02-01', registeredAt: Date.now(), userId: 'sample4' },
      ];
      for (const s of samples) {
        await addDoc(donorsRef, s);
      }
    }
  };

  // AUTH OBSERVER
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthLoading(false);
      if (!u) {
        setActiveDonor(null);
        setView('SPLASH');
      } else {
        // Initial fetch logic will happen in separate useEffects
      }
    });
  }, []);

  // DATA LISTENER: ACTIVE DONOR
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(firestore, 'donors', user.uid), (doc) => {
      if (doc.exists()) {
        setActiveDonor({ id: doc.id, ...doc.data() } as Donor);
      } else {
        setActiveDonor(null);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'donors/' + user.uid));
    return unsub;
  }, [user]);

  // DATA LISTENER: STATS
  useEffect(() => {
    seedSampleData();
    const unsub = onSnapshot(collection(firestore, 'donors'), (snapshot) => {
      const all = snapshot.docs.map(doc => doc.data() as Donor);
      setStats({
        total: all.length,
        eligible: all.filter(d => checkEligibility(d.lastDonationDate).isEligible).length,
        ready: all.filter(d => d.isReadyToDonate).length
      });
    });
    return unsub;
  }, []);

  // INIT
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthLoading) {
        setView('HOME');
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [isAuthLoading]);

  // HANDLERS
  const toggleLang = () => setLang(prev => prev === 'en' ? 'kn' : 'en');

  const handleRegister = async (donorData: Omit<Donor, 'id' | 'registeredAt' | 'userId'>) => {
    if (!user) return;
    try {
      const donor: Donor = {
        ...donorData,
        userId: user.uid,
        registeredAt: Date.now()
      };
      await setDoc(doc(firestore, 'donors', user.uid), donor);
      setView('DONOR_DASH');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'donors/' + user.uid);
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const results = await searchDonorsInFirestore(searchParams.bloodGroup, searchParams.location);
      setSearchResults(results);
      setView('RESULTS');
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'donors');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddDonation = async (donorId: string, donation: any) => {
    if (!user) return;
    try {
      await addDoc(collection(firestore, 'donations'), {
        ...donation,
        donorId,
        userId: user.uid
      });
      await updateDoc(doc(firestore, 'donors', donorId), { 
        lastDonationDate: donation.date 
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'donations');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-red-100 flex flex-col">
      <AnimatePresence mode="wait">
        
        {/* SPLASH SCREEN */}
        {view === 'SPLASH' && (
          <motion.div 
            key="splash"
          >
            <div className="fixed inset-0 bg-[#C62828] flex flex-col items-center justify-center text-white p-8 overflow-hidden">
               <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-8 relative"
              >
                <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full scale-150 animate-pulse" />
                <Droplet size={120} fill="white" className="text-white relative z-10" />
              </motion.div>
              <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase">{t.appName}</h1>
              <p className="text-red-100 text-center text-sm max-w-xs font-bold uppercase tracking-widest opacity-80 mb-12">
                {t.tagline}
              </p>

              {!isAuthLoading && !user && (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button variant="secondary" onClick={signInWithGoogle} className="gap-3 px-8 w-auto">
                    <LogIn size={20} />
                    {t.signInGoogle}
                  </Button>
                </motion.div>
              )}

              {isAuthLoading && <div className="text-white/40 font-bold text-[10px] uppercase tracking-widest mt-8">VERIFYING CONNECTION...</div>}
            </div>
          </motion.div>
        )}

        {/* HOME DASHBOARD */}
        {view === 'HOME' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 lg:p-6"
          >
            <Header lang={lang} onToggleLang={toggleLang} user={user} />
            
            <main className="grid grid-cols-12 gap-4 flex-1">
              {/* Emergency Banner */}
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="col-span-12 bg-[#C62828] rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-red-100"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-2xl">
                    <AlertCircle className="text-white" size={24} />
                  </div>
                  <div>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{t.activeRequests}</p>
                    <h2 className="text-white font-bold text-base sm:text-lg leading-tight">{t.emergencyHubli}</h2>
                  </div>
                </div>
                <Button variant="secondary" size="sm" className="w-auto px-6 bg-white text-[#C62828] border-none shadow-none">{t.viewAll}</Button>
              </motion.div>

              {/* Find Donor Card */}
              <Card className="col-span-12 md:col-span-6 lg:col-span-5 flex flex-col justify-between p-8 border-slate-200">
                <div>
                  <h3 className="text-2xl font-bold text-[#1A237E] mb-2">{t.findDonor}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6">{t.searchDesc}</p>
                  
                  <div className="grid grid-cols-4 gap-2 mb-8">
                    {BLOOD_GROUPS.slice(0, 4).map(bg => (
                      <div key={bg} className="aspect-square rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-[#C62828]">{bg}</div>
                    ))}
                  </div>
                </div>
                <Button variant="navy" onClick={() => setView('SEARCH')} className="gap-2">
                  <Search size={20} />
                  {t.searchDatabase}
                </Button>
              </Card>

              {/* Status Card */}
              <Card className="col-span-12 md:col-span-6 lg:col-span-7 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-[#1A237E]">{t.donorStatus}</h3>
                  <span className="px-3 py-1 bg-green-50 text-[#2E7D32] text-[10px] font-bold rounded-full border border-green-100">
                    {activeDonor ? "ACTIVE MEMBER" : "GUEST"}
                  </span>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                  {activeDonor ? (
                    <>
                      <div className="w-24 h-24 rounded-full border-4 border-[#2E7D32] border-t-transparent flex items-center justify-center mb-4 relative">
                        <span className="text-4xl font-black text-[#C62828]">{activeDonor.bloodGroup}</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-800">{t.eligible}</p>
                      <p className="text-slate-400 text-sm mt-1">
                        {activeDonor.lastDonationDate 
                          ? `${t.lastDonated} ${checkEligibility(activeDonor.lastDonationDate).daysRemaining === 0 ? 'over 90 days ago' : 'recently'}` 
                          : t.noDonations}
                      </p>
                      <Button variant="success" size="sm" onClick={() => setView('DONOR_DASH')} className="mt-4 w-auto px-6">{t.dashboard}</Button>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <User size={40} className="text-slate-300" />
                      </div>
                      <p className="text-xl font-bold text-slate-800">Become a Donor</p>
                      <p className="text-slate-400 text-sm mt-1 max-w-[200px]">Join our network to help save lives in rural areas.</p>
                      <Button variant="secondary" size="sm" onClick={() => setView('REGISTER')} className="mt-4 w-auto px-6 uppercase">{t.completeRegistration}</Button>
                    </>
                  )}
                </div>

                <div className="mt-auto space-y-3">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <span>Eligibility cooldown</span>
                    <span className="text-[#2E7D32]">90 Days Rule</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn("h-full bg-[#2E7D32] rounded-full", activeDonor ? "w-full" : "w-0")} />
                  </div>
                </div>
              </Card>

              {/* Stats & AI Insights */}
              <div className="col-span-12 lg:col-span-4 space-y-4">
                <div className="bg-[#1A237E] rounded-3xl p-6 text-white shadow-lg overflow-hidden relative">
                  <Droplet className="absolute -right-4 -bottom-4 text-white/5" size={120} />
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-4">{t.impactStats}</p>
                  <div className="space-y-4">
                    <div>
                      <p className="text-3xl font-bold">{stats.total}</p>
                      <p className="text-xs text-white/60">{t.registeredDonors}</p>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div>
                      <p className="text-3xl font-bold">{stats.ready}</p>
                      <p className="text-xs text-white/60">{t.readyForEmergency}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-8 bg-[#E8F5E9] border border-[#2E7D32]/10 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-[#2E7D32] p-1.5 rounded-lg">
                      <span className="text-white text-[10px] font-bold">AI</span>
                    </div>
                    <p className="text-[10px] font-bold text-[#2E7D32] uppercase tracking-wider">{t.geminiGuidance}</p>
                  </div>
                  <p className="text-[#1B5E20] font-bold text-sm leading-snug">
                    "Pre-donation hydration is key. Drink at least 500ml of local fluids like tender coconut or buttermilk."
                  </p>
                </div>
                <Button variant="success" size="sm" onClick={() => setView('AI_HELP')} className="w-auto px-6 whitespace-nowrap">{t.getMoreTips}</Button>
              </div>

              {/* Recent Activity placeholder to match Bento look */}
              <Card className="col-span-12 p-6 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden">
                <div className="flex flex-col gap-1">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.networkActivity}</h4>
                  <p className="text-sm font-bold text-slate-700">{t.recentVolunteer}</p>
                </div>
                <div className="flex -space-x-3 overflow-hidden">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="inline-block h-10 w-10 rounded-2xl ring-4 ring-white bg-slate-100 flex items-center justify-center font-bold text-[#C62828] text-xs">
                      {BLOOD_GROUPS[i]}
                    </div>
                  ))}
                  <div className="flex items-center justify-center h-10 w-14 rounded-2xl ring-4 ring-white bg-slate-100 text-[10px] font-bold text-slate-400">
                    +12
                  </div>
                </div>
              </Card>
            </main>
          </motion.div>
        )}

        {/* REGISTRATION */}
        {view === 'REGISTER' && (
          <motion.div 
            key="register"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col max-w-md mx-auto w-full p-4"
          >
            <Header lang={lang} onToggleLang={toggleLang} user={user} />
            <div className="flex-1 overflow-y-auto px-2 pb-24">
              <button onClick={() => setView('HOME')} className="mb-6 p-2 -ml-2 text-slate-400 flex items-center gap-2 font-bold text-sm">
                <ChevronLeft size={20} /> Back
              </button>
              <h1 className="text-2xl font-bold mb-8 text-[#1A237E]">{t.completeRegistration}</h1>
              
              <form className="space-y-6" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleRegister({
                  name: formData.get('name') as string,
                  phone: formData.get('phone') as string,
                  bloodGroup: formData.get('bloodGroup') as string,
                  location: formData.get('location') as string,
                  village: formData.get('village') as string,
                  lastDonationDate: (formData.get('lastDate') as string) || null,
                  isReadyToDonate: true
                });
              }}>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{t.name}</label>
                  <input name="name" defaultValue="Sinchana" required className="w-full p-4 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold text-slate-800" placeholder="Enter your name" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{t.phone}</label>
                  <input name="phone" type="tel" required className="w-full p-4 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="+91 XXXX XXX XXX" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{t.bloodGroup}</label>
                    <div className="relative">
                      <select name="bloodGroup" required className="w-full p-4 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none appearance-none">
                        {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{t.lastDonationDate}</label>
                    <input name="lastDate" type="date" className="w-full p-4 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{t.location}</label>
                  <input name="location" required className="w-full p-4 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none" placeholder="e.g. Dharwad" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{t.village}</label>
                  <input name="village" required className="w-full p-4 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none" placeholder="e.g. Hebballi" />
                </div>

                <div className="pt-4">
                  <Button type="submit" variant="navy">{t.completeRegistration}</Button>
                  <p className="text-center text-[10px] text-slate-400 mt-4 leading-relaxed font-medium uppercase tracking-wider">
                    {t.privacyNote}
                  </p>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* DONOR DASHBOARD */}
        {view === 'DONOR_DASH' && activeDonor && (
          <motion.div 
            key="donor-dash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col max-w-md mx-auto w-full p-4"
          >
            <Header lang={lang} onToggleLang={toggleLang} user={user} />
            <div className="flex-1 overflow-y-auto px-2 pb-24">
              <button onClick={() => setView('HOME')} className="mb-6 p-2 -ml-2 text-slate-400 flex items-center gap-2 font-bold text-sm">
                <ChevronLeft size={20} /> {t.dashboard}
              </button>
              
              <header className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-[#1A237E]">{activeDonor.name}</h1>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1">
                    <MapPin size={10} /> {activeDonor.village}, {activeDonor.location}
                  </p>
                </div>
                <div className="h-16 w-16 bg-[#C62828] rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-red-100 ring-4 ring-red-50">
                  {activeDonor.bloodGroup}
                </div>
              </header>

              {/* ELIGIBILITY CARD */}
              {(() => {
                const { isEligible, nextDate, daysRemaining } = checkEligibility(activeDonor.lastDonationDate);
                return (
                  <Card className={cn(
                    "mb-8 border-2 transition-all",
                    isEligible ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                  )}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isEligible ? <CheckCircle className="text-[#2E7D32]" /> : <Clock className="text-[#C62828]" />}
                        <span className={cn("font-bold text-lg", isEligible ? "text-[#2E7D32]" : "text-[#C62828]")}>
                          {isEligible ? t.eligible : t.notEligible}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                      {isEligible 
                        ? "You are healthy and eligible! Make sure your 'Ready' status is on for emergencies." 
                        : `You donated recently. Your body is recovering. You will be eligible again in ${daysRemaining} days.`}
                    </p>
                    {!isEligible && nextDate && (
                      <div className="bg-white/50 p-3 rounded-xl inline-block border border-red-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-widest">Next Eligibility</span>
                        <span className="text-slate-800 font-bold">{nextDate.toLocaleDateString()}</span>
                      </div>
                    )}
                  </Card>
                );
              })()}

              <div className="space-y-4 mb-10">
                <Card className="flex items-center justify-between py-5 px-6">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      activeDonor.isReadyToDonate ? "bg-green-100 text-[#2E7D32]" : "bg-slate-100 text-slate-400"
                    )}>
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-[#1A237E]">{t.readyToDonate}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visible in Emergency</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => updateDoc(doc(firestore, 'donors', user!.uid), { isReadyToDonate: !activeDonor.isReadyToDonate })}
                    className={cn(
                      "w-14 h-8 rounded-full transition-all relative p-1",
                      activeDonor.isReadyToDonate ? "bg-[#2E7D32]" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 bg-white rounded-full shadow-md transition-all",
                      activeDonor.isReadyToDonate ? "translate-x-6" : "translate-x-0"
                    )} />
                  </button>
                </Card>

                <Button variant="secondary" className="gap-2" onClick={() => setView('HISTORY')}>
                  <History size={18} />
                  {t.history}
                </Button>
              </div>

              <section>
                <div className="flex items-center gap-2 mb-4 px-1">
                  <div className="bg-[#2E7D32] p-1 rounded-md">
                    <span className="text-white text-[8px] font-bold">AI</span>
                  </div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personal Health Tips</h3>
                </div>
                <AIHealthTips lang={lang} />
              </section>
            </div>
          </motion.div>
        )}

        {/* SEARCH SCREEN */}
        {view === 'SEARCH' && (
          <motion.div 
            key="search"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col max-w-md mx-auto w-full p-4"
          >
            <Header lang={lang} onToggleLang={toggleLang} user={user} />
            <div className="flex-1 overflow-y-auto px-2 pb-24">
              <button onClick={() => setView('HOME')} className="mb-6 p-2 -ml-2 text-slate-400 flex items-center gap-2 font-bold text-sm">
                <ChevronLeft size={20} /> Back
              </button>
              <h1 className="text-2xl font-bold mb-8 text-[#1A237E]">{t.findDonor}</h1>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.bloodGroup}</label>
                  <div className="grid grid-cols-4 gap-2">
                    {BLOOD_GROUPS.map(bg => (
                      <button 
                        key={bg}
                        onClick={() => setSearchParams({ ...searchParams, bloodGroup: bg })}
                        className={cn(
                          "h-14 rounded-2xl font-bold transition-all border",
                          searchParams.bloodGroup === bg 
                            ? "bg-[#C62828] text-white border-[#C62828] scale-105 shadow-lg shadow-red-100" 
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.location}</label>
                  <input 
                    value={searchParams.location}
                    onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                    className="w-full p-4 rounded-2xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium" 
                    placeholder="District or Town" 
                  />
                </div>

                <Button onClick={handleSearch} disabled={!searchParams.bloodGroup || isSearching} variant="navy">
                  <Search size={20} />
                  {isSearching ? '...' : t.searchEligible}
                </Button>

                <Card className="bg-red-50 border-red-100 flex gap-4 p-5">
                  <AlertCircle className="text-[#C62828] flex-shrink-0" />
                  <p className="text-xs text-red-900 font-medium leading-relaxed">
                    {t.onlyReadyShown}
                  </p>
                </Card>
              </div>
            </div>
          </motion.div>
        )}

        {/* SEARCH RESULTS */}
        {view === 'RESULTS' && (
          <motion.div 
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col max-w-md mx-auto w-full p-4"
          >
            <Header lang={lang} onToggleLang={toggleLang} user={user} />
            <div className="flex-1 overflow-y-auto px-2 pb-24">
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setView('SEARCH')} className="p-2 -ml-2 text-slate-400 font-bold hover:text-red-600 transition-colors flex items-center gap-1 text-sm">
                  <ChevronLeft size={20} /> Back to Search
                </button>
              </div>
              <div className="mb-8">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-[#1A237E]">
                  <Droplet className="text-[#C62828]" fill="currentColor" />
                  {searchParams.bloodGroup} {t.potentialSaves}
                </h1>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest px-1 mt-1">{searchParams.location || 'All areas'}</p>
              </div>

              {searchResults.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                  <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="text-slate-200" size={32} />
                  </div>
                  <p className="text-slate-500 font-bold">No eligible donors found.</p>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">Consider expanding your location search or wait for updates.</p>
                  <Button variant="secondary" size="sm" onClick={() => setView('SEARCH')} className="mt-8 w-auto mx-auto px-6">Try again</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">{searchResults.length} Match{searchResults.length > 1 ? 'es' : ''} Identified</p>
                  {searchResults.map(donor => (
                    <Card key={donor.id} className="flex items-center justify-between p-5 border-slate-100 hover:border-red-100 transition-all cursor-pointer">
                      <div>
                        <h3 className="font-bold text-lg text-[#1A237E]">{donor.name}</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <MapPin size={10} /> {donor.village}, {donor.location}
                        </p>
                      </div>
                      <a 
                        href={`tel:${donor.phone}`}
                        className="h-14 w-14 bg-green-50 text-[#2E7D32] rounded-2xl flex items-center justify-center hover:bg-green-100 transition-all shadow-sm border border-green-100"
                      >
                        <Phone size={22} />
                      </a>
                    </Card>
                  ))}
                </div>
              )}

              <div className="mt-12 bg-[#E3F2FD] rounded-3xl p-6 border border-blue-100">
                <div className="flex items-center gap-2 mb-4 px-1">
                  <div className="bg-[#1A237E] p-1 rounded-md">
                    <span className="text-white text-[8px] font-bold">AI</span>
                  </div>
                  <h3 className="text-[10px] font-bold text-[#1A237E] uppercase tracking-widest">Broadcast Tool</h3>
                </div>
                <AIBroadcastGenerator bloodGroup={searchParams.bloodGroup} area={searchParams.location || 'Your Area'} t={t} />
              </div>
            </div>
          </motion.div>
        )}

        {/* HISTORY VIEW */}
        {view === 'HISTORY' && activeDonor && (
          <motion.div 
            key="history"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col max-w-md mx-auto w-full p-4"
          >
            <Header lang={lang} onToggleLang={toggleLang} user={user} />
            <div className="flex-1 overflow-y-auto px-2 pb-24">
              <button onClick={() => setView('DONOR_DASH')} className="mb-6 p-2 -ml-2 text-slate-400 flex items-center gap-2 font-bold text-sm">
                <ChevronLeft size={20} /> Dashboard
              </button>
              <h1 className="text-2xl font-bold mb-8 text-[#1A237E]">{t.historyRecords}</h1>

              <DonationList 
                donorId={activeDonor.userId} 
                onAddDonation={handleAddDonation} 
                lang={lang}
              />
            </div>
          </motion.div>
        )}

        {/* AI FAQ ASSISTANT */}
        {view === 'AI_HELP' && (
          <motion.div 
            key="ai-help"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col max-w-md mx-auto w-full p-4"
          >
            <Header lang={lang} onToggleLang={toggleLang} user={user} />
            <div className="flex-1 overflow-y-auto px-2 pb-24">
              <button onClick={() => setView('HOME')} className="mb-6 p-2 -ml-2 text-slate-400 flex items-center gap-2 font-bold text-sm">
                <ChevronLeft size={20} /> Dashboard
              </button>
              <h1 className="text-2xl font-bold mb-6 text-[#1A237E]">AI Assistant</h1>
              <AIAssistant lang={lang} />
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* GLOBAL FOOTER (Only when not in splash) */}
      {view !== 'SPLASH' && (
        <footer className="footer bg-white border-t border-slate-200 px-6 sm:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 z-50">
          <div className="flex gap-6 sm:gap-8">
            <button 
              onClick={() => setView('HOME')} 
              className={cn("text-sm font-bold transition-all flex items-center gap-2", view === 'HOME' ? "text-[#C62828]" : "text-slate-400 hover:text-slate-600")}
            >
              <div className={cn("w-2 h-2 rounded-full", view === 'HOME' ? "bg-[#C62828]" : "bg-transparent")} />
              {t.dashboard}
            </button>
            <button 
              onClick={() => activeDonor && setView('HISTORY')} 
              className={cn("text-sm font-bold transition-all", view === 'HISTORY' ? "text-[#C62828]" : "text-slate-400 hover:text-slate-600 disabled:opacity-30")}
              disabled={!activeDonor}
            >
              {t.history}
            </button>
            <button 
              onClick={() => setView('AI_HELP')} 
              className={cn("text-sm font-bold transition-all", view === 'AI_HELP' ? "text-[#C62828]" : "text-slate-400 hover:text-slate-600")}
            >
              {t.privacy}
            </button>
          </div>
          <div className="px-5 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black tracking-widest hover:bg-black transition-colors cursor-pointer">
            {t.emergencySos}
          </div>
        </footer>
      )}
    </div>
  );
}

// SUB-COMPONENTS (AI FEATURES)

function DonationList({ donorId, onAddDonation, lang }: { donorId: string, onAddDonation: any, lang: Language }) {
  const [donations, setDonations] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const t = translations[lang];

  useEffect(() => {
    const q = query(
      collection(firestore, 'donations'), 
      where('donorId', '==', donorId),
      orderBy('date', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setDonations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'donations'));
  }, [donorId]);

  return (
    <div className="space-y-6">
      <Button variant="secondary" onClick={() => setShowAdd(!showAdd)} className="border-dashed gap-2">
        <Plus size={20} /> {t.recordNew}
      </Button>

      {showAdd && (
        <Card className="bg-slate-50 animate-in fade-in slide-in-from-top-2 p-5">
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            onAddDonation(donorId, {
              date: fd.get('date'),
              hospital: fd.get('hospital'),
              units: Number(fd.get('units'))
            });
            setShowAdd(false);
          }}>
            <input name="date" type="date" required className="w-full p-3 rounded-xl border border-slate-200 outline-none" />
            <input name="hospital" placeholder={t.hospitalName} required className="w-full p-3 rounded-xl border border-slate-200 outline-none" />
            <input name="units" type="number" placeholder={t.units} required className="w-full p-3 rounded-xl border border-slate-200 outline-none" />
            <Button type="submit" size="sm" variant="navy">{t.saveDonation}</Button>
          </form>
        </Card>
      )}

      {donations.length === 0 ? (
        <div className="text-center py-10 opacity-40">
          <History size={48} className="mx-auto mb-4" />
          <p>{t.noDonations}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {donations.map(d => (
            <div key={d.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
              <div className="h-12 w-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600 font-bold shrink-0">
                {d.units}U
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold truncate text-[#1A237E]">{d.hospital}</h4>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{new Date(d.date).toLocaleDateString()}</p>
              </div>
              <CheckCircle size={20} className="text-green-500" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AIHealthTips({ lang }: { lang: Language }) {
  const [tips, setTips] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ai/guidance', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang })
    })
      .then(res => res.json())
      .then(data => {
        setTips(data.text);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lang]);

  if (loading) return <div className="h-32 bg-slate-100 rounded-3xl animate-pulse" />;

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 italic text-slate-600 text-sm leading-relaxed prose prose-sm whitespace-pre-line shadow-sm">
      {tips}
    </div>
  );
}

function AIBroadcastGenerator({ bloodGroup, area, t }: { bloodGroup: string, area: string, t: any }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/emergency-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bloodGroup, hospital: 'Local Hospital', area })
      });
      const data = await res.json();
      setMessage(data.text);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button 
        onClick={generate}
        disabled={loading}
        className="w-full py-4 px-6 rounded-2xl border-2 border-dashed border-[#1A237E]/20 text-[#1A237E] font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
      >
        {loading ? "..." : t.generateBroadcast}
      </button>
      {message && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl text-[10px] font-mono relative group leading-relaxed">
          {message}
          <button 
            onClick={() => navigator.clipboard.writeText(message)}
            className="absolute top-2 right-2 p-1.5 bg-slate-800 rounded-lg text-[8px] hover:bg-slate-700 font-bold uppercase tracking-widest"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}

function AIAssistant({ lang }: { lang: Language }) {
  const [queryText, setQueryText] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const t = translations[lang];

  const ask = async (textToAsk?: string) => {
    const activeQuery = textToAsk || queryText;
    if (!activeQuery) return;
    setLoading(true);
    setAnswer('');
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: activeQuery, language: lang })
      });
      const data = await res.json();
      setAnswer(data.text);
    } catch (e) {
      setAnswer("Sorry, I am having trouble connecting right now.");
    } finally {
      setLoading(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'kn' ? 'kn-IN' : 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQueryText(transcript);
      ask(transcript);
    };

    recognition.start();
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input 
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder={t.safetyAsk} 
            className="w-full p-4 pr-12 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all"
            onKeyDown={(e) => e.key === 'Enter' && ask()}
          />
          <button 
            onClick={toggleListening}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all",
              isListening ? "text-red-500 bg-red-50 animate-pulse" : "text-slate-400 hover:bg-slate-50"
            )}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        </div>
        <button onClick={() => ask()} className="bg-[#1A237E] text-white p-4 rounded-2xl shadow-lg hover:bg-blue-900 transition-all active:scale-95">
          <MessageSquare size={24} />
        </button>
      </div>
      {loading && <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl animate-pulse text-xs font-bold text-slate-400 tracking-widest uppercase">Thinking...</div>}
      {answer && (
        <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm text-slate-700 leading-relaxed text-sm whitespace-pre-line italic">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-[#C62828] rounded-full" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assistant Response</span>
          </div>
          {answer}
        </div>
      )}
    </div>
  );
}
