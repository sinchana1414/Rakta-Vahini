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
  AlertCircle
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Donor, type Donation } from './lib/db';
import { checkEligibility, BLOOD_GROUPS, WAIT_PERIOD_DAYS } from './lib/eligibility';
import { getDonorStats, searchDonors } from './lib/repository';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// DATA REPO WRAPPERS & UTILS
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// SHARED UI COMPONENTS
const Button = ({ children, onClick, variant = 'primary', className, disabled, type = 'button' }: any) => {
  const variants: any = {
    primary: "bg-[#C62828] text-white hover:bg-[#B71C1C] shadow-lg shadow-red-100",
    secondary: "bg-white text-[#1A237E] border border-slate-200 hover:bg-slate-50 shadow-sm",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100",
    success: "bg-[#2E7D32] text-white hover:bg-[#1B5E20] shadow-lg shadow-green-100",
    navy: "bg-[#1A237E] text-white hover:bg-[#0D147A] shadow-lg shadow-blue-100"
  };
  return (
    <button 
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-full py-4 px-6 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2",
        variants[variant],
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

const Header = () => (
  <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 mb-6 lg:rounded-3xl lg:mt-4 lg:mx-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-[#C62828] rounded-xl flex items-center justify-center text-white shadow-lg">
        <Droplet size={24} fill="white" />
      </div>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#1A237E]">Rakta-Vahini</h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rural Blood Network</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-bold text-[#2E7D32]">● SYSTEM ONLINE</span>
        <span className="text-[10px] text-slate-400">Dharwad, KA</span>
      </div>
    </div>
  </header>
);

// TYPES
type View = 'SPLASH' | 'HOME' | 'REGISTER' | 'DONOR_DASH' | 'SEARCH' | 'RESULTS' | 'HISTORY' | 'AI_HELP';

export default function App() {
  const [view, setView] = useState<View>('SPLASH');
  const [activeDonorId, setActiveDonorId] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useState({ bloodGroup: '', location: '' });
  const [searchResults, setSearchResults] = useState<Donor[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // DATA
  const activeDonor = useLiveQuery(
    () => activeDonorId ? db.donors.get(activeDonorId) : undefined,
    [activeDonorId]
  );
  
  const stats = useLiveQuery(getDonorStats, []);

  // INIT
  useEffect(() => {
    const timer = setTimeout(() => {
      // Check if user already registered (for demo, we'll just go to home)
      setView('HOME');
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // HANDLERS
  const handleRegister = async (donor: Omit<Donor, 'id' | 'registeredAt'>) => {
    const id = await db.donors.add({
      ...donor,
      registeredAt: Date.now()
    });
    setActiveDonorId(id);
    setView('DONOR_DASH');
  };

  const handleSearch = async () => {
    setIsSearching(true);
    const results = await searchDonors(searchParams.bloodGroup, searchParams.location);
    setSearchResults(results);
    setIsSearching(false);
    setView('RESULTS');
  };

  const handleAddDonation = async (donorId: number, donation: Omit<Donation, 'id' | 'donorId'>) => {
    await db.donations.add({ ...donation, donorId });
    await db.donors.update(donorId, { lastDonationDate: donation.date });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-red-100 flex flex-col">
      <AnimatePresence mode="wait">
        
        {/* SPLASH SCREEN */}
        {view === 'SPLASH' && (
          <motion.div 
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#C62828] flex flex-col items-center justify-center text-white p-8"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-8"
            >
              <Droplet size={120} fill="white" className="text-white" />
            </motion.div>
            <h1 className="text-4xl font-bold mb-2 tracking-tight">Rakta-Vahini</h1>
            <p className="text-red-100 text-center text-lg max-w-xs font-medium">
              Connecting the right donor to the right patient.
            </p>
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
            <Header />
            
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
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Active Requests</p>
                    <h2 className="text-white font-bold text-base sm:text-lg leading-tight">Emergency blood requirement at Civil Hospital Hubli</h2>
                  </div>
                </div>
                <Button variant="secondary" className="w-auto py-2 px-6 h-auto text-xs bg-white text-[#C62828] border-none shadow-none">VIEW ALL</Button>
              </motion.div>

              {/* Find Donor Card */}
              <Card className="col-span-12 md:col-span-6 lg:col-span-5 flex flex-col justify-between p-8 border-slate-200">
                <div>
                  <h3 className="text-2xl font-bold text-[#1A237E] mb-2">Find a Donor</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6">Search for eligible matches in your local community.</p>
                  
                  <div className="grid grid-cols-4 gap-2 mb-8">
                    {BLOOD_GROUPS.slice(0, 4).map(bg => (
                      <div key={bg} className="aspect-square rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-[#C62828]">{bg}</div>
                    ))}
                  </div>
                </div>
                <Button variant="navy" onClick={() => setView('SEARCH')} className="gap-2">
                  <Search size={20} />
                  Search Database
                </Button>
              </Card>

              {/* Status Card */}
              <Card className="col-span-12 md:col-span-6 lg:col-span-7 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-[#1A237E]">Donor Status</h3>
                  <span className="px-3 py-1 bg-green-50 text-[#2E7D32] text-[10px] font-bold rounded-full border border-green-100">
                    {activeDonorId ? "ACTIVE MEMBER" : "GUEST"}
                  </span>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                  {activeDonor ? (
                    <>
                      <div className="w-24 h-24 rounded-full border-4 border-[#2E7D32] border-t-transparent flex items-center justify-center mb-4 relative">
                        <span className="text-4xl font-black text-[#C62828]">{activeDonor.bloodGroup}</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-800">You are Eligible</p>
                      <p className="text-slate-400 text-sm mt-1">
                        {activeDonor.lastDonationDate 
                          ? `Last donated ${checkEligibility(activeDonor.lastDonationDate).daysRemaining === 0 ? 'over 90 days ago' : 'recently'}` 
                          : 'No donations recorded'}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <User size={40} className="text-slate-300" />
                      </div>
                      <p className="text-xl font-bold text-slate-800">Become a Donor</p>
                      <p className="text-slate-400 text-sm mt-1 max-w-[200px]">Join our network to help save lives in rural areas.</p>
                      <Button variant="secondary" onClick={() => setView('REGISTER')} className="mt-4 py-2 px-6 w-auto h-auto text-xs">REGISTER NOW</Button>
                    </>
                  )}
                </div>

                <div className="mt-auto space-y-3">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <span>Eligibility cooldown</span>
                    <span className="text-[#2E7D32]">90 Days Rule</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-[#2E7D32] rounded-full" />
                  </div>
                </div>
              </Card>

              {/* Stats & AI Insights */}
              <div className="col-span-12 lg:col-span-4 space-y-4">
                <div className="bg-[#1A237E] rounded-3xl p-6 text-white shadow-lg overflow-hidden relative">
                  <Droplet className="absolute -right-4 -bottom-4 text-white/5" size={120} />
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-4">Impact Stats</p>
                  <div className="space-y-4">
                    <div>
                      <p className="text-3xl font-bold">{stats?.total || 0}</p>
                      <p className="text-xs text-white/60">Registered Local Donors</p>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div>
                      <p className="text-3xl font-bold">{stats?.ready || 0}</p>
                      <p className="text-xs text-white/60">Donors Ready for Emergency</p>
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
                    <p className="text-[10px] font-bold text-[#2E7D32] uppercase tracking-wider">Gemini Guidance</p>
                  </div>
                  <p className="text-[#1B5E20] font-bold text-sm leading-snug">
                    "Pre-donation hydration is key. Drink at least 500ml of local fluids like tender coconut or buttermilk."
                  </p>
                </div>
                <Button variant="success" onClick={() => setView('AI_HELP')} className="w-auto h-auto py-3 px-6 text-xs whitespace-nowrap">GET MORE TIPS</Button>
              </div>

              {/* Recent Activity placeholder to match Bento look */}
              <Card className="col-span-12 p-6 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden">
                <div className="flex flex-col gap-1">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Network Activity</h4>
                  <p className="text-sm font-bold text-slate-700">Recent volunteer contributions in Dharwad</p>
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
            <Header />
            <div className="flex-1 overflow-y-auto px-2 pb-24">
              <button onClick={() => setView('HOME')} className="mb-6 p-2 -ml-2 text-slate-400 flex items-center gap-2 font-bold text-sm">
                <ChevronLeft size={20} /> Back
              </button>
              <h1 className="text-2xl font-bold mb-8 text-[#1A237E]">Donor Registration</h1>
              
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
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                  <input name="name" required className="w-full p-4 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="Enter your name" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                  <input name="phone" type="tel" required className="w-full p-4 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="+91 XXXX XXX XXX" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Blood Group</label>
                    <select name="bloodGroup" required className="w-full p-4 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none appearance-none">
                      {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Last Donation</label>
                    <input name="lastDate" type="date" className="w-full p-4 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Location (District/Town)</label>
                  <input name="location" required className="w-full p-4 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none" placeholder="e.g. Dharwad" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Village/Area</label>
                  <input name="village" required className="w-full p-4 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none" placeholder="e.g. Hebballi" />
                </div>

                <div className="pt-4">
                  <Button type="submit" variant="navy">Complete Registration</Button>
                  <p className="text-center text-[10px] text-slate-400 mt-4 leading-relaxed font-medium uppercase tracking-wider">
                    Privacy Focused • Rural Emergency Network
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
            <Header />
            <div className="flex-1 overflow-y-auto px-2 pb-24">
              <button onClick={() => setView('HOME')} className="mb-6 p-2 -ml-2 text-slate-400 flex items-center gap-2 font-bold text-sm">
                <ChevronLeft size={20} /> Dashboard
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
                          {isEligible ? "Eligible to Donate" : "Wait Period Active"}
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
                      <p className="font-bold text-[#1A237E]">Ready to Donate</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visible in Emergency</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => db.donors.update(activeDonor.id!, { isReadyToDonate: !activeDonor.isReadyToDonate })}
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
                  View Donation History
                </Button>
              </div>

              <section>
                <div className="flex items-center gap-2 mb-4 px-1">
                  <div className="bg-[#2E7D32] p-1 rounded-md">
                    <span className="text-white text-[8px] font-bold">AI</span>
                  </div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personal Health Tips</h3>
                </div>
                <AIHealthTips />
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
            <Header />
            <div className="flex-1 overflow-y-auto px-2 pb-24">
              <button onClick={() => setView('HOME')} className="mb-6 p-2 -ml-2 text-slate-400 flex items-center gap-2 font-bold text-sm">
                <ChevronLeft size={20} /> Back
              </button>
              <h1 className="text-2xl font-bold mb-8 text-[#1A237E]">Emergency Search</h1>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Select Blood Group</label>
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Location Filter (Optional)</label>
                  <input 
                    value={searchParams.location}
                    onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                    className="w-full p-4 rounded-2xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium" 
                    placeholder="District or Town" 
                  />
                </div>

                <Button onClick={handleSearch} disabled={!searchParams.bloodGroup} variant="navy">
                  <Search size={20} />
                  Find Eligible Donors
                </Button>

                <Card className="bg-red-50 border-red-100 flex gap-4 p-5">
                  <AlertCircle className="text-[#C62828] flex-shrink-0" />
                  <p className="text-xs text-red-900 font-medium leading-relaxed">
                    Only <strong>Eligible</strong> and <strong>Ready</strong> donors are shown. Donors are ineligible for 90 days after each donation.
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
            <Header />
            <div className="flex-1 overflow-y-auto px-2 pb-24">
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setView('SEARCH')} className="p-2 -ml-2 text-slate-400 font-bold hover:text-red-600 transition-colors flex items-center gap-1 text-sm">
                  <ChevronLeft size={20} /> Back to Search
                </button>
              </div>
              <div className="mb-8">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-[#1A237E]">
                  <Droplet className="text-[#C62828]" fill="currentColor" />
                  {searchParams.bloodGroup} Eligible Donors
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
                  <Button variant="secondary" onClick={() => setView('SEARCH')} className="mt-8 py-3 w-auto mx-auto px-6 h-auto text-xs">Try again</Button>
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
                <AIBroadcastGenerator bloodGroup={searchParams.bloodGroup} area={searchParams.location || 'Your Area'} />
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
            <Header />
            <div className="flex-1 overflow-y-auto px-2 pb-24">
              <button onClick={() => setView('DONOR_DASH')} className="mb-6 p-2 -ml-2 text-slate-400 flex items-center gap-2 font-bold text-sm">
                <ChevronLeft size={20} /> Dashboard
              </button>
              <h1 className="text-2xl font-bold mb-8 text-[#1A237E]">Donation Records</h1>

              <DonationList donorId={activeDonor.id!} onAddDonation={handleAddDonation} />
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
            <Header />
            <div className="flex-1 overflow-y-auto px-2 pb-24">
              <button onClick={() => setView('HOME')} className="mb-6 p-2 -ml-2 text-slate-400 flex items-center gap-2 font-bold text-sm">
                <ChevronLeft size={20} /> Dashboard
              </button>
              <h1 className="text-2xl font-bold mb-6 text-[#1A237E]">AI Assistant</h1>
              <AIAssistant />
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
              Dashboard
            </button>
            <button 
              onClick={() => activeDonorId && setView('HISTORY')} 
              className={cn("text-sm font-bold transition-all", view === 'HISTORY' ? "text-[#C62828]" : "text-slate-400 hover:text-slate-600 disabled:opacity-30")}
              disabled={!activeDonorId}
            >
              History
            </button>
            <button 
              onClick={() => setView('AI_HELP')} 
              className={cn("text-sm font-bold transition-all", view === 'AI_HELP' ? "text-[#C62828]" : "text-slate-400 hover:text-slate-600")}
            >
              Privacy
            </button>
          </div>
          <div className="px-5 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black tracking-widest hover:bg-black transition-colors cursor-pointer">
            EMERGENCY SOS: 112
          </div>
        </footer>
      )}
    </div>
  );
}

// SUB-COMPONENTS (AI FEATURES)

function DonationList({ donorId, onAddDonation }: { donorId: number, onAddDonation: any }) {
  const donations = useLiveQuery(() => db.donations.where('donorId').equals(donorId).reverse().sortBy('date'), [donorId]);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-6">
      <Button variant="secondary" onClick={() => setShowAdd(!showAdd)} className="border-dashed gap-2">
        <Plus size={20} /> Record New Donation
      </Button>

      {showAdd && (
        <Card className="bg-slate-50 animate-in fade-in slide-in-from-top-2">
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
            <input name="hospital" placeholder="Hospital Name" required className="w-full p-3 rounded-xl border border-slate-200 outline-none" />
            <input name="units" type="number" placeholder="Units (e.g. 1)" required className="w-full p-3 rounded-xl border border-slate-200 outline-none" />
            <Button type="submit" size="sm">Save Donation</Button>
          </form>
        </Card>
      )}

      {donations?.length === 0 ? (
        <div className="text-center py-10 opacity-40">
          <History size={48} className="mx-auto mb-4" />
          <p>No donations recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {donations?.map(d => (
            <div key={d.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
              <div className="h-12 w-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600 font-bold shrink-0">
                {d.units}U
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold truncate">{d.hospital}</h4>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{new Date(d.date).toLocaleDateString()}</p>
              </div>
              <CheckCircle size={20} className="text-green-500" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AIHealthTips() {
  const [tips, setTips] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ai/guidance', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setTips(data.text);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-32 bg-slate-100 rounded-3xl animate-pulse" />;

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 italic text-slate-600 text-sm leading-relaxed prose prose-sm whitespace-pre-line">
      {tips}
    </div>
  );
}

function AIBroadcastGenerator({ bloodGroup, area }: { bloodGroup: string, area: string }) {
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
        className="w-full py-4 px-6 rounded-2xl border-2 border-dashed border-red-200 text-red-600 font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
      >
        {loading ? "Generating..." : "Generate WhatsApp Request"}
      </button>
      {message && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl text-sm font-mono relative group">
          {message}
          <button 
            onClick={() => navigator.clipboard.writeText(message)}
            className="absolute top-2 right-2 p-2 bg-slate-800 rounded-lg text-xs hover:bg-slate-700"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}

function AIAssistant() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!query) return;
    setLoading(true);
    setAnswer('');
    try {
      // For this simple FAQ, we use the explain-eligibility endpoint as a proxy for the prompt
      const res = await fetch('/api/ai/explain-eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'User', lastDonationDate: 'N/A' })
      });
      const data = await res.json();
      setAnswer(data.text);
    } catch (e) {
      setAnswer("Sorry, I'm having trouble connecting right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <input 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about donation safety..." 
          className="flex-1 p-4 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
        />
        <button onClick={ask} className="bg-red-600 text-white p-4 rounded-2xl shadow-lg">
          <MessageSquare size={24} />
        </button>
      </div>
      {loading && <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl animate-pulse">Thinking...</div>}
      {answer && (
        <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm text-slate-700 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}
