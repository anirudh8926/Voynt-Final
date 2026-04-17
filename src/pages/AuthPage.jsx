import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useVoynt } from '../context/VoyntContext';
import Ticker from '../components/Ticker';
import '../styles/auth.css';

function getStrength(pw) {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
}
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_CLASSES = ['', 'lit-weak', 'lit-fair', 'lit-good', 'lit-strong'];
const GOALS = [
    { icon: '✈', title: 'Travel & Flights', desc: 'Redeem miles for flights, hotels, upgrades.' },
    { icon: '💰', title: 'Cashback', desc: 'Maximum cashback across all spending.' },
    { icon: '🎁', title: 'Gift Cards', desc: 'Redeem for Amazon, Flipkart, and more.' },
    { icon: '🏦', title: 'Statement Credit', desc: 'Reduce your credit card bill directly.' },
];
const CARDS = ['HDFC Regalia Gold', 'Axis Atlas', 'Amex MRCC', 'SBI SimplyCLICK', 'ICICI Amazon Pay', 'HDFC Millennia', 'HDFC Infinia', 'Axis Vistara', 'SBI Air India'];

export default function AuthPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, setUser } = useVoynt();

    useEffect(() => {
        if (user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, navigate]);
    const [mode, setMode] = useState(location.hash === '#signup' ? 'signup' : 'login');
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', goal: '', card: '' });
    const [showPw, setShowPw] = useState(false);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [generalError, setGeneralError] = useState('');

    const pwStrength = getStrength(form.password);
    const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

    function validate() {
        const e = {};
        if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
        if (!form.password || form.password.length < 8) e.password = '8+ characters required';
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function handleLogin(e) {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true); setGeneralError('');
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        setLoading(false);
        if (error) { setGeneralError(error.message); return; }
        navigate('/onboarding');
    }

    async function handleSignup(e) {
        e.preventDefault();
        if (step < 3) { setStep(s => s + 1); return; }
        if (!validate()) return;
        setLoading(true); setGeneralError('');
        const { error } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { first_name: form.firstName, last_name: form.lastName } } });
        setLoading(false);
        if (error) { setGeneralError(error.message); return; }
        setUser({ firstName: form.firstName, lastName: form.lastName });
        navigate('/onboarding');
    }

    return (
        <div style={{ background: 'var(--black)', color: 'var(--white)', minHeight: '100vh' }}>
            <Ticker />
            <div className="bg-glow" /><div className="bg-grid" /><div className="bg-scan" />
            <nav className="dark">
                <Link className="logo" to="/">Voy<span className="ln">n</span>t</Link>
                <div className="nav-right">
                    <Link className="nav-back" to="/" style={{ cursor: 'none' }}><span className="arr">←</span> Home</Link>
                </div>
            </nav>
            <main className="auth-main">
                <div className="form-panel">
                    <div className="security-pulse"><div className="pulse-dot" /> End-to-end encrypted &nbsp;·&nbsp; Supabase Auth</div>
                    <div className="terminal-header">
                        <div className="page-title">{mode === 'login' ? <>Welcome <span className="accent">back.</span></> : <>Create your <span className="accent">account.</span></>}</div>
                        <div className="page-subtitle">{mode === 'login' ? 'Secure login with Supabase Auth.' : 'Set up your Voynt profile and start planning.'}</div>
                    </div>
                    <div className="auth-toggle">
                        <div className={`toggle-indicator ${mode === 'signup' ? 'right' : ''}`} />
                        <button className={`toggle-btn-auth ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setStep(1); }}>Log in</button>
                        <button className={`toggle-btn-auth ${mode === 'signup' ? 'active' : ''}`} onClick={() => { setMode('signup'); setStep(1); }}>Sign up</button>
                    </div>
                    {generalError && <div style={{ fontSize: 12, color: 'rgba(220,80,80,.8)', marginBottom: 16, textAlign: 'center', padding: '8px 14px', border: '1px solid rgba(220,80,80,.2)', borderRadius: 6, background: 'rgba(220,80,80,.05)' }}>{generalError}</div>}

                    {mode === 'login' ? (
                        <div className="auth-card">
                            <div className="social-row">
                                <button className="btn-social" onClick={async () => { await supabase.auth.signInWithOAuth({ provider: 'google' }); }}>
                                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                    Continue with Google
                                </button>
                            </div>
                            <div className="divider"><div className="divider-line" /><span className="divider-text">or</span><div className="divider-line" /></div>
                            <form onSubmit={handleLogin}>
                                <div className={`field-group ${errors.email ? 'error' : ''}`}>
                                    <input className="form-input" type="email" id="login-email" placeholder="Email address" value={form.email} onChange={e => upd('email', e.target.value)} autoComplete="email" />
                                    <label className="floating-label" htmlFor="login-email">Email address</label>
                                    <div className="field-error">{errors.email}</div>
                                </div>
                                <div className={`field-group password-wrap ${errors.password ? 'error' : ''}`}>
                                    <input className="form-input" type={showPw ? 'text' : 'password'} id="login-pw" placeholder="Password" value={form.password} onChange={e => upd('password', e.target.value)} autoComplete="current-password" />
                                    <label className="floating-label" htmlFor="login-pw">Password</label>
                                    <button type="button" className="pwd-toggle" onClick={() => setShowPw(s => !s)}>{showPw ? '◑' : '◐'}</button>
                                    <div className="field-error">{errors.password}</div>
                                </div>
                                <a className="forgot-link" href="#">Forgot password?</a>
                                <button type="submit" className="btn-hero" style={{ width: '100%', fontSize: 12, padding: 14, justifyContent: 'center' }} disabled={loading}>{loading ? 'Logging in…' : <>Log in <span className="arrow">→</span></>}</button>
                            </form>
                            <div className="trust-row">
                                <div className="trust-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>Secured by Supabase</div>
                                <div className="trust-sep" />
                                <div className="trust-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>TLS 1.3 encrypted</div>
                            </div>
                            <div className="bottom-note">Don't have an account? <a href="#" onClick={e => { e.preventDefault(); setMode('signup'); }}>Sign up free →</a></div>
                        </div>
                    ) : (
                        <div className="auth-card">
                            <div className="step-indicators">
                                {[1, 2, 3].map(n => (
                                    <React.Fragment key={n}>
                                        <div className={`step-dot ${step === n ? 'active' : step > n ? 'done' : ''}`}>{step > n ? '✓' : n}</div>
                                        {n < 3 && <div className={`step-connector ${step > n ? 'done' : ''}`} />}
                                    </React.Fragment>
                                ))}
                            </div>
                            {step === 1 && (
                                <div className="form-step active">
                                    <div className="step-label-row"><span className="step-num-tag">01 / 03</span></div>
                                    <div style={{ fontSize: 16, fontFamily: "'BL Melody',sans-serif", fontWeight: 800, color: 'var(--white)', marginBottom: 6 }}>Your details</div>
                                    <div style={{ fontSize: 13, color: 'rgba(151,198,177,.4)', marginBottom: 24 }}>How should we address you?</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                        <div className="field-group"><input className="form-input" placeholder="First name" value={form.firstName} onChange={e => upd('firstName', e.target.value)} /><label className="floating-label">First name</label></div>
                                        <div className="field-group"><input className="form-input" placeholder="Last name" value={form.lastName} onChange={e => upd('lastName', e.target.value)} /><label className="floating-label">Last name</label></div>
                                    </div>
                                    <button className="btn-hero" style={{ width: '100%', justifyContent: 'center', padding: 14 }} onClick={() => setStep(2)} disabled={!form.firstName}>Continue <span className="arrow">→</span></button>
                                </div>
                            )}
                            {step === 2 && (
                                <div className="form-step active">
                                    <div className="step-label-row"><span className="step-num-tag">02 / 03</span></div>
                                    <div style={{ fontSize: 16, fontFamily: "'BL Melody',sans-serif", fontWeight: 800, color: 'var(--white)', marginBottom: 6 }}>Your goal</div>
                                    <div style={{ fontSize: 13, color: 'rgba(151,198,177,.4)', marginBottom: 24 }}>What do you primarily want to earn?</div>
                                    <div className="goal-grid">
                                        {GOALS.map(g => (
                                            <div key={g.title} className={`goal-card ${form.goal === g.title ? 'selected' : ''}`} onClick={() => upd('goal', g.title)}>
                                                <div className="goal-icon">{g.icon}</div>
                                                <div className="goal-title">{g.title}</div>
                                                <div className="goal-desc">{g.desc}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                        <button className="btn-back-ob" onClick={() => setStep(1)}>← Back</button>
                                        <button className="btn-hero-ob" onClick={() => setStep(3)} disabled={!form.goal}>Continue <span className="arrow">→</span></button>
                                    </div>
                                </div>
                            )}
                            {step === 3 && (
                                <div className="form-step active">
                                    <div className="step-label-row"><span className="step-num-tag">03 / 03</span></div>
                                    <div style={{ fontSize: 16, fontFamily: "'BL Melody',sans-serif", fontWeight: 800, color: 'var(--white)', marginBottom: 6 }}>Create your login</div>
                                    <div style={{ fontSize: 13, color: 'rgba(151,198,177,.4)', marginBottom: 24 }}>Secure your Voynt account.</div>
                                    <form onSubmit={handleSignup}>
                                        <div className={`field-group ${errors.email ? 'error' : ''}`}><input className="form-input" type="email" placeholder="Email address" value={form.email} onChange={e => upd('email', e.target.value)} /><label className="floating-label">Email address</label><div className="field-error">{errors.email}</div></div>
                                        <div className={`field-group password-wrap ${errors.password ? 'error' : ''}`}>
                                            <input className="form-input" type={showPw ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={e => upd('password', e.target.value)} />
                                            <label className="floating-label">Password</label>
                                            <button type="button" className="pwd-toggle" onClick={() => setShowPw(s => !s)}>{showPw ? '◑' : '◐'}</button>
                                            <div className="field-error">{errors.password}</div>
                                            <div className="strength-meter">
                                                <div className="strength-bars">{[1, 2, 3, 4].map(i => <div key={i} className={`strength-bar ${form.password && i <= pwStrength ? STRENGTH_CLASSES[pwStrength] : ''}`} />)}</div>
                                                <div className="strength-label"><span>Password strength</span><span className="strength-val">{form.password ? STRENGTH_LABELS[pwStrength] : ''}</span></div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                            <button type="button" className="btn-back-ob" onClick={() => setStep(2)}>← Back</button>
                                            <button type="submit" className="btn-hero-ob" disabled={loading}>{loading ? 'Creating…' : <>Create Account <span className="arrow">→</span></>}</button>
                                        </div>
                                    </form>
                                </div>
                            )}
                            <div className="bottom-note" style={{ marginTop: 16 }}>Already have an account? <a href="#" onClick={e => { e.preventDefault(); setMode('login'); }}>Log in →</a></div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
