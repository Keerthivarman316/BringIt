import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ChevronRight, ShieldCheck } from 'lucide-react';
import axios from 'axios';

const Login = ({ setUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setUser(response.data.user);
      const dashboardPath = response.data.user.role === 'CARRIER' 
        ? '/dashboard/carrier' 
        : '/dashboard/requester';
      navigate(dashboardPath);
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed.');
    }
  };

  return (
    <div className="w-full max-w-md p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-[40px] p-10 border border-white/5 space-y-10"
      >
        <div className="space-y-4 text-center">
          <div className="inline-flex p-4 rounded-3xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan mb-2">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-4xl font-display uppercase tracking-tight text-white italic">Clearance</h1>
          <p className="text-muted text-sm font-body max-w-[240px] mx-auto">Authorize your session to access the BringIt grid.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-cyan transition-colors" size={18} />
              <input 
                type="email" 
                placeholder="Clearance Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bg-surface/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-cyan/50 focus:bg-bg-card transition-all text-white font-medium"
                required
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-cyan transition-colors" size={18} />
              <input 
                type="password" 
                placeholder="Secure Key"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-surface/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-cyan/50 focus:bg-bg-card transition-all text-white font-medium"
                required
              />
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-brand-red text-xs font-bold text-center px-4"
            >
              ⚠ {error}
            </motion.p>
          )}

          <button 
            type="submit"
            className="w-full bg-white text-bg-deep font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-brand-cyan transition-all shadow-xl shadow-brand-cyan/10 group"
          >
            AUTHORIZE <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="text-center">
          <p className="text-xs text-muted font-medium">
            New operative? <Link to="/register" className="text-brand-cyan hover:underline decoration-cyan-500/30 underline-offset-4">Request Access</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
