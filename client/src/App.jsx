import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { motion, useMotionValue, useMotionTemplate } from 'framer-motion'
import { LayoutDashboard, Map, User, Settings as SettingsIcon, LogOut, Activity, RefreshCw } from 'lucide-react'
import axios from 'axios'
import Login from './components/Login'
import Register from './components/Register'
import RequesterDashboard from './components/RequesterDashboard'
import CarrierDashboard from './components/CarrierDashboard'
import Analytics from './components/Analytics'
import Settings from './components/Settings'
import CustomCursor from './components/CustomCursor'
import Landing from './components/Landing'
import LiveMap from './components/LiveMap'
import StudioModal from './components/StudioModal'

// --- LIVE TRACKING PAGE WRAPPER ---
const LiveTrackingPage = () => {
  const [activeTripId, setActiveTripId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const findActiveTrip = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/orders/my-orders', {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
        });
        // Find first order that is matched and has a trip
        const matchedOrder = res.data.find(o => 
          (o.status === 'MATCHED' || o.status === 'PICKED_UP') && o.match?.tripId
        );
        if (matchedOrder) {
          setActiveTripId(matchedOrder.match.tripId);
        }
      } catch (err) {
        console.error('Failed to find active trip:', err);
      } finally {
        setLoading(false);
      }
    };
    findActiveTrip();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[70vh] gap-6">
       <div className="w-12 h-12 border-4 border-brand-cyan/20 border-t-brand-cyan rounded-full animate-spin" />
       <p className="text-[10px] font-mono text-muted uppercase tracking-widest">Searching for active shipments...</p>
    </div>
  );

  if (!activeTripId) return (
    <div className="flex flex-col items-center justify-center h-[70vh] gap-8 bg-bg-surface/50 border border-white/5 rounded-[40px] text-center p-12">
       <div className="w-20 h-20 rounded-full bg-brand-red/10 border border-brand-red/20 flex items-center justify-center">
          <Activity size={32} className="text-brand-red opacity-60" />
       </div>
       <div className="space-y-3">
          <h3 className="text-xl font-display text-white uppercase italic">No Active Tracking</h3>
          <p className="text-[10px] font-mono text-muted uppercase tracking-widest leading-loose max-w-[320px] mx-auto">
             You don't have any orders currently matched with a delivery partner. 
             Place an order or wait for a partner to accept!
          </p>
       </div>
       <Link 
        to="/dashboard/requester" 
        className="bg-bg-deep border border-brand-cyan/20 text-brand-cyan px-8 py-3 rounded-2xl text-[10px] font-black tracking-widest uppercase hover:bg-brand-cyan hover:text-bg-deep transition-all shadow-2xl"
       >
         BACK TO DASHBOARD
       </Link>
    </div>
  );

  return (
    <div className="w-full h-[75vh] rounded-[40px] overflow-hidden border border-brand-cyan/20 bg-bg-deep shadow-2xl relative group">
       <LiveMap tripId={activeTripId} />
    </div>
  );
};

// --- PROTECTED ROUTE WRAPPER ---
const ProtectedRoute = ({ user, children, requiredRole }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    const defaultPath = user.role === 'CARRIER' ? '/dashboard/carrier' : '/dashboard/requester';
    return <Navigate to={defaultPath} replace />;
  }
  return children;
};

const Sidebar = ({ user, handleLogout, handleSwitchRole }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { 
      label: 'Dashboard', 
      path: user?.role === 'CARRIER' ? '/dashboard/carrier' : '/dashboard/requester', 
      icon: <LayoutDashboard size={18} /> 
    },
    ...(user?.role === 'CARRIER' ? [
      { 
        label: 'Analytics', 
        path: '/analytics', 
        icon: <Activity size={18} /> 
      }
    ] : [
      { 
        label: 'Live Map', 
        path: '/map', 
        icon: <Map size={18} /> 
      }
    ]),
    { label: 'Settings', path: '/settings', icon: <SettingsIcon size={18} /> },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="hidden md:flex w-[280px] bg-bg-card border-r border-white/5 p-8 flex-col gap-10 h-full fixed left-0 top-0 z-40"
      >
        <div className="flex flex-col items-center gap-6">
          <Link to="/settings" className="relative group cursor-pointer block">
            <div className="w-20 h-20 rounded-full border-2 border-brand-cyan p-1 shadow-[0_0_20px_rgba(0,242,255,0.15)] group-hover:shadow-[0_0_25px_rgba(0,242,255,0.3)] transition-all">
               <div className="w-full h-full rounded-full bg-bg-surface flex items-center justify-center overflow-hidden">
                  <User size={40} className="text-muted group-hover:text-brand-cyan transition-colors" />
               </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-green border-4 border-bg-card rounded-full" />
          </Link>
          
          <div className="text-center">
            <h2 className="text-lg font-heading text-white tracking-tight uppercase">{user?.name}</h2>
            <p className="text-brand-cyan text-[9px] font-mono tracking-[0.2em] uppercase mt-1">{user?.role === 'CARRIER' ? 'Delivery Partner' : 'Customer'}</p>
          </div>
        </div>

        {user?.role === 'CARRIER' && (
          <div className="bg-bg-surface border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-muted font-mono tracking-widest uppercase">Total Earnings</span>
              </div>
              <div className="text-2xl font-display text-brand-green tracking-widest font-black">₹{user?.totalEarnings || 0}</div>
          </div>
        )}

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
            onClick={handleSwitchRole} 
            className="flex items-center gap-4 p-4 rounded-xl hover:bg-brand-cyan/10 transition-all group mt-8 border border-brand-cyan/20 bg-brand-cyan/5"
          >
            <RefreshCw size={18} className="text-brand-cyan opacity-80 group-hover:opacity-100 group-hover:rotate-180 transition-transform duration-500" />
            <span className="text-[11px] font-bold text-brand-cyan opacity-80 group-hover:opacity-100 uppercase tracking-widest">
              Switch to {user?.role === 'CARRIER' ? 'Customer' : 'Delivery'}
            </span>
          </button>
          
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-4 p-4 rounded-xl hover:bg-brand-red/10 transition-all group mt-2"
          >
            <LogOut size={18} className="text-brand-red opacity-50 group-hover:opacity-100" />
            <span className="text-[11px] font-bold text-brand-red opacity-50 group-hover:opacity-100 uppercase tracking-widest">Logout</span>
          </button>
        </nav>
      </motion.div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-bg-card border-t border-white/5 z-50 flex items-center justify-around px-4 pb-2">
        {navItems.map((item) => (
          <button 
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 transition-all",
              location.pathname === item.path ? "text-brand-cyan" : "text-muted"
            )}
          >
            <div className={cn("p-2 rounded-xl transition-colors", location.pathname === item.path ? "bg-brand-cyan/10" : "")}>
              {item.icon}
            </div>
            <span className="text-[9px] font-bold tracking-widest uppercase">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
};

const MainLayout = ({ children, user, handleLogout, handleSwitchRole, socketStatus }) => {
  const location = useLocation();
  const isAuthPage = ['/login', '/register', '/'].includes(location.pathname);
  const title = location.pathname === '/settings' ? 'Settings' : 
                location.pathname === '/analytics' ? 'Analytics' : 'Dashboard';

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = ({ clientX, clientY }) => {
    mouseX.set(clientX);
    mouseY.set(clientY);
  };
  
  return (
    <div 
      onMouseMove={handleMouseMove}
      className={cn("min-h-screen flex text-white bg-bg-deep relative overflow-hidden group/global", isAuthPage ? "items-center justify-center p-0" : "pl-0 md:pl-[280px] pb-24 md:pb-0")}
    >
       {/* Global Background Grid (The Studio Architecture) */}
       <div className="absolute inset-0 z-0 pointer-events-none opacity-20 md:opacity-[0.14] overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
       </div>

       {/* Global Background Glow Animation */}
       <motion.div
        className="pointer-events-none fixed inset-0 z-0 opacity-0 transition duration-300 group-hover/global:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              1200px circle at ${mouseX}px ${mouseY}px,
              rgba(0, 242, 255, 0.06),
              transparent 80%
            )
          `,
        }}
      />

       {!isAuthPage && user && <Sidebar user={user} handleLogout={handleLogout} handleSwitchRole={handleSwitchRole} />}
       
       <main className={cn("flex-1 relative z-10", isAuthPage ? "flex items-center justify-center p-4 max-w-full" : "p-4 md:p-12")}>
          {!isAuthPage && user && (
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-16 border-b border-white/5 pb-6 md:pb-8 gap-4">
               <div className="flex flex-col">
                  <h1 className="text-2xl md:text-3xl font-display uppercase tracking-tight text-white leading-none">{title}</h1>
                  <div className="flex items-center gap-3 mt-3">
                     <div className={cn("w-1.5 h-1.5 rounded-full", socketStatus === 'CONNECTED' ? "bg-brand-green shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-brand-red")} />
                     <span className="text-[9px] font-mono tracking-[0.25em] text-muted uppercase">Status: {socketStatus === 'CONNECTED' ? 'Online' : 'Offline'}</span>
                  </div>
               </div>
               
               <div className="flex items-center gap-4 self-start md:self-auto">
                  <div className="bg-bg-surface/50 border border-white/5 px-4 py-3 rounded-2xl flex flex-col items-start md:items-end gap-1">
                    <span className="text-brand-cyan text-[8px] font-bold tracking-[0.2em] uppercase">Campus Relay</span>
                    <span className="text-white text-[10px] font-mono font-bold tracking-tighter">BringIt — IIIT Dharwad</span>
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

// Inner component that lives inside Router so hooks like useNavigate work
const AppRoutes = () => {
  const [socketStatus, setSocketStatus] = useState('OFFLINE');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const navigate = useNavigate();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const fetchProfile = async () => {
      // PROACTIVELY MIGRATE: Copy from localStorage if sessionStorage is empty for this tab session
      const existingToken = localStorage.getItem('token');
      const existingUser = localStorage.getItem('user');
      if (existingToken && !sessionStorage.getItem('token')) {
        sessionStorage.setItem('token', existingToken);
        if (existingUser) sessionStorage.setItem('user', existingUser);
      }

      const token = sessionStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await axios.get('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.user) {
          setUser(res.data.user);
          sessionStorage.setItem('user', JSON.stringify(res.data.user));
        }
      } catch (err) {
        console.error('Profile refresh failed:', err);
        if (err.response?.status === 401) handleLogout();
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
    const profileInterval = setInterval(fetchProfile, 10000);

    const socket = io('http://localhost:5000');
    socket.on('connect', () => setSocketStatus('CONNECTED'));
    socket.on('disconnect', () => setSocketStatus('OFFLINE'));

    return () => {
      socket.disconnect();
      clearInterval(profileInterval);
    };
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    window.location.href = '/';
  };

  const handleSwitchRole = async () => {
    try {
      const res = await axios.put('http://localhost:5000/api/auth/switch-role', {}, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      setUser(res.data.user);
      sessionStorage.setItem('user', JSON.stringify(res.data.user));
      sessionStorage.setItem('token', res.data.token);
      localStorage.setItem('token', res.data.token); // Keep in sync
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate(res.data.user.role === 'CARRIER' ? '/dashboard/carrier' : '/dashboard/requester');
    } catch (err) {
      setModal({
        isOpen: true,
        title: 'Action Required',
        message: err.response?.data?.message || 'Failed to switch role',
        type: 'warning'
      });
    }
  };

  if (isLoading) return null;

  return (
    <MainLayout user={user} handleLogout={handleLogout} handleSwitchRole={handleSwitchRole} socketStatus={socketStatus}>
      <StudioModal 
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
      <Routes>
        <Route path="/" element={<Landing user={user} />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register setUser={setUser} />} />
        <Route path="/dashboard/requester" element={
          <ProtectedRoute user={user} requiredRole="REQUESTER">
            <RequesterDashboard user={user} setUser={setUser} />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/carrier" element={
          <ProtectedRoute user={user} requiredRole="CARRIER">
            <CarrierDashboard user={user} setUser={setUser} />
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute user={user} requiredRole="CARRIER">
            <Analytics user={user} />
          </ProtectedRoute>
        } />

        <Route path="/map" element={
          <ProtectedRoute user={user} requiredRole="REQUESTER">
            <LiveTrackingPage />
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
  );
};

function App() {
  return (
    <Router>
      <CustomCursor />
      <AppRoutes />
    </Router>
  );
}

export default App
