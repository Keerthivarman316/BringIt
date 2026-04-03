import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, ShoppingBag, Briefcase, ChevronRight, Check, ArrowLeft, UserPlus, LayoutGrid } from 'lucide-react';
import axios from 'axios';

const Register = ({ setUser }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [role, setRole] = useState('REQUESTER');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async () => {
    setError('');
    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', {
        name,
        email,
        password,
        role,
        collegeName
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setUser(response.data.user);
      const dashboardPath = response.data.user.role === 'CARRIER' 
        ? '/dashboard/carrier' 
        : '/dashboard/requester';
      navigate(dashboardPath);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      setStep(1);
    }
  };

  const steps = [
    { id: 1, label: 'YOUR DETAILS' },
    { id: 2, label: 'CHOOSE ROLE' },
  ];

  return (
    <div className="w-full max-w-2xl p-4">
      <div className="glass rounded-[40px] p-6 md:p-12 border border-white/5 relative overflow-hidden">
        
        {/* Progress Header */}
        <div className="flex items-center justify-between mb-12 border-b border-white/5 pb-8">
          <div className="flex items-center gap-6">
            {steps.map(s => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                  step === s.id ? 'bg-brand-cyan text-bg-deep shadow-[0_0_15px_rgba(0,242,255,0.4)]' : 
                  step > s.id ? 'bg-brand-green text-white' : 'bg-white/5 text-muted'
                }`}>
                  {step > s.id ? <Check size={12} /> : s.id}
                </div>
                <span className={`text-[10px] font-mono tracking-widest uppercase ${step === s.id ? 'text-white' : 'text-muted'}`}>
                  {s.label}
                </span>
                {s.id === 1 && <div className="w-8 h-[1px] bg-white/10 mx-2" />}
              </div>
            ))}
          </div>
          {step === 1 ? (
             <Link to="/login" className="text-[10px] font-mono tracking-widest text-muted hover:text-brand-cyan transition-colors">BACK TO LOGIN</Link>
          ) : (
             <button onClick={() => setStep(1)} className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-muted hover:text-white"><ArrowLeft size={12} /> BACK</button>
          )}
        </div>

        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-4xl font-display text-white uppercase tracking-tight italic">Register</h2>
                  <p className="text-muted text-sm font-body">Create your BringIt account to get started.</p>
                </div>

                <div className="space-y-4">
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-cyan transition-colors" size={18} />
                    <input 
                      type="text" 
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-bg-surface/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-cyan/50 focus:bg-bg-card hover:border-white/10 transition-all text-white font-medium"
                    />
                  </div>

                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-cyan transition-colors" size={18} />
                    <input 
                      type="email" 
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-bg-surface/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-cyan/50 focus:bg-bg-card hover:border-white/10 transition-all text-white font-medium"
                    />
                  </div>

                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-cyan transition-colors" size={18} />
                    <input 
                      type="password" 
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-bg-surface/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-cyan/50 focus:bg-bg-card hover:border-white/10 transition-all text-white font-medium"
                    />
                  </div>

                  <div className="relative group">
                    <LayoutGrid size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-cyan transition-colors" />
                    <input 
                      type="text" 
                      placeholder="College Name (e.g. IIIT Dharwad)"
                      value={collegeName}
                      onChange={(e) => setCollegeName(e.target.value)}
                      className="w-full bg-bg-surface/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-cyan/50 focus:bg-bg-card hover:border-white/10 transition-all text-white font-medium"
                    />
                  </div>
                </div>

                {error && <p className="text-brand-red text-xs font-bold text-center">⚠ {error}</p>}

                <button 
                  onClick={() => name && email && password && collegeName && setStep(2)}
                  className="w-full bg-white text-bg-deep font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-brand-cyan hover:shadow-lg hover:shadow-brand-cyan/20 transition-all shadow-xl group"
                >
                  NEXT: CHOOSE ROLE <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-4xl font-display text-white uppercase tracking-tight italic">Choose Your Role</h2>
                  <p className="text-muted text-sm font-body">How would you like to use BringIt?</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => setRole('REQUESTER')}
                    className={`p-8 rounded-[32px] border transition-all flex flex-col items-center gap-4 text-center group ${
                      role === 'REQUESTER' ? 'bg-brand-cyan/10 border-brand-cyan shadow-[0_0_30px_rgba(0,242,255,0.1)]' : 'bg-bg-surface/30 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                      role === 'REQUESTER' ? 'bg-brand-cyan text-bg-deep' : 'bg-bg-surface text-muted group-hover:text-white'
                    }`}>
                      <ShoppingBag size={32} />
                    </div>
                    <div className="space-y-1">
                      <div className={`font-heading font-bold text-lg ${role === 'REQUESTER' ? 'text-white' : 'text-muted'}`}>Customer</div>
                      <div className="text-[10px] font-mono tracking-widest text-muted opacity-60 uppercase">Order anything</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => setRole('CARRIER')}
                    className={`p-8 rounded-[32px] border transition-all flex flex-col items-center gap-4 text-center group ${
                      role === 'CARRIER' ? 'bg-brand-cyan/10 border-brand-cyan shadow-[0_0_30px_rgba(0,242,255,0.1)]' : 'bg-bg-surface/30 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                      role === 'CARRIER' ? 'bg-brand-cyan text-bg-deep' : 'bg-bg-surface text-muted group-hover:text-white'
                    }`}>
                      <Briefcase size={32} />
                    </div>
                    <div className="space-y-1">
                      <div className={`font-heading font-bold text-lg ${role === 'CARRIER' ? 'text-white' : 'text-muted'}`}>Delivery Partner</div>
                      <div className="text-[10px] font-mono tracking-widest text-muted opacity-60 uppercase">Earn money</div>
                    </div>
                  </button>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-4">
                  <button 
                    onClick={handleRegister}
                    className="w-full bg-white text-bg-deep font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-brand-cyan hover:shadow-lg hover:shadow-brand-cyan/20 transition-all shadow-xl group"
                  >
                    CREATE ACCOUNT <Check size={20} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Register;
