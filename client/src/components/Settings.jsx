import React from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Shield, Smartphone, ArrowLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const sections = [
    {
      id: 'profile',
      title: 'Profile Identity',
      icon: <User size={20} />,
      fields: [
        { label: 'Full Name', value: user.name || 'Operative' },
        { label: 'Clearance Email', value: user.email || 'N/A' },
        { label: 'Assigned Role', value: user.role || 'N/A' },
      ]
    },
    {
      id: 'system',
      title: 'System Preferences',
      icon: <Smartphone size={20} />,
      options: ['Push Notifications', 'Real-time GPS Tracking', 'Dark Mode Persistence']
    },
    {
      id: 'security',
      title: 'Security Protocols',
      icon: <Shield size={20} />,
      options: ['Two-Factor Authentication', 'Rotation Keys', 'Clear Session History']
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-display uppercase tracking-tight text-white">Settings</h1>
          <p className="text-muted text-sm font-body">Configure your operative workspace and protocols.</p>
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-muted hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> BACK TO CONSOLE
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          {sections.map(s => (
            <button 
              key={s.id}
              className="w-full text-left p-4 rounded-2xl border border-white/5 bg-bg-surface/30 hover:bg-bg-surface/50 transition-all flex items-center gap-4 group"
            >
              <div className="text-muted group-hover:text-brand-cyan transition-colors">{s.icon}</div>
              <span className="text-sm font-bold text-muted group-hover:text-white">{s.title}</span>
            </button>
          ))}
        </div>

        <div className="md:col-span-2 space-y-8">
          {sections.map(s => (
            <motion.section 
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-8 rounded-[32px] border border-white/5 space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="text-brand-cyan">{s.icon}</div>
                <h3 className="text-lg font-heading text-white">{s.title}</h3>
              </div>

              {s.fields ? (
                <div className="space-y-4">
                  {s.fields.map(f => (
                    <div key={f.label} className="flex justify-between items-center p-4 rounded-2xl bg-bg-deep/50 border border-white/5">
                      <span className="text-[10px] font-mono text-muted uppercase tracking-widest">{f.label}</span>
                      <span className="text-sm font-bold text-white">{f.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {s.options.map(opt => (
                    <div key={opt} className="flex justify-between items-center p-4 hover:bg-white/[0.02] transition-colors rounded-20 group">
                      <span className="text-sm font-medium text-muted group-hover:text-white">{opt}</span>
                      <div className="w-10 h-5 rounded-full bg-brand-cyan/20 border border-brand-cyan/30 p-0.5 relative">
                        <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-brand-cyan shadow-[0_0_8px_rgba(0,242,255,0.5)]" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;
