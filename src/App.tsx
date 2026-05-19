/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, createContext, useContext } from 'react';
import { 
  Menu, X, ChevronRight, GraduationCap, Wrench, Flame, 
  Droplets, Scissors, Palette, MapPin, Phone, Mail, 
  Instagram, Facebook, Twitter, Upload, CheckCircle2,
  Lock, ArrowRight, BookOpen, LogOut, Trash2, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged,
  OperationType, handleFirestoreError 
} from './lib/firebase';
import { 
  collection, addDoc, getDocs, query, orderBy, 
  onSnapshot, doc, updateDoc, deleteDoc, where 
} from 'firebase/firestore';
import { cn } from './lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';

// --- Types ---
interface Program {
  id: string;
  name: string;
  description: string;
  icon: any;
  fee: string;
  duration: string;
  color: string;
  imageUrl?: string;
}

interface Application {
  id?: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  phoneNumber: string;
  email: string;
  address: string;
  programId: string;
  programName?: string;
  fee?: string;
  submittedAt: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
}

// --- Auth Context ---
interface AuthContextType {
  user: any;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, isAdmin: false, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      // Logic for admin: bootstrapped email or in collection
      if (u) {
        const adminEmail = 'siphes9812@gmail.com'; // Bootstrap admin
        if (u.email === adminEmail) {
          setIsAdmin(true);
        } else {
          // Check collection
          getDocs(query(collection(db, 'admins'), where('email', '==', u.email)))
            .then(snap => setIsAdmin(!snap.empty))
            .catch(() => setIsAdmin(false));
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

interface GalleryItem {
  id: number;
  category: 'All' | 'Graduation' | 'Campus' | 'Students';
  title: string;
  imageUrl: string;
}

// --- Icon Helper ---
const ICON_MAP: Record<string, any> = {
  'BookOpen': BookOpen,
  'Wrench': Wrench,
  'Flame': Flame,
  'Droplets': Droplets,
  'Palette': Palette,
  'Scissors': Scissors,
  'GraduationCap': GraduationCap,
};

const getIcon = (name: string) => ICON_MAP[name] || BookOpen;

// --- Data ---
const DEFAULT_PROGRAMS: Program[] = [
  { id: 'medicine', name: 'African Medicine', description: 'Honoring Roots, Healing Naturally. Comprehensive study of traditional herbs and ancestral healing.', icon: BookOpen, fee: 'R3500', duration: '6 months', color: 'bg-green-100 text-green-700' },
  { id: 'plumbing', name: 'Basic Plumbing', description: 'Train Today, Fix Tomorrow. Master residential plumbing systems and maintenance.', icon: Wrench, fee: 'R2100', duration: '3 months', color: 'bg-blue-100 text-blue-700' },
  { id: 'welding', name: 'Welding', description: 'Metalwork certification course covering arc welding and industrial safety.', icon: Flame, fee: 'R2100', duration: '6 months', color: 'bg-gray-100 text-gray-700' },
  { id: 'soap', name: 'Soap Making', description: '2-month artisanal production course. Learn formulation and scaleable production.', icon: Droplets, fee: 'R2100', duration: '2 months', color: 'bg-orange-100 text-orange-700' },
  { id: 'candle', name: 'Candle Making', description: 'Creative candle design course. Wax techniques, scents, and decorative arts.', icon: Palette, fee: 'R2100', duration: '2 months', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'sewing', name: 'Sewing', description: '3-month garment construction. From basic stitching to professional design.', icon: Scissors, fee: 'R2100', duration: '3 months', color: 'bg-pink-100 text-pink-700' },
];

const DEFAULT_GALLERY: GalleryItem[] = [
  { id: 1, category: 'Graduation', title: 'Graduation Ceremony', imageUrl: 'https://images.unsplash.com/photo-1523050338692-7b83b907feee?auto=format&fit=crop&q=80&w=800' },
  { id: 2, category: 'Campus', title: 'Our Campus Entrance', imageUrl: 'https://images.unsplash.com/photo-1541339906194-e1620a992ad5?auto=format&fit=crop&q=80&w=800' },
  { id: 3, category: 'Students', title: 'Practical Workshop', imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800' },
  { id: 4, category: 'Graduation', title: 'Ceremony Celebration', imageUrl: 'https://images.unsplash.com/photo-1525921429624-479b6a294a48?auto=format&fit=crop&q=80&w=800' },
  { id: 5, category: 'Campus', title: 'Study Area', imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=800' },
  { id: 6, category: 'Students', title: 'Group Photo', imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800' },
  { id: 7, category: 'Graduation', title: 'Graduation Moment', imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=800' },
  { id: 8, category: 'Students', title: 'Hands-on Learning', imageUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&q=80&w=800' },
];

// --- Components ---

const Navbar = ({ onAdminClick }: { onAdminClick: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAdmin, loading } = useContext(AuthContext);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const menuItems = [
    { name: 'Home', href: '#home' },
    { name: 'About', href: '#about' },
    { name: 'Programs', href: '#programs' },
    { name: 'Gallery', href: '#gallery' },
    { name: 'Fees', href: '#fees' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'glass-nav py-3' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-accent font-bold text-xl uppercase">
              S
            </div>
            <div className="hidden sm:block">
              <span className="block font-sans font-bold text-lg tracking-tight text-primary">SSAMC</span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <a key={item.name} href={item.href} className="text-sm font-semibold text-gray-700 hover:text-primary transition-colors uppercase tracking-wider">
                {item.name}
              </a>
            ))}
            <a href="#apply" className="btn-primary py-2 px-5 text-sm uppercase tracking-wide">Apply Now</a>
            
            {loading ? (
              <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            ) : user ? (
              <div className="flex items-center gap-4">
                {isAdmin && (
                  <button 
                    onClick={onAdminClick}
                    className="flex items-center gap-1 text-primary hover:text-secondary transition-colors text-xs font-bold uppercase"
                  >
                    <Lock size={14} /> Dashboard
                  </button>
                )}
                <div className="flex items-center gap-2 group relative">
                  <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border border-primary/20" />
                  <button onClick={handleLogout} className="absolute top-10 right-0 bg-white shadow-xl rounded-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex items-center gap-2 text-xs font-bold text-red-500 whitespace-nowrap">
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors text-xs font-bold uppercase"
              >
                <Lock size={14} /> Admin Login
              </button>
            )}
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-700 p-2">
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {menuItems.map((item) => (
                <a 
                  key={item.name} 
                  href={item.href} 
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-3 text-base font-semibold text-gray-700 hover:bg-accent rounded-lg"
                >
                  {item.name}
                </a>
              ))}
              <a href="#apply" onClick={() => setIsOpen(false)} className="block w-full text-center btn-primary py-3">Apply Now</a>
              
              {user ? (
                <div className="space-y-2 pt-4">
                  {isAdmin && (
                    <button 
                      onClick={() => { setIsOpen(false); onAdminClick(); }}
                      className="w-full flex items-center justify-center gap-2 p-3 text-primary font-bold uppercase text-xs"
                    >
                      <Lock size={14} /> Dashboard
                    </button>
                  )}
                  <button 
                    onClick={() => { setIsOpen(false); handleLogout(); }}
                    className="w-full flex items-center justify-center gap-2 p-3 text-red-500 font-bold uppercase text-xs"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => { setIsOpen(false); handleLogin(); }}
                  className="w-full flex items-center justify-center gap-2 p-3 text-gray-500 font-bold uppercase text-xs"
                >
                  <Lock size={14} /> Admin Login
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-accent via-accent/80 to-transparent z-10" />
        <img 
          src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=1920" 
          alt="African Education" 
          className="w-full h-full object-cover"
        />
      </div>

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl"
        >
          <span className="inline-block px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm font-bold uppercase tracking-widest mb-6">
            Welcome to SSAMC
          </span>
          <h1 className="text-6xl md:text-8xl mb-8 leading-[1.05] tracking-tight">
            Empowering <br />
            <span className="italic font-light text-primary">Communities</span> <br />
            Through Education
          </h1>
          <p className="text-lg md:text-xl text-primary/70 mb-10 leading-relaxed max-w-xl">
            Traditional medicine and modern vocational training for a brighter African future. Rooted in ancestral knowledge, sensitive to human progress.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="#apply" className="btn-secondary px-10 py-5 text-lg shadow-xl shadow-secondary/20">
              Enroll Now
            </a>
            <a href="#about" className="px-10 py-5 rounded-full border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-all text-center">
              Our Mission
            </a>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 hidden md:block">
        <motion.div 
          animate={{ y: [0, 10, 0] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center pt-2"
        >
          <div className="w-1 h-2 bg-gray-400 rounded-full" />
        </motion.div>
      </div>
    </section>
  );
};

const About = () => {
  return (
    <section id="about" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-secondary/5 rounded-full blur-3xl" />
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <motion.img 
                  whileHover={{ scale: 1.05 }}
                  src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600" 
                  alt="Herbal Medicine" 
                  className="rounded-[2.5rem] shadow-2xl w-full aspect-[4/5] object-cover mt-12 border-8 border-white"
                />
                <motion.img 
                  whileHover={{ scale: 1.05 }}
                  src="https://images.unsplash.com/photo-1504917595217-d4dc5f6497d8?auto=format&fit=crop&q=80&w=600" 
                  alt="Crafting" 
                  className="rounded-[2.5rem] shadow-2xl w-full aspect-[4/5] object-cover border-8 border-white"
                />
              </div>
            </div>

            <div className="space-y-12">
              <div className="space-y-6">
                <h2 className="text-5xl leading-tight">Rooted in Tradition, <br /><span className="italic font-light">Focused on Future.</span></h2>
                <p className="text-body/70 leading-relaxed text-lg font-sans">
                  Sakhokuhle School of African Medicine and Crafting provides highly flexible programs geared towards equipping and empowering African Health Practitioners who will change the world.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 font-sans">
                <div className="p-10 bg-white rounded-[3rem] border border-primary/5 shadow-sm">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
                    <GraduationCap size={24} />
                  </div>
                  <h3 className="text-xl mb-4 font-bold font-sans uppercase tracking-tight text-primary">Our Mission</h3>
                  <p className="text-body/60 text-sm leading-relaxed">
                    Equipping African Health Practitioners with flexible, ancestral knowledge-based programs to foster community change.
                  </p>
                </div>

                <div className="p-10 bg-primary text-accent rounded-[3rem] shadow-xl shadow-primary/20">
                  <div className="w-12 h-12 bg-white/20 text-white rounded-2xl flex items-center justify-center mb-6">
                    <Palette size={24} />
                  </div>
                  <h3 className="text-xl mb-4 font-bold font-sans uppercase tracking-tight text-accent">Our Vision</h3>
                  <p className="text-accent/60 text-sm leading-relaxed">
                    To be an international center for excellence, sensitive to the challenges of human progress.
                  </p>
                </div>
              </div>
            </div>
          </div>
      </div>
    </section>
  );
};

const Programs = ({ programs }: { programs: Program[] }) => {
  return (
    <section id="programs" className="py-24 bg-accent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl mb-6">Our Specialized Programs</h2>
          <p className="text-gray-600">Comprehensive training programs designed to empower you with practical skills and ancestral knowledge.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {programs.map((program, idx) => (
            <motion.div 
              key={program.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className={`group/card relative p-10 rounded-[2.5rem] card-hover border border-primary/5 shadow-sm overflow-hidden ${idx === 1 ? 'bg-primary text-accent' : 'bg-white'}`}
            >
              {program.imageUrl && (
                <div className="absolute inset-0 z-0">
                  <img src={program.imageUrl} alt={program.name} className="w-full h-full object-cover opacity-10 grayscale group-hover/card:scale-110 transition-transform duration-700" />
                  <div className={`absolute inset-0 ${idx === 1 ? 'bg-primary/80' : 'bg-white/80'}`} />
                </div>
              )}
              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${idx === 1 ? 'bg-white/20 text-white' : program.color}`}>
                  {React.createElement(program.icon || BookOpen, { size: 28 })}
                </div>
                <h3 className={`text-2xl mb-4 ${idx === 1 ? 'text-accent' : ''}`}>{program.name}</h3>
                <p className={`text-sm mb-6 leading-relaxed ${idx === 1 ? 'text-accent/60' : 'text-body/60'}`}>
                  {program.description}
                </p>
                <div className={`flex justify-between items-center py-4 border-t ${idx === 1 ? 'border-white/10' : 'border-primary/5'}`}>
                  <div>
                    <span className={`block text-xs uppercase font-bold mb-1 ${idx === 1 ? 'text-accent/40' : 'text-primary/40'}`}>Duration</span>
                    <span className="font-bold">{program.duration}</span>
                  </div>
                  <div className="text-right">
                    <span className={`block text-xs uppercase font-bold mb-1 ${idx === 1 ? 'text-accent/40' : 'text-primary/40'}`}>Fees</span>
                    <span className={`font-bold font-display text-xl ${idx === 1 ? 'text-secondary' : 'text-primary'}`}>{program.fee}</span>
                  </div>
                </div>
                <a href="#apply" className={`mt-6 w-full flex items-center justify-center gap-2 group font-bold transition-colors ${idx === 1 ? 'text-accent hover:text-secondary' : 'text-primary hover:text-secondary'}`}>
                  Apply Online <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Gallery = ({ galleryImages }: { galleryImages: GalleryItem[] }) => {
  const [filter, setFilter] = useState<'All' | 'Graduation' | 'Campus' | 'Students'>('All');
  
  const filteredImages = useMemo(() => {
    return filter === 'All' ? galleryImages : galleryImages.filter(img => img.category === filter);
  }, [filter, galleryImages]);

  const categories = ['All', 'Graduation', 'Campus', 'Students'];

  return (
    <section id="gallery" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div>
            <h2 className="text-5xl mb-4 font-display italic">Our Gallery</h2>
            <p className="text-body/50 font-sans">Moments from our campus, student activities, and ceremonies.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat as any)}
                className={`px-6 py-2 rounded-full text-[10px] font-sans font-bold uppercase tracking-widest transition-all ${
                  filter === cat ? 'bg-primary text-white shadow-lg' : 'bg-accent text-primary/40 hover:bg-primary/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <AnimatePresence mode='popLayout'>
            {filteredImages.map((img) => (
              <motion.div
                key={img.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="group relative h-80 rounded-[2.5rem] overflow-hidden bg-accent border border-primary/5"
              >
                <img 
                  src={img.imageUrl} 
                  alt={img.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale hover:grayscale-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                  <div className="font-sans">
                    <span className="text-secondary text-[10px] uppercase font-bold tracking-[0.2em]">{img.category}</span>
                    <h4 className="text-accent font-bold text-lg">{img.title}</h4>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

const ApplyForm = ({ programs }: { programs: Program[] }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    idNumber: '',
    phoneNumber: '',
    email: '',
    address: '',
    programId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const selectedProgram = programs.find(p => p.id === formData.programId);
      const application: Application = {
        ...formData,
        programName: selectedProgram?.name,
        fee: selectedProgram?.fee,
        submittedAt: new Date().toISOString(),
        status: 'pending',
      };
      
      const path = 'applications';
      try {
        await addDoc(collection(db, path), application);
        setIsSuccess(true);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    } catch (error) {
      console.error("Submission failed", error);
      alert("Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (isSuccess) {
    return (
      <section id="apply" className="py-24 bg-primary text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-block p-4 bg-white/20 rounded-full mb-8">
            <CheckCircle2 size={64} className="text-secondary" />
          </motion.div>
          <h2 className="text-4xl mb-6">Application Submitted!</h2>
          <p className="text-lg opacity-80 mb-10">
            Thank you for applying to SSAMC. Our administration team will review your application and proof of payment, then get back to you via email shortly.
          </p>
          <button onClick={() => setIsSuccess(false)} className="btn-secondary">Submit Another Application</button>
        </div>
      </section>
    );
  }

  return (
    <section id="apply" className="py-24 bg-accent relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full -ml-32 -mb-32" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-5 gap-16">
          <div className="lg:col-span-2">
            <h2 className="text-4xl mb-8">Begin Your Journey With Us</h2>
            <p className="text-gray-600 mb-10 leading-relaxed">
              Complete the application form below and upload your proof of payment to secure your spot in our upcoming intake.
            </p>
            
            <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm mb-8">
              <h3 className="text-xl mb-6 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-primary" /> Payment Details
              </h3>
              <div className="space-y-4 text-sm font-medium">
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-gray-400">Bank</span>
                  <span>First National Bank (FNB)</span>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-gray-400">Account Name</span>
                  <span className="text-right">Sakhokuhle School of African Medicine</span>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-gray-400">Account Number</span>
                  <span>63151172574</span>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-gray-400">Branch Code</span>
                  <span>250655</span>
                </div>
                <div className="flex justify-between text-primary">
                  <span className="text-gray-400">Reference</span>
                  <span className="font-bold">Your ID Number</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 bg-white p-8 md:p-14 rounded-[3rem] shadow-2xl border border-primary/5">
            <h2 className="text-3xl mb-4">Apply Online</h2>
            <p className="text-body/60 mb-10 font-sans">Begin your journey with SSAMC by completing our application form.</p>
            
            <form onSubmit={handleSubmit} className="space-y-8 font-sans">
              <div className="grid sm:grid-cols-2 gap-8">
                <div className="border-b border-primary/20 pb-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-primary/40 mb-2">First Name</label>
                  <input name="firstName" value={formData.firstName} onChange={handleChange} required type="text" className="w-full bg-transparent border-none focus:ring-0 outline-none p-0 text-sm font-medium" />
                </div>
                <div className="border-b border-primary/20 pb-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-primary/40 mb-2">Last Name</label>
                  <input name="lastName" value={formData.lastName} onChange={handleChange} required type="text" className="w-full bg-transparent border-none focus:ring-0 outline-none p-0 text-sm font-medium" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-8">
                <div className="border-b border-primary/20 pb-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-primary/40 mb-2">ID Number</label>
                  <input name="idNumber" value={formData.idNumber} onChange={handleChange} required type="text" className="w-full bg-transparent border-none focus:ring-0 outline-none p-0 text-sm font-medium" />
                </div>
                <div className="border-b border-primary/20 pb-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-primary/40 mb-2">Phone Number</label>
                  <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required type="tel" className="w-full bg-transparent border-none focus:ring-0 outline-none p-0 text-sm font-medium" />
                </div>
              </div>

              <div className="border-b border-primary/20 pb-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-primary/40 mb-2">Email Address</label>
                <input name="email" value={formData.email} onChange={handleChange} required type="email" className="w-full bg-transparent border-none focus:ring-0 outline-none p-0 text-sm font-medium" />
              </div>

              <div className="border-b border-primary/20 pb-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-primary/40 mb-2">Program Selection</label>
                <select name="programId" value={formData.programId} onChange={handleChange} required className="w-full bg-transparent border-none focus:ring-0 outline-none p-0 text-sm font-medium cursor-pointer">
                  <option value="">Select a course...</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - {p.fee}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-primary/40 mb-4">Upload Proof of Payment</label>
                <div className="relative group">
                  <input required type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="w-full px-5 py-8 border-2 border-dashed border-primary/10 rounded-3xl flex flex-col items-center justify-center gap-3 transition-colors group-hover:border-primary group-hover:bg-primary/5">
                    <Upload className="text-primary/20 group-hover:text-primary transition-colors" size={32} />
                    <span className="text-sm font-medium text-body/40">Drag & drop or <span className="text-primary font-bold">browse</span></span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <input required type="checkbox" id="terms" className="mt-1 accent-primary" />
                <label htmlFor="terms" className="text-xs text-body/50 leading-tight">
                  I agree to the terms and conditions and confirm that all information provided is accurate and my payment is reflected in the school account.
                </label>
              </div>

              <button disabled={isSubmitting} type="submit" className="w-full bg-primary text-white py-5 rounded-[2rem] font-sans font-bold uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary/20 hover:bg-secondary transition-all">
                {isSubmitting ? "Processing..." : "Submit Application"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

const Contact = () => {
  return (
    <section id="contact" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1 space-y-8">
            <div>
              <h2 className="text-4xl mb-4">Get In Touch</h2>
              <p className="text-gray-500">Have questions about our programs? Contact us via any of these channels.</p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-primary shrink-0">
                  <MapPin size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-400 text-xs uppercase mb-1">Our Location</h4>
                  <p className="font-medium">Ibisi, Umzimkulu, 3297, KZN</p>
                </div>
              </div>
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-primary shrink-0">
                  <Phone size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-400 text-xs uppercase mb-1">Phone Number</h4>
                  <p className="font-medium underline">072 063 6863</p>
                </div>
              </div>
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-primary shrink-0">
                  <Mail size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-400 text-xs uppercase mb-1">Email Address</h4>
                  <p className="font-medium underline">jiliathandile@gmail.com</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 h-[450px] rounded-[3rem] overflow-hidden shadow-inner border border-black/5 bg-accent">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14000!2d29.9!3d-30.2!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzDCsDEyJzAwLjAiUyAyOcKwNTRmMDAsMCJF!5e0!3m2!1sen!2sza!4v162!5m2!1sen!2sza" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen 
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-accent py-12 border-t border-primary/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-12 font-sans font-bold uppercase tracking-widest text-[10px] text-primary/40">
          <div className="flex items-center gap-6">
            <span>© Sakhokuhle School of African Medicine and Crafting</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <a href="#" className="hover:text-primary transition-colors">Terms & Conditions</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <span className="text-secondary italic">Reference: Your ID Number</span>
            <span className="text-primary/60">Bank: FNB • Acc: 63151172574</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

const AdminDashboard = ({ onBack, programs, galleryItems }: { onBack: () => void, programs: Program[], galleryItems: GalleryItem[] }) => {
  const [activeTab, setActiveTab] = useState<'applications' | 'programs' | 'gallery'>('applications');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'accepted' | 'rejected'>('all');
  const { user, isAdmin } = useContext(AuthContext);

  // Forms
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [programData, setProgramData] = useState({
    name: '', description: '', fee: '', duration: '', iconName: 'BookOpen', color: 'bg-green-100 text-green-700', imageUrl: ''
  });

  const [showGalleryForm, setShowGalleryForm] = useState(false);
  const [galleryData, setGalleryData] = useState({
    title: '', category: 'Campus' as any, imageUrl: ''
  });

  const [isUploading, setIsUploading] = useState(false);

  // Helper to compress and resize images client-side
  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;

          if (width > height && width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          } else if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% quality
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'program' | 'gallery') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const base64 = await processImage(file);
      if (type === 'program') {
        setProgramData(prev => ({ ...prev, imageUrl: base64 }));
      } else {
        setGalleryData(prev => ({ ...prev, imageUrl: base64 }));
      }
    } catch (error) {
      console.error("Image upload failed", error);
      alert("Failed to process image.");
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    const path = 'applications';
    const q = query(collection(db, path), orderBy('submittedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application)));
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  const updateStatus = async (id: string, status: Application['status']) => {
    const path = `applications/${id}`;
    try {
      await updateDoc(doc(db, 'applications', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteApplication = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this application?")) return;
    const path = `applications/${id}`;
    try {
      await deleteDoc(doc(db, 'applications', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleProgramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProgram) {
        await updateDoc(doc(db, 'programs', editingProgram.id), programData);
      } else {
        await addDoc(collection(db, 'programs'), programData);
      }
      setShowProgramForm(false);
      setEditingProgram(null);
      setProgramData({ name: '', description: '', fee: '', duration: '', iconName: 'BookOpen', color: 'bg-green-100 text-green-700', imageUrl: '' });
    } catch (error) {
      console.error("Error saving program", error);
    }
  };

  const handleDeleteProgram = async (id: string) => {
    if (!window.confirm("Delete this program?")) return;
    try {
      await deleteDoc(doc(db, 'programs', id));
    } catch (error) {
      console.error("Error deleting program", error);
    }
  };

  const handleGallerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'gallery'), { ...galleryData, submittedAt: new Date().toISOString() });
      setShowGalleryForm(false);
      setGalleryData({ title: '', category: 'Campus', imageUrl: '' });
    } catch (error) {
      console.error("Error saving gallery item", error);
    }
  };

  const handleDeleteGallery = async (id: string) => {
    if (!window.confirm("Delete this image?")) return;
    try {
      await deleteDoc(doc(db, 'gallery', String(id)));
    } catch (error) {
      console.error("Error deleting gallery item", error);
    }
  };

  const filteredApps = useMemo(() => {
    return filter === 'all' ? applications : applications.filter(a => a.status === filter);
  }, [applications, filter]);

  const statsData = useMemo(() => {
    const counts = applications.reduce((acc: any, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});
    return [
      { name: 'Pending', value: counts.pending || 0, color: '#ff9f1c' },
      { name: 'Reviewed', value: counts.reviewed || 0, color: '#3b82f6' },
      { name: 'Accepted', value: counts.accepted || 0, color: '#1a4d2e' },
      { name: 'Rejected', value: counts.rejected || 0, color: '#ef4444' },
    ];
  }, [applications]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-accent font-sans p-4">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center max-w-md">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8">
            <Lock size={40} />
          </div>
          <h2 className="text-3xl mb-4">Access Denied</h2>
          <p className="text-body/60 mb-8 leading-relaxed">
            You do not have administrative privileges to view this page. Please log in with an authorized account.
          </p>
          <button onClick={onBack} className="btn-primary w-full">Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-accent p-6 lg:p-12 font-sans pt-24 pb-24">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-[0.2em] mb-2">
              <Lock size={14} /> Admin Portal
            </span>
            <h1 className="text-5xl font-display italic">Dashboard</h1>
          </div>
          <button onClick={onBack} className="flex items-center gap-2 text-primary/40 hover:text-primary transition-colors font-bold text-sm">
            <ChevronRight size={20} className="rotate-180" /> Back to Website
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-primary/10 pb-4 overflow-x-auto">
          {(['applications', 'programs', 'gallery'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === tab ? "bg-primary text-white shadow-xl shadow-primary/20" : "text-primary/40 hover:bg-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'applications' && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Stats */}
            <div className="lg:col-span-1 bg-white p-8 rounded-[3rem] shadow-sm border border-primary/5 h-fit">
              <h3 className="text-xl mb-8 font-display italic">Overview</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-8">
                {statsData.map(stat => (
                  <div key={stat.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary/40">{stat.name}</span>
                    <span className="ml-auto font-bold">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters & List */}
            <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] shadow-sm border border-primary/5 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-8 gap-4 overflow-x-auto pb-2">
                <div className="flex gap-2 min-w-max">
                  {(['all', 'pending', 'reviewed', 'accepted', 'rejected'] as const).map(f => (
                    <button 
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        "px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                        filter === f ? "bg-primary text-white" : "bg-accent text-primary/40 hover:bg-primary/5"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-primary/20 shrink-0">
                  {filteredApps.length} Applications
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 max-h-[600px] pr-2 custom-scrollbar">
                {loading ? (
                  <div className="flex flex-col items-center justify-center min-h-[300px] text-primary/20">
                    <div className="w-12 h-12 rounded-full border-4 border-t-primary animate-spin mb-4" />
                    <span className="font-bold uppercase tracking-widest text-xs">Loading Applications...</span>
                  </div>
                ) : filteredApps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[300px] text-primary/20">
                    <Mail size={48} className="mb-4" />
                    <span className="font-bold uppercase tracking-widest text-xs">No applications found</span>
                  </div>
                ) : filteredApps.map(app => (
                  <div key={app.id} className="p-6 bg-accent rounded-3xl group transition-all hover:bg-white hover:shadow-xl hover:shadow-primary/5 border border-transparent hover:border-primary/5">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            app.status === 'pending' ? 'bg-secondary' :
                            app.status === 'accepted' ? 'bg-green-500' :
                            app.status === 'rejected' ? 'bg-red-500' : 'bg-blue-500'
                          )} />
                          <h4 className="text-lg font-bold">{app.firstName} {app.lastName}</h4>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/30 px-2 py-0.5 bg-primary/5 rounded">
                            {app.programName || 'Unknown Program'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest text-body/30">
                          <span className="flex items-center gap-1"><Phone size={10} /> {app.phoneNumber}</span>
                          <span className="flex items-center gap-1"><Mail size={10} /> {app.email}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center md:items-start gap-2">
                        <select 
                          value={app.status}
                          onChange={(e) => updateStatus(app.id!, e.target.value as any)}
                          className="bg-white border border-primary/10 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-1 focus:ring-primary h-fit"
                        >
                          <option value="pending">Pending</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="accepted">Accepted</option>
                          <option value="rejected">Rejected</option>
                        </select>
                        <button 
                          onClick={() => deleteApplication(app.id!)}
                          className="w-10 h-10 rounded-xl bg-white border border-red-100 text-red-300 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center h-fit"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'programs' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-primary/5">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-display italic">Manage Programs</h3>
              <button 
                onClick={() => { setEditingProgram(null); setProgramData({ name: '', description: '', fee: '', duration: '', iconName: 'BookOpen', color: 'bg-green-100 text-green-700', imageUrl: '' }); setShowProgramForm(true); }}
                className="btn-primary py-2 px-6 text-[10px]"
              >
                Add Program
              </button>
            </div>

            {showProgramForm && (
              <form onSubmit={handleProgramSubmit} className="mb-12 p-8 bg-accent rounded-3xl space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="label-admin">Program Name</label>
                    <input required value={programData.name} onChange={e => setProgramData({...programData, name: e.target.value})} className="input-admin" />
                  </div>
                  <div>
                    <label className="label-admin">Duration</label>
                    <input required value={programData.duration} onChange={e => setProgramData({...programData, duration: e.target.value})} className="input-admin" placeholder="e.g. 6 months" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="label-admin">Fee</label>
                    <input required value={programData.fee} onChange={e => setProgramData({...programData, fee: e.target.value})} className="input-admin" placeholder="R3500" />
                  </div>
                  <div>
                    <label className="label-admin">Icon (Lucide Name)</label>
                    <select value={programData.iconName} onChange={e => setProgramData({...programData, iconName: e.target.value})} className="input-admin">
                      {Object.keys(ICON_MAP).map(icon => <option key={icon} value={icon}>{icon}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label-admin">Description</label>
                  <textarea required value={programData.description} onChange={e => setProgramData({...programData, description: e.target.value})} className="input-admin h-24" />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="label-admin">Program Photo (Optional)</label>
                    <div className="relative group/upload h-32 border-2 border-dashed border-primary/10 rounded-2xl flex flex-col items-center justify-center p-4 hover:border-primary transition-all bg-white overflow-hidden">
                      {programData.imageUrl ? (
                        <img src={programData.imageUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                      ) : null}
                      <Upload className="text-primary/20 group-hover/upload:text-primary mb-2" size={24} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary/40">
                        {isUploading ? "Processing..." : "Click to upload"}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'program')}
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label-admin">Or Image URL</label>
                    <input value={programData.imageUrl} onChange={e => setProgramData({...programData, imageUrl: e.target.value})} className="input-admin" placeholder="https://unsplash.com/..." />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button type="submit" disabled={isUploading} className="btn-primary py-3 px-8 text-xs">{editingProgram ? 'Update' : 'Create'} Program</button>
                  <button type="button" onClick={() => setShowProgramForm(false)} className="px-8 py-3 bg-white text-primary rounded-xl text-xs font-bold uppercase tracking-widest border border-primary/10">Cancel</button>
                </div>
              </form>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {programs.map(p => (
                <div key={p.id} className="p-6 bg-accent rounded-3xl relative group">
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", p.color)}>
                      {React.createElement(p.icon || BookOpen, { size: 20 })}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingProgram(p); setProgramData({ ...p, iconName: (p as any).iconName || 'BookOpen', imageUrl: p.imageUrl || '' }); setShowProgramForm(true); }} className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-primary/40 hover:text-primary">
                        <Filter size={14} />
                      </button>
                      <button onClick={() => handleDeleteProgram(p.id)} className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-red-300 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-bold mb-2">{p.name}</h4>
                  <p className="text-xs text-body/60 mb-4 line-clamp-2">{p.description}</p>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-primary/40">
                    <span>{p.duration}</span>
                    <span>{p.fee}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-primary/5">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-display italic">Manage Gallery</h3>
              <button 
                onClick={() => setShowGalleryForm(true)}
                className="btn-primary py-2 px-6 text-[10px]"
              >
                Add Image
              </button>
            </div>

            {showGalleryForm && (
              <form onSubmit={handleGallerySubmit} className="mb-12 p-8 bg-accent rounded-3xl space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="label-admin">Image Title</label>
                    <input required value={galleryData.title} onChange={e => setGalleryData({...galleryData, title: e.target.value})} className="input-admin" />
                  </div>
                  <div>
                    <label className="label-admin">Category</label>
                    <select value={galleryData.category} onChange={e => setGalleryData({...galleryData, category: e.target.value as any})} className="input-admin">
                      <option value="Graduation">Graduation</option>
                      <option value="Campus">Campus</option>
                      <option value="Students">Students</option>
                    </select>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="label-admin">Upload Photo</label>
                    <div className="relative group/upload h-32 border-2 border-dashed border-primary/10 rounded-2xl flex flex-col items-center justify-center p-4 hover:border-primary transition-all bg-white overflow-hidden">
                      {galleryData.imageUrl ? (
                        <img src={galleryData.imageUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                      ) : null}
                      <Upload className="text-primary/20 group-hover/upload:text-primary mb-2" size={24} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary/40">
                        {isUploading ? "Processing..." : "Click to upload"}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'gallery')}
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label-admin">Or Image URL</label>
                    <input value={galleryData.imageUrl} onChange={e => setGalleryData({...galleryData, imageUrl: e.target.value})} className="input-admin" placeholder="https://unsplash.com/..." />
                    <p className="text-[8px] mt-2 text-primary/30 uppercase font-bold tracking-widest">URL will be updated automatically if you upload a file.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button type="submit" disabled={isUploading || !galleryData.imageUrl} className="btn-primary py-3 px-8 text-xs">
                    {isUploading ? "Uploading..." : "Add to Gallery"}
                  </button>
                  <button type="button" onClick={() => setShowGalleryForm(false)} className="px-8 py-3 bg-white text-primary rounded-xl text-xs font-bold uppercase tracking-widest border border-primary/10">Cancel</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {galleryItems.map(item => (
                <div key={item.id} className="relative group aspect-square rounded-2xl overflow-hidden bg-accent">
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-secondary mb-1">{item.category}</span>
                    <h5 className="text-white text-xs font-bold mb-4">{item.title}</h5>
                    <button onClick={() => handleDeleteGallery(String(item.id))} className="w-8 h-8 rounded-full bg-white text-red-500 flex items-center justify-center">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

  useEffect(() => {
    // Sync programs
    const unsubPrograms = onSnapshot(collection(db, 'programs'), (snap) => {
      if (snap.empty) {
        // Bootstrap if empty - in a real app this might be done differently
        setPrograms(DEFAULT_PROGRAMS);
      } else {
        setPrograms(snap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(), 
          icon: getIcon((doc.data() as any).iconName) 
        } as Program)));
      }
    });

    // Sync gallery
    const unsubGallery = onSnapshot(collection(db, 'gallery'), (snap) => {
      if (snap.empty) {
        setGalleryItems(DEFAULT_GALLERY);
      } else {
        setGalleryItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      }
    });

    return () => {
      unsubPrograms();
      unsubGallery();
    };
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-screen">
        {showAdmin ? (
          <AdminDashboard 
            onBack={() => setShowAdmin(false)} 
            programs={programs} 
            galleryItems={galleryItems} 
          />
        ) : (
          <>
            <Navbar onAdminClick={() => setShowAdmin(true)} />
            <Hero />
            <About />
            <div id="fees" className="bg-primary py-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-1">
                    <h2 className="text-white text-4xl mb-6">Program Fees & Duration</h2>
                    <p className="text-white/60 mb-8 font-medium">Affordable education with flexible payment options to help you achieve your goals.</p>
                    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                      <span className="block text-secondary font-bold text-3xl mb-2 italic underline underline-offset-4">R2100*</span>
                      <span className="text-white/80 text-sm">*Starting price for most 2-3 month certificate courses.</span>
                    </div>
                  </div>
                  <div className="lg:col-span-3 grid sm:grid-cols-2 gap-4">
                    {programs.map(p => (
                      <div key={p.id} className="p-6 bg-white rounded-3xl flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-primary">{p.name}</h4>
                          <span className="text-xs text-gray-400 uppercase font-bold">{p.duration}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold font-display text-primary">{p.fee}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <Programs programs={programs} />
            <Gallery galleryImages={galleryItems} />
            <ApplyForm programs={programs} />
            <Contact />
            <Footer />
          </>
        )}
      </div>
    </AuthProvider>
  );
}
