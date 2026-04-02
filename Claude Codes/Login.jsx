import { useState, useEffect, useRef } from 'react';
import './Login.css';

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: [5,12,21,30,38,44,51,57,63,69,74,79,84,88,91,94,96,98][i],
  delay: [0,1.4,2.8,0.6,3.5,1.1,4.2,2.1,0.3,3.8,1.7,4.9,2.5,0.9,3.2,1.9,4.6,0.1][i],
  duration: [7,9,8,11,6.5,10,7.5,9.5,8.5,6,11.5,7,9,8,10.5,6.5,7.5,9][i],
  size: [2,1.5,2,1.5,2.5,1.5,2,2,1.5,2.5,1.5,2,1.5,2,2.5,1.5,2,1.5][i],
}));

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [phase, setPhase]       = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const cardRef = useRef(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    requestAnimationFrame(() => card.classList.add('card--visible'));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (phase === 'loading') return;
    setPhase('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      setPhase('success');
      // TODO: store tokens & redirect
    } catch (err) {
      setErrorMsg(err.message);
      setPhase('error');
      setTimeout(() => setPhase('idle'), 2500);
    }
  };

  return (
    <div className="login-root">

      {/* ── Background canvas ── */}
      <div className="bg-canvas" aria-hidden="true">
        <div className="bg-blob bg-blob--orange" />
        <div className="bg-blob bg-blob--indigo" />
        <div className="bg-grid" />
        {PARTICLES.map(p => (
          <span
            key={p.id}
            className="particle"
            style={{
              left:              `${p.left}%`,
              width:             `${p.size}px`,
              height:            `${p.size}px`,
              animationDelay:    `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* ── Login card ── */}
      <div className="login-card" ref={cardRef} role="main">

        {/* Logo */}
        <div className="logo" aria-label="BringIt">
          <span className="logo-bring">BRING</span><span className="logo-it">IT</span>
          <span className="logo-dot" aria-hidden="true" />
        </div>
        <p className="tagline">Your campus. Delivered.</p>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>

          <div className="field">
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder=" "
              required
              disabled={phase === 'loading' || phase === 'success'}
            />
            <label htmlFor="email">College email</label>
            <div className="field-line" />
          </div>

          <div className="field">
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder=" "
              required
              disabled={phase === 'loading' || phase === 'success'}
            />
            <label htmlFor="password">Password</label>
            <div className="field-line" />
          </div>

          <div className="forgot-row">
            <a href="/forgot-password" className="forgot-link" tabIndex={0}>Forgot password?</a>
          </div>

          {/* Error */}
          <div className={`error-banner ${phase === 'error' ? 'error-banner--visible' : ''}`} role="alert">
            {errorMsg}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className={`btn-submit btn-submit--${phase}`}
            disabled={phase === 'loading' || phase === 'success'}
          >
            <span className="btn-label">Sign in</span>
            <span className="btn-loading" aria-hidden="true">
              <svg className="spinner-ring" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="10" />
              </svg>
            </span>
            <span className="btn-success" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5L19 7" />
              </svg>
            </span>
          </button>

        </form>

        <p className="signup-row">
          New to BringIt?&ensp;<a href="/register" className="signup-link">Create account</a>
        </p>

        {/* Decorative corner accent */}
        <div className="card-corner card-corner--tl" aria-hidden="true" />
        <div className="card-corner card-corner--br" aria-hidden="true" />
      </div>
    </div>
  );
}
