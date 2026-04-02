import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bell, Shield, Smartphone, ArrowLeft, Clock, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ToggleSwitch = ({ enabled, onToggle }) => (
  <button 
    onClick={onToggle}
    className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
      enabled ? 'bg-brand-cyan' : 'bg-white/10'
    }`}
  >
    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
      enabled ? 'left-[22px]' : 'left-0.5'
    }`} />
  </button>
);

const Settings = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [toggles, setToggles] = useState({
    'Push Notifications': true,
    'GPS Tracking': true,
    'Dark Mode': true,
    'Two-Factor Auth': false,
    'Auto-accept Orders': false,
    'Email Alerts': true,
  });

  const handleToggle = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [activeTab, setActiveTab] = useState('profile');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      const fetchHistory = async () => {
        setLoading(true);
        try {
          const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
          if (user.role === 'CARRIER') {
            const res = await axios.get('http://localhost:5000/api/trips/my-trips', { headers });
            setHistory(res.data);
          } else {
            const res = await axios.get('http://localhost:5000/api/orders/my-orders', { headers });
            setHistory(res.data);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchHistory();
    }
  }, [activeTab, user.role]);

  const sections = [
    {
      id: 'profile',
      title: 'Profile',
      icon: <User size={20} />,
      fields: [
        { label: 'Full Name', value: user.name || 'Not set' },
        { label: 'Email', value: user.email || 'Not set' },
        { label: 'Role', value: user.role === 'CARRIER' ? 'Delivery Partner' : 'Customer' },
      ]
    },
    {
      id: 'history',
      title: 'History',
      icon: <Clock size={20} />,
      isHistory: true
    },
    {
      id: 'preferences',
      title: 'Preferences',
      icon: <Smartphone size={20} />,
      options: ['Push Notifications', 'GPS Tracking', 'Dark Mode']
    },
    {
      id: 'security',
      title: 'Security',
      icon: <Shield size={20} />,
      options: ['Two-Factor Auth', 'Auto-accept Orders', 'Email Alerts']
    }
  ];

  const activeSection = sections.find(s => s.id === activeTab);

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-display uppercase tracking-tight text-white">Settings</h1>
          <p className="text-muted text-sm font-body">Manage your account and preferences.</p>
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-muted hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> BACK
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          {sections.map(s => (
            <button 
              key={s.id}
              onClick={() => setActiveTab(s.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 group ${activeTab === s.id ? 'bg-bg-surface border-brand-cyan/30' : 'bg-bg-surface/30 border-white/5 hover:bg-bg-surface/50'}`}
            >
              <div className={`${activeTab === s.id ? 'text-brand-cyan' : 'text-muted group-hover:text-brand-cyan'} transition-colors`}>{s.icon}</div>
              <span className={`text-sm font-bold ${activeTab === s.id ? 'text-white' : 'text-muted group-hover:text-white'}`}>{s.title}</span>
            </button>
          ))}
        </div>

        <div className="md:col-span-2 space-y-8">
          <AnimatePresence mode="wait">
            <motion.section 
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass p-8 rounded-[32px] border border-white/5 space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="text-brand-cyan">{activeSection.icon}</div>
                <h3 className="text-lg font-heading text-white">{activeSection.title}</h3>
              </div>

              {activeSection.fields ? (
                <div className="space-y-4">
                  {activeSection.fields.map(f => (
                    <div key={f.label} className="flex justify-between items-center p-4 rounded-2xl bg-bg-deep/50 border border-white/5">
                      <span className="text-[10px] font-mono text-muted uppercase tracking-widest">{f.label}</span>
                      <span className="text-sm font-bold text-white">{f.value}</span>
                    </div>
                  ))}
                </div>
              ) : activeSection.isHistory ? (
                <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                  {loading ? (
                     <div className="text-muted text-sm flex items-center gap-2"> <Package size={16} className="animate-pulse" /> Loading history...</div>
                  ) : history.length === 0 ? (
                     <div className="text-muted text-sm p-4 border border-white/5 rounded-2xl bg-bg-deep/50 text-center">No history found.</div>
                  ) : (
                    history.map(item => (
                      <div key={item.id} className="p-4 rounded-2xl bg-bg-deep/50 border border-white/5 flex justify-between items-center group hover:border-brand-cyan/20 transition-all">
                        <div>
                          <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-1">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'} &middot; {item.status}</div>
                          <div className="text-sm font-bold text-white uppercase">{user.role === 'CARRIER' ? item.destination : (item.itemName || 'Order')}</div>
                        </div>
                        <div className="text-brand-cyan font-bold text-[10px] uppercase">
                           {user.role === 'CARRIER' ? `₹${item.capacity * 10} est` : `₹${item.deliveryFee}`}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {activeSection.options.map(opt => (
                    <div key={opt} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors rounded-2xl group">
                      <span className="text-sm font-medium text-muted group-hover:text-white transition-colors">{opt}</span>
                      <ToggleSwitch 
                        enabled={toggles[opt]} 
                        onToggle={() => handleToggle(opt)} 
                      />
                    </div>
                  ))}
                </div>
              )}
            </motion.section>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Settings;
