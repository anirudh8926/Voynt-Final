import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoynt } from '../context/VoyntContext';
import { supabase } from '../lib/supabase';
import { pollStatus, getResults } from '../lib/api';
import { getCardConfig } from '../data/cards';
import SimulationGraph from '../components/SimulationGraph';
import '../styles/dashboard.css';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const SIM_HISTORY_KEY = 'voynt_sim_history';
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

const CARDS_LIST = [
    'HDFC Regalia Gold', 'HDFC Millennia', 'HDFC Infinia Metal Edition',
    'Axis Atlas', 'Axis Vistara Signature', 'Axis Magnus',
    'Amex Membership Rewards Credit', 'SBI SimplyCLICK', 'ICICI Amazon Pay', 'None of these',
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function fmt(val) {
    val = parseInt(val, 10);
    if (isNaN(val)) return '0';
    if (val >= 100000) return '₹' + (val / 100000).toFixed(val % 100000 === 0 ? 0 : 1) + 'L';
    return '₹' + val.toLocaleString('en-IN');
}

function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function today() {
    return new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function loadHistory() {
    try { return JSON.parse(localStorage.getItem(SIM_HISTORY_KEY) || '[]'); } catch { return []; }
}

function saveHistory(arr) {
    try { localStorage.setItem(SIM_HISTORY_KEY, JSON.stringify(arr.slice(0, 10))); } catch { }
}

function getCardMeta(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('hdfc')) return { bank: 'HDFC', accent: '#97C6B1', suffix: '4821' };
    if (n.includes('axis')) return { bank: 'Axis', accent: '#629F86', suffix: '7732' };
    if (n.includes('amex')) return { bank: 'Amex', accent: '#CAE9D9', suffix: '3348' };
    if (n.includes('sbi')) return { bank: 'SBI', accent: '#7BB5A0', suffix: '6614' };
    if (n.includes('icici')) return { bank: 'ICICI', accent: '#84C4A8', suffix: '9953' };
    return { bank: 'Card', accent: '#629F86', suffix: '0000' };
}

function getRewardLabel(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('regalia') || n.includes('atlas') || n.includes('infinia')) return '5x Miles';
    if (n.includes('millennia') || n.includes('simplyclick') || n.includes('amazon')) return '5% Cashback';
    if (n.includes('mrcc')) return '5x Membership';
    if (n.includes('magnus')) return '12x EDGE';
    return '2x Rewards';
}

function readCardsOwned() {
    try {
        const p = JSON.parse(sessionStorage.getItem('voynt_profile') || 'null');
        return (p?.cards_owned || []).filter(c => c && c !== 'None of these');
    } catch { return []; }
}

/* ─── Visual Credit Card ─────────────────────────────────────────────────── */
function VisualCard({ name, isActive, onClick }) {
    const { bank, accent, suffix } = getCardMeta(name);
    const reward = getRewardLabel(name);
    return (
        <div onClick={() => onClick(name)} style={{
            width: '100%', minHeight: 168,
            background: `linear-gradient(135deg, #111210 0%, #1a1f1c 60%, ${accent}22 100%)`,
            border: `1px solid ${isActive ? accent : 'rgba(151,198,177,.12)'}`,
            borderRadius: 12, padding: '20px 20px 16px',
            cursor: 'pointer', position: 'relative', overflow: 'hidden',
            transition: 'all .2s',
            boxShadow: isActive ? `0 8px 28px ${accent}30` : '0 2px 12px rgba(0,0,0,.3)',
            transform: isActive ? 'translateY(-2px)' : 'none',
        }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${accent},transparent)`, opacity: .5 }} />
            <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: accent, opacity: .55 }} />
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${accent}99`, marginLeft: -10 }} />
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: accent, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 24 }}>{bank}</div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 18, alignItems: 'center' }}>
                {['●●●●', '●●●●', '●●●●'].map((g, i) => (
                    <span key={i} style={{ fontSize: 7, letterSpacing: 3, color: 'rgba(151,198,177,.3)' }}>{g}</span>
                ))}
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: 'rgba(151,198,177,.65)', letterSpacing: '2px' }}>{suffix}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <div style={{ fontSize: 8, color: 'rgba(151,198,177,.3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Card Name</div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: 'rgba(151,198,177,.75)' }}>{name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 8, color: 'rgba(151,198,177,.3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Reward</div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: accent }}>{reward}</div>
                </div>
            </div>
        </div>
    );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function DashboardPage() {
    const navigate = useNavigate();
    const { profile, results: ctxResults, sessionId, user, setResults, setUser } = useVoynt();

    const [results, setLocalResults] = useState(null);
    const [polling, setPolling] = useState(false);
    const [history, setHistory] = useState(loadHistory);
    const [activeCard, setActiveCard] = useState(null);

    const scoreCircleRef = useRef(null);
    const scoreNumRef = useRef(null);

    const firstName = user?.firstName || sessionStorage.getItem('voynt_firstName') || 'there';
    const fullName = (user?.firstName && user?.lastName) ? `${user.firstName} ${user.lastName}` : (user?.firstName || 'User');
    const initial = (user?.firstName?.[0] || 'U').toUpperCase();
    const strategy = results?.strategy;
    const yieldRes = results?.yield_result;
    const latestSim = history[0] || null;

    // Determine derived cards
    let displayCards = [];
    if (strategy?.recommended_cards) {
        // Dedup and extract card names directly from the optimal sequence
        displayCards = Array.from(new Set(strategy.recommended_cards.map(c => c.card_name)));
    } else if (!latestSim && !polling) {
        // Fallback to onboarding state only if they've never simulated at all
        displayCards = readCardsOwned();
    }

    /* ── Load results on mount ──────────────────────────────────────────── */
    useEffect(() => {
        const sid = sessionId || sessionStorage.getItem('voynt_session_id');
        if (!sid) return;

        // Use context results directly if the session_id matches — skip re-polling
        if (ctxResults && sessionId === sid) {
            setLocalResults(ctxResults);
            return;
        }

        setPolling(true);
        const intervalId = pollStatus(
            sid,
            () => {
                getResults(sid).then(r => {
                    setLocalResults(r);
                    setResults(r);
                    setPolling(false);
                    addToHistory(r, sid);
                }).catch(() => setPolling(false));
            },
            () => setPolling(false),
        );
        return () => clearInterval(intervalId);
    }, []);

    /* ── Animate yield ring ─────────────────────────────────────────────── */
    useEffect(() => {
        if (!latestSim || !scoreCircleRef.current) return;
        // Normalise: treat 5% yield as a "full" ring (excellent portfolio)
        // latestSim.yield_index is already stored as percentage value (e.g. 1.5 for 1.5%)
        const MAX_YIELD_PCT = 5;
        const pct = Math.max(0, Math.min(100, (latestSim.yield_index / MAX_YIELD_PCT) * 100));
        const C = 289.03;
        setTimeout(() => {
            if (scoreCircleRef.current) scoreCircleRef.current.style.strokeDashoffset = String(C - C * pct / 100);
            if (scoreNumRef.current) scoreNumRef.current.textContent = latestSim.yield_index.toFixed(2);
        }, 400);
    }, [latestSim]);

    /* ── Helpers ────────────────────────────────────────────────────────── */
    function addToHistory(r, sid) {
        if (!r?.strategy) return;
        const goalText = sessionStorage.getItem('voynt_goal_text') || 'Reward goal';
        setHistory(prev => {
            if (prev.some(e => e.session_id === sid)) return prev;
            const entry = {
                session_id: sid,
                goal_text: goalText,
                date: new Date().toISOString(),
                total_rewards_inr: r.strategy?.total_rewards_inr || 0,
                total_fees_inr: r.strategy?.total_fees_inr || 0,
                net_value_inr: r.strategy?.net_value_inr || 0,
                yield_index: (r.yield_result?.yield_index || 0) * 100,
                break_even_month: r.yield_result?.break_even_month || null,
                ai_narrative: r.ai_narrative || '',
            };
            const updated = [entry, ...prev];
            saveHistory(updated);
            return updated;
        });
    }

    function handleCardClick(name) {
        if (activeCard === name) { setActiveCard(null); return; }
        setActiveCard(name);
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        sessionStorage.clear();
        setUser(null);
        navigate('/auth');
    }

    /* ─── JSX ───────────────────────────────────────────────────────────── */
    return (
        <div style={{ background: 'var(--black)', color: 'var(--white)', fontFamily: "'IBM Plex Mono',monospace" }}>
            <div className="bg-glow" /><div className="bg-grid" />

            {/* ── SIDEBAR ──────────────────────────────────────────────── */}
            <div className="sidebar">
                <span className="sb-logo">Voy<span style={{ color: 'var(--beauty)' }}>n</span>t</span>
                <div className="sb-section">Navigation</div>
                <nav className="sb-nav">
                    <span className="sb-link active">
                        <span>◈</span> Dashboard
                    </span>
                    <span className="sb-link" onClick={() => navigate('/simulation')}>
                        <span>⬡</span> Simulations
                    </span>
                    <span className="sb-link" onClick={() => navigate('/cards')}>
                        <span>▤</span> Cards
                    </span>
                </nav>
                <div className="sb-bottom">
                    <button onClick={handleLogout} style={{
                        width: '100%', background: 'transparent', border: '1px solid rgba(151,198,177,.1)',
                        borderRadius: 6, padding: '8px 12px', color: 'rgba(151,198,177,.4)',
                        fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, cursor: 'pointer',
                        letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 16, transition: 'all .2s',
                    }}>Sign out</button>
                    <div className="sb-user">
                        <div className="sb-avatar">{initial}</div>
                        <div className="sb-user-info">
                            <div className="sb-user-name">{fullName}</div>
                            <div className="sb-user-tag">Strategy active</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── MAIN ─────────────────────────────────────────────────── */}
            <div className="main-dash">

                {/* Topbar */}
                <div className="topbar">
                    <div className="topbar-left">
                        <div className="topbar-greeting">{greeting()}, <span className="accent">{firstName}</span>.</div>
                        <div className="topbar-date">{today()}</div>
                    </div>
                    <div className="topbar-right">
                        <div className="pulse-badge">
                            <span className="pulse-dot" />
                            {polling ? 'Processing…' : 'Strategy Active'}
                        </div>
                    </div>
                </div>

                {/* ── DASHBOARD CONTENT ───────────────────────────────── */}
                <div className="content">

                    {/* Stat cards — only render when we have real data */}
                    <div className="stat-row">
                        {[
                            { label: 'Total Rewards', val: strategy ? fmt(strategy.total_rewards_inr) : latestSim ? fmt(latestSim.total_rewards_inr) : polling ? '…' : '—', delta: (strategy?.net_value_inr ?? latestSim?.net_value_inr) > 0 ? `+${fmt(strategy?.net_value_inr ?? latestSim?.net_value_inr)} net` : null, icon: '💎' },
                            { label: 'Annual Fees', val: strategy ? fmt(strategy.total_fees_inr) : latestSim?.total_fees_inr != null ? fmt(latestSim.total_fees_inr) : polling ? '…' : '—', delta: null, icon: '📄' },
                            { label: 'Net Value', val: strategy ? fmt(strategy.net_value_inr) : latestSim ? fmt(latestSim.net_value_inr) : polling ? '…' : '—', delta: (strategy?.net_value_inr ?? latestSim?.net_value_inr) >= 0 ? 'Positive ROI' : 'Review fees', icon: '📈' },
                            { label: 'Yield Index', val: yieldRes ? (yieldRes.yield_index * 100).toFixed(2) + '%' : latestSim ? latestSim.yield_index.toFixed(2) + '%' : polling ? '…' : '—', delta: (yieldRes?.break_even_month ?? latestSim?.break_even_month) ? `Break-even mo. ${yieldRes?.break_even_month ?? latestSim?.break_even_month}` : null, icon: '⚡' },
                        ].map(c => (
                            <div className="stat-card" key={c.label}>
                                <div className="stat-icon">{c.icon}</div>
                                <div className="stat-label">{c.label}</div>
                                <div className="stat-value">{c.val}</div>
                                {c.delta && <div className={`stat-delta ${c.delta.startsWith('+') || c.delta === 'Positive ROI' ? 'up' : 'neutral'}`}>{c.delta}</div>}
                            </div>
                        ))}
                    </div>

                    {/* Two column layout */}
                    <div className="grid-2" style={{ alignItems: 'flex-start' }}>

                        {/* ── Your Current Cards ── */}
                        <div className="panel">
                            <div className="panel-header">
                                <div className="panel-title">Strategy Card Stack</div>
                                <div className="panel-badge">{displayCards.length} card{displayCards.length !== 1 ? 's' : ''}</div>
                            </div>
                            {displayCards.length === 0 ? (
                                <div style={{ fontSize: 12, color: 'rgba(151,198,177,.3)', lineHeight: 1.8 }}>
                                    {polling ? 'Extracting cards from strategy...' : 'Run a simulation to view your optimal card stack.'}
                                </div>
                            ) : (
                                displayCards.map((card, idx) => {
                                    const name = typeof card === 'string' ? card : card.name;
                                    const isActive = activeCard === name;
                                    const config = getCardConfig(name);
                                    
                                    return (
                                        <div key={idx} style={{ marginBottom: 14 }}>
                                            <VisualCard name={name} isActive={isActive} onClick={handleCardClick} />
                                            {isActive && config && (
                                                <div style={{ borderLeft: '2px solid rgba(98,159,134,.4)', marginLeft: 8, paddingLeft: 14, paddingTop: 12, paddingBottom: 8, marginTop: 2 }}>
                                                    <div style={{ fontSize: 13, color: 'var(--white)', fontFamily: "'BL Melody',sans-serif", fontWeight: 800, marginBottom: 8 }}>{config.title}</div>
                                                    
                                                    {config.highlights && config.highlights.map((h, i) => (
                                                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                                                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--beauty)', flexShrink: 0, marginTop: 5 }} />
                                                            <span style={{ fontSize: 11, color: 'rgba(151,198,177,.8)', lineHeight: 1.5 }}>{h}</span>
                                                        </div>
                                                    ))}
                                                    
                                                    {config.stats && (
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 10, marginTop: 12, background: 'rgba(98,159,134,.05)', border: '1px solid rgba(98,159,134,.1)', padding: 10, borderRadius: 8 }}>
                                                            {config.stats.map(([val, lbl], i) => (
                                                                <div key={i}>
                                                                    <div style={{ color: 'var(--beauty)', fontFamily: "'BL Melody',sans-serif", fontWeight: 800, fontSize: 16 }}>{val}</div>
                                                                    <div style={{ fontSize: 8, color: 'rgba(151,198,177,.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>{lbl}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                                                        {config.tags && config.tags.map(t => (
                                                            <span key={t} style={{ fontSize: 9, color: 'rgba(151,198,177,.5)', border: '1px solid rgba(151,198,177,.2)', padding: '2px 8px', borderRadius: 4, letterSpacing: '1px', textTransform: 'uppercase' }}>{t}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {isActive && !config && (
                                                <div style={{ borderLeft: '2px solid rgba(98,159,134,.2)', marginLeft: 8, paddingLeft: 14, paddingTop: 10, paddingBottom: 4, marginTop: 2, fontSize: 11, color: 'rgba(151,198,177,.4)' }}>
                                                    Detailed info not available for this card.
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* ── Latest Simulation ── */}
                        <div className="panel">
                            <div className="panel-header">
                                <div className="panel-title">Latest Simulation</div>
                                <div className="panel-badge">{latestSim ? 'Last run' : 'No data'}</div>
                            </div>
                            {!latestSim ? (
                                <div style={{ fontSize: 12, color: 'rgba(151,198,177,.3)', lineHeight: 1.8 }}>
                                    No simulations yet — go to Simulations to run your first one.
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
                                        <div style={{ position: 'relative', width: 110, height: 110 }}>
                                            <svg width="110" height="110" viewBox="0 0 110 110">
                                                <defs>
                                                    <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" stopColor="#629F86" />
                                                        <stop offset="100%" stopColor="#97C6B1" />
                                                    </linearGradient>
                                                </defs>
                                                <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(151,198,177,.08)" strokeWidth="8" />
                                                <circle ref={scoreCircleRef} cx="55" cy="55" r="46" fill="none" stroke="url(#sg)" strokeWidth="8"
                                                    strokeLinecap="round" strokeDasharray="289.03" strokeDashoffset="289.03"
                                                    style={{ transform: 'rotate(-90deg)', transformOrigin: '55px 55px', transition: 'stroke-dashoffset 1s ease' }} />
                                            </svg>
                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                <div ref={scoreNumRef} style={{ fontFamily: "'BL Melody',sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--white)', lineHeight: 1 }}>
                                                    {latestSim.yield_index.toFixed(2)}
                                                </div>
                                                <div style={{ fontSize: 8, color: 'rgba(151,198,177,.4)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 2 }}>yield %</div>
                                            </div>
                                        </div>
                                    </div>

                                    {[
                                        ['Goal', latestSim.goal_text],
                                        ['Date', new Date(latestSim.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })],
                                        ['Total Rewards', fmt(latestSim.total_rewards_inr)],
                                        ['Net Value', fmt(latestSim.net_value_inr)],
                                        ['Yield Index', latestSim.yield_index.toFixed(2) + '%'],
                                    ].map(([k, v]) => (
                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(151,198,177,.05)' }}>
                                            <span style={{ fontSize: 10, color: 'rgba(151,198,177,.35)', letterSpacing: '.5px' }}>{k}</span>
                                            <span style={{ fontSize: 11, color: 'rgba(151,198,177,.75)' }}>{v}</span>
                                        </div>
                                    ))}

                                    {latestSim.ai_narrative && (
                                        <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(98,159,134,.06)', border: '1px solid rgba(98,159,134,.12)', borderRadius: 8, fontSize: 10, color: 'rgba(151,198,177,.6)', lineHeight: 1.7 }}>
                                            {latestSim.ai_narrative}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── Strategy Graph ── */}
                    <div className="panel" style={{ marginTop: 20 }}>
                        <div className="panel-header">
                            <div className="panel-title">Strategy Path Graph</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {results?.strategy && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 8, color: 'rgba(151,198,177,.8)', letterSpacing: '1px', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4, background: 'rgba(151,198,177,.05)', border: '1px solid rgba(151,198,177,.25)' }}>
                                        <span>💳</span> Card Stack Timeline
                                    </div>
                                )}
                                <div className="panel-badge">{results?.strategy ? 'Live' : 'Awaiting simulation'}</div>
                            </div>
                        </div>
                        <SimulationGraph
                            sessionId={results?.strategy ? (sessionId || sessionStorage.getItem('voynt_session_id')) : null}
                        />
                    </div>

                    {/* History table — only when 2+ runs exist */}
                    {history.length > 1 && (
                        <div className="panel" style={{ marginTop: 20 }}>
                            <div className="panel-header">
                                <div className="panel-title">Simulation History</div>
                                <div className="panel-badge">{history.length} runs</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 100px 100px 80px', gap: 12, paddingBottom: 10, borderBottom: '1px solid rgba(151,198,177,.08)', fontSize: 8, color: 'rgba(151,198,177,.3)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                                <span>Goal</span><span>Date</span><span>Rewards</span><span>Net Value</span><span>Yield</span>
                            </div>
                            {history.map((entry, idx) => (
                                <div key={entry.session_id} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 100px 100px 80px', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(151,198,177,.04)', alignItems: 'center' }}>
                                    <div style={{ fontSize: 11, color: idx === 0 ? 'var(--pale)' : 'rgba(151,198,177,.55)' }}>
                                        {entry.goal_text}
                                        {idx === 0 && <span style={{ marginLeft: 8, fontSize: 7, padding: '2px 6px', borderRadius: 10, background: 'rgba(98,159,134,.15)', color: 'var(--beauty)', border: '1px solid rgba(98,159,134,.25)', letterSpacing: '1px', textTransform: 'uppercase', verticalAlign: 'middle' }}>Latest</span>}
                                    </div>
                                    <div style={{ fontSize: 10, color: 'rgba(151,198,177,.3)' }}>{new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                    <div style={{ fontSize: 11, color: 'var(--beauty)', fontFamily: "'BL Melody',sans-serif", fontWeight: 700 }}>{fmt(entry.total_rewards_inr)}</div>
                                    <div style={{ fontSize: 11, color: 'rgba(151,198,177,.55)' }}>{fmt(entry.net_value_inr)}</div>
                                    <div style={{ fontSize: 11, color: 'rgba(151,198,177,.55)' }}>{entry.yield_index.toFixed(2)}%</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
