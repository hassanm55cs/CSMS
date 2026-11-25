import { useState, useRef } from 'react';
import type { Role } from '../../types';
import { CarSVG } from '../../components/ui/CarSVG';
import { Field } from '../../components/ui/Field';
import { Toast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n/useT';

export default function LoginPage() {
  const t = useT();
  // After login() the <PublicOnlyRoute> guard redirects to the role's home page.
  const { login: onLogin } = useAuth();

  const [mode, setMode]       = useState<'login' | 'register'>('login');
  const [role, setRole]       = useState<Role>('customer');
  const [animState, setAnim]  = useState<'idle' | 'right' | 'left' | 'exit'>('idle');
  const [formVisible, setFV]  = useState(true);
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null);
  const carRef = useRef<HTMLDivElement>(null);

  // Login form state
  const [email, setEmail]       = useState('');
  const [password, setPass]     = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});

  // Register form state
  const [rName, setRName]       = useState('');
  const [rEmail, setREmail]     = useState('');
  const [rPhone, setRPhone]     = useState('');
  const [rPass, setRPass]       = useState('');
  const [rPassC, setRPassC]     = useState('');
  const [showRPw, setShowRPw]   = useState(false);

  const switchMode = (to: 'login' | 'register') => {
    if (animState !== 'idle') return;
    const dir = to === 'register' ? 'right' : 'left';
    setAnim(dir);
    setFV(false);
    setTimeout(() => { setMode(to); setFV(true); }, 400);
    setTimeout(() => setAnim('idle'), 850);
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
    // API: POST /api/v1/auth/login  { email, password }
    // Returns: { token: string, user: UserDto, role: Role }
    await new Promise(r => setTimeout(r, 1200));
    setAnim('exit');
    setTimeout(() => onLogin(role), 650);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!rName)  errs.rName  = 'Name is required';
    if (!rEmail) errs.rEmail = 'Email is required';
    if (!rPhone) errs.rPhone = 'Phone is required';
    if (!rPass)  errs.rPass  = 'Password is required';
    if (rPass !== rPassC) errs.rPassC = 'Passwords do not match';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    // API: POST /api/v1/auth/register  { fullName, email, phone, password }
    await new Promise(r => setTimeout(r, 1400));
    setToast({ msg: 'Account created! Signing you in…', type: 'success' });
    setTimeout(() => { setAnim('exit'); setTimeout(() => onLogin(role), 650); }, 800);
  };

  const roles: { id: Role; label: string; icon: string }[] = [
    { id: 'customer', label: t.customer, icon: '👤' },
    { id: 'employee', label: t.employee, icon: '🔧' },
    { id: 'admin',    label: t.admin,    icon: '⚙️'  },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* ── Left panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden w-[55%]"
        style={{ background: 'linear-gradient(145deg, #1E3A8A 0%, #2563EB 50%, #1D4ED8 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'white' }} />
        <div className="absolute bottom-20 -right-10 w-60 h-60 rounded-full opacity-10"
          style={{ background: 'white' }} />
        <div className="relative z-10 p-12">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              <svg width="20" height="20" viewBox="0 0 220 80" fill="white"><rect x="18" y="30" width="184" height="34" rx="9" /><circle cx="58" cy="64" r="14" /><circle cx="168" cy="64" r="14" /></svg>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">{t.appName}</span>
          </div>
          <h1 className="text-white font-bold leading-tight mb-4" style={{ fontSize: '40px' }}>
            {t.tagline}
          </h1>
          <p className="text-blue-200 text-base leading-relaxed">
            Book maintenance, rent a car, or request emergency help — all in one place.
          </p>
          <div className="flex gap-8 mt-10">
            {[['3', 'Branches'], ['48', 'Fleet Cars'], ['24/7', 'Support']].map(([n, l]) => (
              <div key={l}>
                <div className="text-white font-bold text-2xl">{n}</div>
                <div className="text-blue-300 text-sm">{l}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Car illustration area */}
        <div className="relative z-10 px-12 pb-0">
          <img
            src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=700&h=350&fit=crop&auto=format"
            alt="Luxury car"
            className="w-full rounded-t-2xl object-cover opacity-60"
            style={{ height: '200px' }}
          />
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative" style={{ background: 'var(--surface)' }}>
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-2 p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
            <svg width="14" height="14" viewBox="0 0 220 80" fill="white"><rect x="18" y="30" width="184" height="34" rx="9" /><circle cx="58" cy="64" r="14" /><circle cx="168" cy="64" r="14" /></svg>
          </div>
          <span className="font-bold text-base" style={{ color: 'var(--text)' }}>{t.appName}</span>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center p-6 pb-28 lg:pb-6">
          <div className="w-full max-w-sm">
            {/* Role selector */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {roles.map(r => (
                <button key={r.id} onClick={() => setRole(r.id)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${role === r.id ? 'border-blue-500' : 'border-transparent'}`}
                  style={{ background: role === r.id ? 'var(--primary-light)' : 'var(--surface-2)' }}>
                  <div className="text-xl mb-0.5">{r.icon}</div>
                  <div className="text-xs font-semibold" style={{ color: role === r.id ? 'var(--primary)' : 'var(--text-3)' }}>{r.label}</div>
                </button>
              ))}
            </div>

            {/* Form content */}
            <div className={`form-panel ${!formVisible ? 'exiting' : 'entering'}`}>
              {mode === 'login' ? (
                <>
                  <h2 className="font-bold text-2xl mb-1" style={{ color: 'var(--text)' }}>{t.signIn}</h2>
                  <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>{t.hasAccount.replace('Already have', 'Enter your credentials to')}</p>
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
                          {showPw ? '🙈' : '👁'}
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
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t.password} error={errors.rPass}>
                        <div className="inp-wrap">
                          <input type={showRPw ? 'text' : 'password'} value={rPass} onChange={e => setRPass(e.target.value)}
                            className={`inp ${errors.rPass ? 'error' : ''}`} placeholder="••••••••" />
                          <button type="button" onClick={() => setShowRPw(v => !v)}
                            className="absolute inset-y-0 right-3 flex items-center" style={{ color: 'var(--text-4)' }}
                            aria-label="Toggle password visibility">{showRPw ? '🙈' : '👁'}</button>
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

        {/* Road + Car animation strip */}
        <div className="login-road">
          <div className={`road-dashes ${animState !== 'idle' ? 'animating' : ''}`} />
        </div>
        <div className="car-track" ref={carRef}>
          <CarSVG
            className={`car-anim ${animState === 'right' ? 'drive-right' : animState === 'left' ? 'drive-left' : animState === 'exit' ? 'drive-exit' : ''}`}
          />
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
