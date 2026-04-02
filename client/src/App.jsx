import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, ShoppingBag, Briefcase, User, Settings as SettingsIcon, LogOut, Zap, Leaf } from 'lucide-react'
import axios from 'axios'
import Login from './components/Login'
import Register from './components/Register'
import RequesterDashboard from './components/RequesterDashboard'
import CarrierDashboard from './components/CarrierDashboard'
import Settings from './components/Settings'
import CustomCursor from './components/CustomCursor'
import Landing from './components/Landing'

// --- PROTECTED ROUTE WRAPPER ---
const ProtectedRoute = ({ user, children, requiredRole }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    const defaultPath = user.role === 'CARRIER' ? '/dashboard/carrier' : '/dashboard/requester';
    return <Navigate to={defaultPath} replace />;
  }
  return children;
};

const Sidebar = ({ user, handleLogout }) => {
  const [balance, setBalance] = useState(840);
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    const timer = setInterval(() => {
      setBalance(prev => prev < 1240 ? prev + 5 : prev);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { 
      label: 'Console', 
      path: user?.role === 'CARRIER' ? '/dashboard/carrier' : '/dashboard/requester', 
      icon: <LayoutDashboard size={18} /> 
    },
    { label: 'Tracking', path: '/tracking', icon: <Zap size={18} /> },
    { label: 'Protocols', path: '/settings', icon: <SettingsIcon size={18} /> },
  ];

  return (
    <motion.div 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="hidden md:flex w-[280px] bg-bg-card border-r border-white/5 p-8 flex-col gap-10 h-full fixed left-0 top-0 z-40"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-2 border-brand-cyan p-1 shadow-[0_0_20px_rgba(0,242,255,0.15)]">
             <div className="w-full h-full rounded-full bg-bg-surface flex items-center justify-center overflow-hidden">
                <User size={40} className="text-muted" />
             </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-green border-4 border-bg-card rounded-full" />
        </div>
        
        <div className="text-center">
          <h2 className="text-lg font-heading text-white tracking-tight uppercase">{user?.name}</h2>
          <p className="text-brand-cyan text-[9px] font-mono tracking-[0.2em] uppercase mt-1">OPERATIVE: {user?.role}</p>
        </div>
      </div>

      <div className="bg-bg-surface border border-white/5 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-muted font-mono tracking-widest">CREDITS</span>
            <span className="text-[10px] text-brand-green font-bold flex items-center gap-1">
              <Leaf size={10} /> 94% ECO
            </span>
          </div>
          <div className="text-2xl font-display text-white tracking-widest font-black">◈ {balance}</div>
      </div>

      <nav className="flex flex-col gap-1 mt-4">
        {navItems.map((item) => (
          <button 
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl transition-all group relative overflow-hidden",
              location.pathname === item.path ? "bg-brand-cyan/10 text-white" : "text-muted hover:text-white hover:bg-white/[0.03]"
            )}
          >
            <div className={cn(
              "transition-colors",
              location.pathname === item.path ? "text-brand-cyan" : "group-hover:text-brand-cyan"
            )}>
              {item.icon}
            </div>
            <span className="text-[11px] font-bold tracking-[0.05em] uppercase">{item.label}</span>
            {location.pathname === item.path && (
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-brand-cyan shadow-[0_0_10px_rgba(0,242,255,0.8)]" />
            )}
          </button>
        ))}
        
        <button 
          onClick={handleLogout} 
          className="flex items-center gap-4 p-4 rounded-xl hover:bg-brand-red/10 transition-all group mt-8"
        >
          <LogOut size={18} className="text-brand-red opacity-50 group-hover:opacity-100" />
          <span className="text-[11px] font-bold text-brand-red opacity-50 group-hover:opacity-100 uppercase tracking-widest">Eject Session</span>
        </button>
      </nav>
    </motion.div>
  );
};

const MainLayout = ({ children, user, handleLogout, socketStatus }) => {
  const location = useLocation();
  const isAuthPage = ['/login', '/register', '/'].includes(location.pathname);
  const title = location.pathname === '/settings' ? 'System Protocols' : 'Global Console';
  
  return (
    <div className={cn("min-h-screen flex text-white bg-bg-deep", isAuthPage ? "items-center justify-center" : "pl-0 md:pl-[280px]")}>
       {!isAuthPage && user && <Sidebar user={user} handleLogout={handleLogout} />}
       
       <main className={cn("flex-1 relative overflow-x-hidden", isAuthPage ? "flex items-center justify-center p-4 max-w-full" : "p-8 md:p-12")}>
          {!isAuthPage && user && (
            <div className="flex items-center justify-between mb-16 border-b border-white/5 pb-8">
               <div className="flex flex-col">
                  <h1 className="text-3xl font-display uppercase tracking-tight text-white leading-none">{title}</h1>
                  <div className="flex items-center gap-3 mt-3">
                     <div className={cn("w-1.5 h-1.5 rounded-full", socketStatus === 'SECURE' ? "bg-brand-green shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-brand-red")} />
                     <span className="text-[9px] font-mono tracking-[0.25em] text-muted uppercase">SYSTEM: {socketStatus}</span>
                  </div>
               </div>
               
               <div className="flex items-center gap-4">
                  <div className="bg-bg-surface/50 border border-white/5 px-4 py-3 rounded-2xl flex flex-col items-end gap-1">
                    <span className="text-brand-cyan text-[8px] font-bold tracking-[0.2em] uppercase">Sector Alert</span>
                    <span className="text-white text-[10px] font-mono font-bold tracking-tighter">BIT@VIT — CHENNAI_GRID_ACTIVE</span>
                  </div>
               </div>
            </div>
          )}
          {children}
       </main>
    </div>
  );
};

// Utils
function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

function App() {
  const [socketStatus, setSocketStatus] = useState('OFFLINE');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);

    const socket = io('http://localhost:5000');
    socket.on('connect', () => setSocketStatus('SECURE'));
    socket.on('disconnect', () => setSocketStatus('OFFLINE'));

    return () => socket.disconnect();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  if (isLoading) return null;

  return (
    <Router>
      <CustomCursor />
      <MainLayout user={user} handleLogout={handleLogout} socketStatus={socketStatus}>
        <Routes>
          <Route path="/" element={<Landing user={user} />} />
          
          <Route path="/login" element={<Login setUser={setUser} />} />
          
          <Route path="/register" element={<Register setUser={setUser} />} />

          <Route path="/dashboard/requester" element={
            <ProtectedRoute user={user} requiredRole="REQUESTER">
              <RequesterDashboard />
            </ProtectedRoute>
          } />

          <Route path="/dashboard/carrier" element={
            <ProtectedRoute user={user} requiredRole="CARRIER">
              <CarrierDashboard />
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute user={user}>
              <Settings />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MainLayout>
    </Router>
  )
}

export default App
