import { useState, useRef } from 'react';
import type { Role } from '../../types';
import { CarSVG } from '../../components/ui/CarSVG';
import { Field } from '../../components/ui/Field';
import { Toast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useT } from '../../i18n/useT';
import { Icon } from '../../components/ui/Icon';
import { PalettePicker } from '../../components/layout/PalettePicker';

const supportedRoles: Role[] = ['customer', 'employee', 'admin', 'driver'];
const roleClaimNames = [
  'role',
  'roles',
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role',
];

function getRoleFromToken(token: string): Role | null {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))) as Record<string, unknown>;
    const roleClaim = roleClaimNames.map(name => payload[name]).find(value => value !== undefined);
    const claims = Array.isArray(roleClaim) ? roleClaim : [roleClaim];
    const role = claims.find(value => typeof value === 'string' && supportedRoles.includes(value.toLowerCase() as Role));
    return typeof role === 'string' ? role.toLowerCase() as Role : null;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const t = useT();
  const { dark, toggleDark } = useTheme();
  // After login() the <PublicOnlyRoute> guard redirects to the role's home page.
  const { login: onLogin } = useAuth();

  const [mode, setMode]       = useState<'login' | 'register'>('login');
  const [animState, setAnim]  = useState<'idle' | 'right' | 'left' | 'exit'>('idle');
  const [hasSwitchedMode, setHasSwitchedMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null);
  const modeSwitchLock = useRef(false);

  // Login form state
  const [email, setEmail]       = useState('');
  const [password, setPass]     = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});

  // Register form state
  const [rName, setRName]       = useState('');
  const [rEmail, setREmail]     = useState('');
  const [rPhone, setRPhone]     = useState('');
  const [rAddress, setRAddress] = useState('');
  const [rPass, setRPass]       = useState('');
  const [rPassC, setRPassC]     = useState('');
  const [showRPw, setShowRPw]   = useState(false);

  const switchMode = (to: 'login' | 'register') => {
    if (modeSwitchLock.current || animState !== 'idle' || to === mode) return;
    modeSwitchLock.current = true;
    setHasSwitchedMode(true);
    const dir = to === 'register' ? 'right' : 'left';
    setAnim(dir);
    window.setTimeout(() => setMode(to), 400);
    window.setTimeout(() => { setAnim('idle'); modeSwitchLock.current = false; }, 850);
  };

  const validateLogin = () => {
    const e: Record<string, string> = {};
    if (!email)    e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email address';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Min 6 characters';
    return e;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateLogin();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const apiUrl = ((import.meta.env.VITE_API_URL as string | undefined) || 'https://localhost:7260').replace(/\/$/, '');
      const response = await fetch(`${apiUrl}/Login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json().catch(() => null);
      const token = result?.token ?? result?.Token;
      if (!response.ok || !token) throw new Error(result?.error ?? result?.Error ?? 'Unable to sign in. Check your email and password.');
      const role = getRoleFromToken(token);
      if (!role) throw new Error('This account role is not supported by the available workspaces.');
      setAnim('exit');
      setTimeout(() => onLogin(role, token), 650);
    } catch (error) {
      setToast({ msg: error instanceof Error ? error.message : 'Unable to connect to the service.', type: 'error' });
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!rName)  errs.rName  = 'Name is required';
    if (!rEmail) errs.rEmail = 'Email is required';
    if (!rPhone) errs.rPhone = 'Phone is required';
    if (!rAddress) errs.rAddress = 'Address is required';
    if (!rPass)  errs.rPass  = 'Password is required';
    else if (rPass.length < 8) errs.rPass = 'Password must be at least 8 characters';
    if (rPass !== rPassC) errs.rPassC = 'Passwords do not match';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const apiUrl = ((import.meta.env.VITE_API_URL as string | undefined) || 'https://localhost:7260').replace(/\/$/, '');
      const response = await fetch(`${apiUrl}/auth/register/customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: rName, email: rEmail, phoneNumber: rPhone, address: rAddress, password: rPass, confirmPassword: rPassC }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const errors = result?.errors ?? result?.Errors;
        throw new Error(Array.isArray(errors) ? errors.join(' ') : result?.message ?? 'Unable to create the account.');
      }
      setToast({ msg: 'Account created. Please sign in.', type: 'success' });
      switchMode('login');
    } catch (error) {
      setToast({ msg: error instanceof Error ? error.message : 'Unable to connect to the service.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page min-h-screen flex">
      {/* ── Left panel ─────────────────────────────────────── */}
      <div className="auth-showroom hidden lg:flex flex-col justify-between relative overflow-hidden w-[55%]">
        {/* Decorative circles */}
        <div className="auth-orbit auth-orbit-one" />
        <div className="auth-orbit auth-orbit-two" />
        <div className="relative z-10 p-12">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center auth-brand-mark"
              style={{ background: 'rgba(255,255,255,0.12)' }}>
              <svg width="20" height="20" viewBox="0 0 220 80" fill="white"><rect x="18" y="30" width="184" height="34" rx="9" /><circle cx="58" cy="64" r="14" /><circle cx="168" cy="64" r="14" /></svg>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">{t.appName}</span>
          </div>
          <div className="auth-kicker">CSMS · DRIVE WITH CONFIDENCE</div>
          <h1 className="text-white font-bold leading-tight mb-4 auth-headline" style={{ fontSize: '40px' }}>
            {t.tagline}
          </h1>
          <p className="auth-showroom-copy text-base leading-relaxed">
            Book maintenance, rent a car, or request emergency help — all in one place.
          </p>
          <div className="flex gap-8 mt-10">
            {[['3', 'Branches'], ['48', 'Fleet Cars'], ['24/7', 'Support']].map(([n, l]) => (
              <div key={l}>
                <div className="text-white font-bold text-2xl">{n}</div>
                <div className="auth-showroom-stat text-sm">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────── */}
      <div className="auth-form-side flex-1 flex flex-col relative">
        {/* Top-right theme & palette controls */}
        <div className="flex items-center justify-between lg:justify-end gap-2 px-5 py-3.5 border-b lg:border-b-0" style={{ borderColor: 'var(--border)' }}>
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
              <svg width="14" height="14" viewBox="0 0 220 80" fill="white"><rect x="18" y="30" width="184" height="34" rx="9" /><circle cx="58" cy="64" r="14" /><circle cx="168" cy="64" r="14" /></svg>
            </div>
            <span className="font-bold text-base text-white">{t.appName}</span>
          </div>
          <div className="flex items-center gap-1 rounded-xl px-1.5 py-1 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <PalettePicker />
            <button
              type="button"
              onClick={toggleDark}
              className="btn btn-ghost btn-sm"
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={dark ? 'Light mode' : 'Dark mode'}
            >
              <Icon name={dark ? 'sun' : 'moon'} size={17} />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="auth-form-scroll flex-1 flex items-center justify-center p-6 pb-28 lg:pb-6">
          <div className={`auth-form-card auth-form-card--${mode} ${hasSwitchedMode ? '' : 'is-initial'} ${animState === 'right' || animState === 'left' ? 'is-switching' : ''} w-full max-w-sm`}>
            <div className="auth-form-topline"><span className="auth-status-dot" /> SECURE ACCOUNT PORTAL</div>
            {/* Form content */}
            <div className="form-panel">
              {mode === 'login' ? (
                <>
                  <h2 className="font-bold text-2xl mb-1" style={{ color: 'var(--text)' }}>{t.signIn}</h2>
                  <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>Enter your credentials to sign in</p>
                  <form onSubmit={handleLogin} noValidate className="space-y-4">
                    <Field label={t.email} error={errors.email}>
                      <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                        className={`inp ${errors.email ? 'error' : ''}`} placeholder="you@example.com"
                        autoComplete="email" aria-required="true" />
                    </Field>
                    <Field label={t.password} error={errors.password}>
                      <div className="inp-wrap">
                        <input type={showPw ? 'text' : 'password'} value={password}
                          onChange={e => { setPass(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                          className={`inp ${errors.password ? 'error' : ''}`} placeholder="••••••••"
                          autoComplete="current-password" aria-required="true" />
                        <button type="button" onClick={() => setShowPw(v => !v)}
                          className="absolute inset-y-0 right-3 flex items-center" style={{ color: 'var(--text-4)' }}
                          aria-label={showPw ? 'Hide password' : 'Show password'}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                            {showPw ? <><path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9 7-.2 1-1 2-2 3"/><path d="M6.2 6.2C3.8 7.6 2.3 10 2 12c.5 2.5 4 7 10 7 1 0 2-.2 2.8-.5"/></> : <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>}
                          </svg>
                        </button>
                      </div>
                    </Field>
                    <button type="submit" disabled={loading}
                      className="btn btn-primary btn-lg w-full mt-2" style={{ borderRadius: 'var(--r-md)' }}>
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
                          {t.loading}
                        </span>
                      ) : t.login}
                    </button>
                  </form>
                  <p className="text-center text-sm mt-5" style={{ color: 'var(--text-3)' }}>
                    {t.noAccount}{' '}
                    <button onClick={() => switchMode('register')} className="font-semibold" style={{ color: 'var(--primary)' }}>
                      {t.register}
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <h2 className="font-bold text-2xl mb-1" style={{ color: 'var(--text)' }}>{t.createAccount}</h2>
                  <p className="text-sm mb-5" style={{ color: 'var(--text-3)' }}>Join CSMS today</p>
                  <form onSubmit={handleRegister} noValidate className="space-y-3">
                    <Field label={t.fullName} error={errors.rName}>
                      <input type="text" value={rName} onChange={e => setRName(e.target.value)}
                        className={`inp ${errors.rName ? 'error' : ''}`} placeholder="Ahmed Hassan"
                        autoComplete="name" aria-required="true" />
                    </Field>
                    <Field label={t.email} error={errors.rEmail}>
                      <input type="email" value={rEmail} onChange={e => setREmail(e.target.value)}
                        className={`inp ${errors.rEmail ? 'error' : ''}`} placeholder="you@example.com"
                        autoComplete="email" />
                    </Field>
                    <Field label={t.phone} error={errors.rPhone}>
                      <input type="tel" value={rPhone} onChange={e => setRPhone(e.target.value)}
                        className={`inp ${errors.rPhone ? 'error' : ''}`} placeholder="+20 100 000 0000" />
                    </Field>
                    <Field label={t.address} error={errors.rAddress}>
                      <input type="text" value={rAddress} onChange={e => setRAddress(e.target.value)}
                        className={`inp ${errors.rAddress ? 'error' : ''}`} placeholder="Street, city"
                        autoComplete="street-address" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t.password} error={errors.rPass}>
                        <div className="inp-wrap">
                          <input type={showRPw ? 'text' : 'password'} value={rPass} onChange={e => setRPass(e.target.value)}
                            className={`inp ${errors.rPass ? 'error' : ''}`} placeholder="••••••••" />
                          <button type="button" onClick={() => setShowRPw(v => !v)}
                            className="absolute inset-y-0 right-3 flex items-center" style={{ color: 'var(--text-4)' }}
                            aria-label="Toggle password visibility"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button>
                        </div>
                      </Field>
                      <Field label={t.confirmPassword} error={errors.rPassC}>
                        <input type="password" value={rPassC} onChange={e => setRPassC(e.target.value)}
                          className={`inp ${errors.rPassC ? 'error' : ''}`} placeholder="••••••••" />
                      </Field>
                    </div>
                    <button type="submit" disabled={loading}
                      className="btn btn-primary btn-lg w-full mt-1" style={{ borderRadius: 'var(--r-md)' }}>
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
                          {t.loading}
                        </span>
                      ) : t.createAccount}
                    </button>
                  </form>
                  <p className="text-center text-sm mt-4" style={{ color: 'var(--text-3)' }}>
                    {t.hasAccount}{' '}
                    <button onClick={() => switchMode('login')} className="font-semibold" style={{ color: 'var(--primary)' }}>
                      {t.signIn}
                    </button>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Road + Car transition */}
        <div className="login-road auth-road">
          <div className={`road-dashes ${animState !== 'idle' ? 'animating' : ''}`} />
        </div>
        <div className="car-track">
          <CarSVG
            className={`car-anim ${animState === 'right' ? 'drive-right' : animState === 'left' ? 'drive-left' : animState === 'exit' ? 'drive-exit' : ''}`}
          />
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
