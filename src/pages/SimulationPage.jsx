import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoynt } from '../context/VoyntContext';
import { analyzeProfile, pollStatus, getResults } from '../lib/api';
import SimulationGraph from '../components/SimulationGraph';
import '../styles/dashboard.css';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const SIM_HISTORY_KEY = 'voynt_sim_history';

const CARDS_LIST = [
    'HDFC Regalia Gold', 'HDFC Millennia', 'HDFC Infinia Metal Edition',
    'Axis Atlas', 'Axis Vistara Signature', 'Axis Magnus',
    'Amex Membership Rewards Credit', 'SBI SimplyCLICK', 'ICICI Amazon Pay', 'None of these',
];

const RISK_LEVELS = ['Conservative', 'Moderate', 'Aggressive'];
const CREDIT_SCORES = ['Below 650', '650-700', '700-750', '750-800', '800+'];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function fmt(val) {
    val = parseInt(val, 10);
    if (isNaN(val)) return '₹0';
    if (val >= 100000) return '₹' + (val / 100000).toFixed(val % 100000 === 0 ? 0 : 1) + 'L';
    return '₹' + val.toLocaleString('en-IN');
}

function saveToHistory(r, sid, goalText) {
    try {
        const raw = localStorage.getItem(SIM_HISTORY_KEY);
        const prev = raw ? JSON.parse(raw) : [];
        if (prev.some(e => e.session_id === sid)) return;
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
        localStorage.setItem(SIM_HISTORY_KEY, JSON.stringify([entry, ...prev].slice(0, 10)));
    } catch { /* ignore */ }
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function SimulationPage() {
    const navigate = useNavigate();
    const { setResults, setSessionId } = useVoynt();

    const [step, setStep] = useState(1);
    const [phase, setPhase] = useState('form'); // 'form' | 'loading' | 'results' | 'error'
    const [simResults, setSimResults] = useState(null);
    const [errMsg, setErrMsg] = useState('');

    const [form, setForm] = useState({
        goal: '', amount: 200000, timeline: 6, spend: 30000,
        selectedCards: [], risk: 'Moderate', credit: '750-800',
    });

    const CAT_DEFAULTS = { groceries: 0.20, dining: 0.12, travel: 0.25, fuel: 0.08, online: 0.15, entertainment: 0.05, utilities: 0.08, other: 0.07 };
    const CAT_LABELS = { groceries: 'Groceries', dining: 'Dining', travel: 'Travel', fuel: 'Fuel', online: 'Online Shopping', entertainment: 'Entertainment', utilities: 'Utilities / Bills', other: 'Other' };

    const defaultBreakdown = (ms) => Object.fromEntries(
        Object.entries(CAT_DEFAULTS).map(([k, pct]) => [k, Math.round(ms * pct)])
    );
    const [spendBreakdown, setSpendBreakdown] = useState(() => defaultBreakdown(30000));

    function updBreakdown(cat, val) {
        setSpendBreakdown(prev => ({ ...prev, [cat]: Math.max(0, Number(val) || 0) }));
    }

    function upd(k, v) {
        setForm(f => ({ ...f, [k]: v }));
        // When monthly spend changes, reset breakdown proportionally
        if (k === 'spend') setSpendBreakdown(defaultBreakdown(v));
    }
    function toggleCard(c) {
        setForm(f => ({
            ...f,
            selectedCards: f.selectedCards.includes(c)
                ? f.selectedCards.filter(x => x !== c)
                : [...f.selectedCards, c],
        }));
    }

    async function runSimulation() {
        setPhase('loading');
        const ms = form.spend;
        const riskMap = { Conservative: 'low', Moderate: 'medium', Aggressive: 'high' };

        const spend_breakdown = spendBreakdown;

        const payload = {
            goal_text: form.goal || 'Reward goal',
            goal_amount_inr: form.amount,
            timeline_months: form.timeline,
            monthly_spend_inr: ms,
            cards_owned: form.selectedCards.filter(c => c !== 'None of these'),
            risk_level: riskMap[form.risk] || 'medium',
            credit_score_range: form.credit,
            spend_breakdown,
        };

        try {
            const res = await analyzeProfile(payload);
            const sid = res.session_id || res.sessionId;

            sessionStorage.setItem('voynt_session_id', sid);
            sessionStorage.setItem('voynt_goal_text', payload.goal_text);
            setSessionId(sid);

            await new Promise((resolve, reject) => pollStatus(sid, resolve, reject));
            const r = await getResults(sid);

            setResults(r);
            saveToHistory(r, sid, payload.goal_text);
            setSimResults(r);
            setPhase('results');
        } catch (e) {
            setErrMsg(e.message || 'Something went wrong. Please try again.');
            setPhase('error');
        }
    }

    /* ─── Rendering phases ─────────────────────────────────────────────── */
    return (
        <div style={{ background: 'var(--black)', color: 'var(--white)', minHeight: '100vh', fontFamily: "'IBM Plex Mono', monospace" }}>
            <div className="bg-glow" /><div className="bg-grid" />

            {/* Topbar */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', borderBottom: '1px solid rgba(151,198,177,.07)', background: 'rgba(9,7,8,.92)', backdropFilter: 'blur(12px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'rgba(151,198,177,.4)', cursor: 'pointer', fontSize: 13, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: '.5px' }}>← Dashboard</button>
                    <div style={{ width: 1, height: 16, background: 'rgba(151,198,177,.1)' }} />
                    <span style={{ fontFamily: "'BL Melody',sans-serif", fontSize: 18, fontWeight: 800 }}>
                        Simul<span style={{ color: 'var(--beauty)' }}>ations</span>
                    </span>
                </div>
                {phase === 'form' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        {/* Step indicators: 5 steps */}
                        {['Goal', 'Finances', 'Spend', 'Cards', 'Review'].map((label, i) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: step > i + 1 ? 'var(--beauty)' : step === i + 1 ? 'rgba(98,159,134,.3)' : 'rgba(151,198,177,.08)', border: `1px solid ${step >= i + 1 ? 'var(--beauty)' : 'rgba(151,198,177,.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: step > i + 1 ? '#090708' : 'rgba(151,198,177,.5)' }}>
                                    {step > i + 1 ? '✓' : i + 1}
                                </div>
                                <span style={{ fontSize: 9, color: step === i + 1 ? 'var(--beauty)' : 'rgba(151,198,177,.3)', letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</span>
                                {i < 4 && <div style={{ width: 20, height: 1, background: 'rgba(151,198,177,.1)' }} />}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ paddingTop: 96, maxWidth: 680, margin: '0 auto', padding: '96px 24px 64px' }}>

                {/* ── LOADING ────────────────────────────────────────────── */}
                {phase === 'loading' && (
                    <div style={{ textAlign: 'center', paddingTop: 80 }}>
                        <div className="loading-spinner" style={{ margin: '0 auto 32px' }} />
                        <div style={{ fontFamily: "'BL Melody',sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 12 }}>
                            Building your <span style={{ color: 'var(--beauty)' }}>strategy…</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(151,198,177,.35)', letterSpacing: '1px' }}>
                            Analysing cards · Optimising allocations · Computing rewards
                        </div>
                        {['Matching your cards to spend categories', 'Running reward optimisation', 'Computing yield index', 'Generating AI narrative'].map((t, i) => (
                            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, fontSize: 11, color: 'rgba(151,198,177,.4)' }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--beauty)', animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite` }} />
                                {t}
                            </div>
                        ))}
                    </div>
                )}

                {/* ── ERROR ──────────────────────────────────────────────── */}
                {phase === 'error' && (
                    <div style={{ textAlign: 'center', paddingTop: 80 }}>
                        <div style={{ fontSize: 32, marginBottom: 16 }}>⚠</div>
                        <div style={{ fontSize: 14, color: 'rgba(220,80,80,.7)', marginBottom: 24 }}>{errMsg}</div>
                        <button className="btn-hero-sim" onClick={() => setPhase('form')}>Try Again</button>
                    </div>
                )}

                {/* ── RESULTS ────────────────────────────────────────────── */}
                {phase === 'results' && simResults && (() => {
                    const s = simResults.strategy;
                    const yr = simResults.yield_result;
                    return (
                        <div>
                            <div style={{ marginBottom: 32 }}>
                                <div style={{ fontSize: 10, color: 'rgba(151,198,177,.4)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Simulation complete</div>
                                <div style={{ fontFamily: "'BL Melody',sans-serif", fontSize: 28, fontWeight: 800, lineHeight: 1.2 }}>
                                    Your <span style={{ color: 'var(--beauty)' }}>results</span> are in.
                                </div>
                                <div style={{ fontSize: 11, color: 'rgba(151,198,177,.35)', marginTop: 8 }}>{form.goal}</div>
                            </div>

                            {/* Stat cards */}
                            <div className="stat-row" style={{ marginBottom: 24 }}>
                                {[
                                    { label: 'Total Rewards', val: fmt(s?.total_rewards_inr), icon: '💎' },
                                    { label: 'Annual Fees', val: fmt(s?.total_fees_inr), icon: '📄' },
                                    { label: 'Net Value', val: fmt(s?.net_value_inr), icon: '📈' },
                                    { label: 'Yield Index', val: yr ? (yr.yield_index * 100).toFixed(2) + '%' : '—', icon: '⚡' },
                                ].map(c => (
                                    <div className="stat-card" key={c.label}>
                                        <div className="stat-icon">{c.icon}</div>
                                        <div className="stat-label">{c.label}</div>
                                        <div className="stat-value">{c.val}</div>
                                    </div>
                                ))}
                            </div>

                            {/* AI Narrative */}
                            {simResults.ai_narrative && (
                                <div className="panel" style={{ marginBottom: 20 }}>
                                    <div className="panel-header">
                                        <div className="panel-title">AI Analysis</div>
                                        <div className="panel-badge">Gemini</div>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'rgba(151,198,177,.65)', lineHeight: 1.7 }}>{simResults.ai_narrative}</div>
                                </div>
                            )}

                            {/* Strategy Graph */}
                            <div className="panel" style={{ marginBottom: 20 }}>
                                <div className="panel-header">
                                    <div className="panel-title">Strategy Path Graph</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 8, color: 'rgba(151,198,177,.8)', letterSpacing: '1px', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4, background: 'rgba(151,198,177,.05)', border: '1px solid rgba(151,198,177,.25)' }}>
                                            <span>💳</span> Card Stack Timeline
                                        </div>
                                    </div>
                                </div>
                                <SimulationGraph sessionId={sessionStorage.getItem('voynt_session_id')} />
                            </div>

                            {/* Recommended Cards */}
                            <div className="panel" style={{ marginBottom: 20 }}>
                                <div className="panel-header">
                                    <div className="panel-title">Recommended Cards</div>
                                    <div className="panel-badge">{s?.recommended_cards?.length || 0} cards</div>
                                </div>
                                {!s?.recommended_cards?.length ? (
                                    <div style={{ fontSize: 11, color: 'rgba(151,198,177,.3)', lineHeight: 1.8 }}>
                                        No new cards recommended — your current setup is already optimised for this goal.
                                    </div>
                                ) : (
                                    s.recommended_cards.map((rec) => (
                                        <div key={rec.card_name || rec.card_id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid rgba(151,198,177,.05)' }}>
                                            <div style={{ width: 38, height: 24, borderRadius: 4, background: 'linear-gradient(135deg, #1a1f1c, #629F8640)', border: '1px solid rgba(98,159,134,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: 'var(--beauty)', flexShrink: 0, letterSpacing: 1 }}>
                                                {(rec.card_name || 'CARD').split(' ')[0].slice(0, 4).toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 11, color: 'rgba(151,198,177,.8)' }}>{rec.card_name}</div>
                                                <div style={{ fontSize: 9, color: 'rgba(151,198,177,.35)', marginTop: 2 }}>{rec.action?.toUpperCase()} · {rec.reason}</div>
                                            </div>
                                            {rec.approval_prob != null && (
                                                <div style={{ fontSize: 10, color: 'var(--beauty)', flexShrink: 0 }}>{Math.round(rec.approval_prob * 100)}% approval</div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Monthly Plan */}
                            <div className="panel" style={{ marginBottom: 20 }}>
                                <div className="panel-header">
                                    <div className="panel-title">Monthly Roadmap</div>
                                    <div className="panel-badge">{s?.monthly_plan?.length || 0} months</div>
                                </div>
                                {!s?.monthly_plan?.length ? (
                                    <div style={{ fontSize: 11, color: 'rgba(151,198,177,.3)', lineHeight: 1.8 }}>
                                        No monthly plan generated. Try increasing your timeline or spend.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {s.monthly_plan.map((mp, i) => {
                                            const feeAllocs = (mp.allocations || []).filter(a => a.category === 'annual_fee');
                                            const rewardAllocs = (mp.allocations || []).filter(a => a.category !== 'annual_fee');
                                            const total = mp.total_expected_value_inr || 0;
                                            const isPositive = total >= 0;
                                            // Detect welcome bonus spike: total much higher than a base month
                                            const basePrev = i > 0 ? s.monthly_plan[i - 1].total_expected_value_inr : null;
                                            const isBonus = basePrev != null && total > basePrev * 1.8 && total > 200;
                                            return (
                                                <div key={i} style={{
                                                    background: 'rgba(151,198,177,.02)',
                                                    border: `1px solid ${feeAllocs.length ? 'rgba(220,80,80,.12)' : isBonus ? 'rgba(98,159,134,.25)' : 'rgba(151,198,177,.07)'}`,
                                                    borderLeft: `3px solid ${feeAllocs.length ? 'rgba(220,80,80,.4)' : isBonus ? 'var(--beauty)' : 'rgba(151,198,177,.12)'}`,
                                                    borderRadius: 8, padding: '12px 14px',
                                                }}>
                                                    {/* Month header */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: rewardAllocs.length || feeAllocs.length ? 10 : 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(151,198,177,.7)', letterSpacing: '.5px', textTransform: 'uppercase' }}>Month {mp.month}</span>
                                                            {isBonus && <span style={{ fontSize: 7, background: 'rgba(98,159,134,.15)', border: '1px solid rgba(98,159,134,.3)', borderRadius: 3, padding: '1px 5px', color: 'var(--beauty)', letterSpacing: '1px', textTransform: 'uppercase' }}>✦ Bonus</span>}
                                                            {feeAllocs.length > 0 && <span style={{ fontSize: 7, background: 'rgba(220,80,80,.08)', border: '1px solid rgba(220,80,80,.2)', borderRadius: 3, padding: '1px 5px', color: 'rgba(220,120,100,.8)', letterSpacing: '1px', textTransform: 'uppercase' }}>Fee month</span>}
                                                        </div>
                                                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'BL Melody',sans-serif", color: isPositive ? 'var(--beauty)' : 'rgba(220,80,80,.7)' }}>
                                                            {isPositive ? '+' : ''}{fmt(total)}
                                                        </span>
                                                    </div>
                                                    {/* Reward allocations */}
                                                    {rewardAllocs.length > 0 && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                            {rewardAllocs.map((a, j) => (
                                                                <div key={j} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 64px 52px', gap: 6, alignItems: 'center' }}>
                                                                    <span style={{ background: 'rgba(98,159,134,.1)', border: '1px solid rgba(98,159,134,.18)', borderRadius: 3, padding: '2px 5px', color: 'var(--beauty)', fontSize: 7, letterSpacing: '.5px', textTransform: 'uppercase', textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{a.category}</span>
                                                                    <span style={{ fontSize: 9, color: 'rgba(151,198,177,.45)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{a.card_name}</span>
                                                                    <span style={{ fontSize: 9, color: 'rgba(151,198,177,.35)', textAlign: 'right' }}>{fmt(a.amount_inr)}</span>
                                                                    <span style={{ fontSize: 9, color: 'rgba(151,198,177,.6)', textAlign: 'right' }}>+{fmt(a.expected_value_inr)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* Annual fee deductions */}
                                                    {feeAllocs.length > 0 && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: rewardAllocs.length ? 6 : 0, paddingTop: rewardAllocs.length ? 6 : 0, borderTop: rewardAllocs.length ? '1px solid rgba(220,80,80,.08)' : 'none' }}>
                                                            {feeAllocs.map((a, j) => (
                                                                <div key={j} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 52px', gap: 6, alignItems: 'center' }}>
                                                                    <span style={{ background: 'rgba(220,80,80,.08)', border: '1px solid rgba(220,80,80,.18)', borderRadius: 3, padding: '2px 5px', color: 'rgba(220,120,100,.8)', fontSize: 7, letterSpacing: '.5px', textTransform: 'uppercase', textAlign: 'center' }}>annual fee</span>
                                                                    <span style={{ fontSize: 9, color: 'rgba(151,198,177,.35)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{a.card_name}</span>
                                                                    <span style={{ fontSize: 9, color: 'rgba(220,80,80,.6)', textAlign: 'right' }}>{fmt(a.expected_value_inr)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {!rewardAllocs.length && !feeAllocs.length && (
                                                        <div style={{ fontSize: 9, color: 'rgba(151,198,177,.25)' }}>No allocations this month.</div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* CTA */}
                            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                                <button
                                    onClick={() => navigate('/dashboard')}
                                    style={{ flex: 1, padding: '14px 24px', background: 'var(--beauty)', color: '#090708', border: 'none', borderRadius: 8, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', transition: 'opacity .2s' }}
                                >
                                    View Dashboard →
                                </button>
                                <button
                                    onClick={() => { setPhase('form'); setStep(1); setSimResults(null); }}
                                    style={{ padding: '14px 24px', background: 'transparent', color: 'rgba(151,198,177,.5)', border: '1px solid rgba(151,198,177,.12)', borderRadius: 8, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: '1px', cursor: 'pointer' }}
                                >
                                    Run Another
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* ── FORM ───────────────────────────────────────────────── */}
                {phase === 'form' && (
                    <div>
                        {/* Step 1 — Goal */}
                        {step === 1 && (
                            <div className="ob-card-dash sim-step active">
                                <div className="step-eyebrow">Step 1 of 5 → Goal</div>
                                <h2 className="step-title-sim">What's your <span className="accent">goal?</span></h2>
                                <p className="step-sub">Describe what you're optimising rewards toward.</p>
                                <input className="goal-input" placeholder="e.g. Flight to Tokyo, ₹50k cashback…" value={form.goal} onChange={e => upd('goal', e.target.value)} />
                                <div className="goal-hint">Quick examples:</div>
                                <div className="examples">
                                    {['Flight to Tokyo ₹1.2L', 'MacBook ₹1.5L', 'Business class upgrade', '₹50K cashback target'].map(ex => (
                                        <button key={ex} className="ex-chip" onClick={() => {
                                            upd('goal', ex);
                                            const m = ex.match(/₹([\d.]+)(L|K)?/i);
                                            if (m) { let a = parseFloat(m[1]); if (m[2] === 'L') a *= 100000; if (m[2] === 'K') a *= 1000; upd('amount', Math.round(a)); }
                                        }}>{ex}</button>
                                    ))}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 8 }}>
                                    <div className="field-group"><input className="form-input" type="number" placeholder="Target amount (₹)" value={form.amount} onChange={e => upd('amount', parseInt(e.target.value) || 0)} /><label className="floating-label">Target amount (₹)</label></div>
                                    <div className="field-group"><input className="form-input" type="number" placeholder="Timeline (months)" value={form.timeline} onChange={e => upd('timeline', parseInt(e.target.value) || 6)} /><label className="floating-label">Timeline (months)</label></div>
                                </div>
                                <div className="btn-row">
                                    <button className="btn-hero-sim" onClick={() => setStep(2)} disabled={!form.goal}>Continue →</button>
                                </div>
                            </div>
                        )}

                        {/* Step 2 — Finances */}
                        {step === 2 && (
                            <div className="ob-card-dash sim-step active">
                                <div className="step-eyebrow">Step 2 of 5 → Finances</div>
                                <h2 className="step-title-sim">Your <span className="accent">spend</span> profile.</h2>
                                <div className="slider-wrap">
                                    <div className="slider-meta"><span>Monthly Card Spend</span><span className="val">{fmt(form.spend)}</span></div>
                                    <input type="range" min={5000} max={500000} step={2500} value={form.spend} onChange={e => upd('spend', Number(e.target.value))} style={{ background: `linear-gradient(90deg,rgba(98,159,134,.6) ${((form.spend - 5000) / 495000) * 100}%,rgba(255,255,255,.06) ${((form.spend - 5000) / 495000) * 100}%)` }} />
                                </div>
                                <div className="btn-row">
                                    <button className="btn-back-sim" onClick={() => setStep(1)}>← Back</button>
                                    <button className="btn-hero-sim" onClick={() => setStep(3)}>Continue →</button>
                                </div>
                            </div>
                        )}

                        {/* Step 3 — Spend Breakdown */}
                        {step === 3 && (() => {
                            const total = Object.values(spendBreakdown).reduce((a, b) => a + b, 0);
                            const diff = form.spend - total;
                            const maxCat = form.spend;
                            return (
                                <div className="ob-card-dash sim-step active">
                                    <div className="step-eyebrow">Step 3 of 5 → Spend Breakdown</div>
                                    <h2 className="step-title-sim">How do you <span className="accent">spend?</span></h2>
                                    <p className="step-sub" style={{ marginBottom: 16 }}>Drag each category to match your actual monthly spend.</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
                                        {Object.entries(CAT_LABELS).map(([cat, label]) => {
                                            const val = spendBreakdown[cat] || 0;
                                            const pct = maxCat > 0 ? (val / maxCat) * 100 : 0;
                                            return (
                                                <div key={cat} className="slider-wrap" style={{ marginBottom: 0 }}>
                                                    <div className="slider-meta">
                                                        <span style={{ fontSize: 10, letterSpacing: '.5px' }}>{label}</span>
                                                        <span className="val">{fmt(val)}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={0}
                                                        max={maxCat}
                                                        step={500}
                                                        value={val}
                                                        onChange={e => updBreakdown(cat, e.target.value)}
                                                        style={{ background: `linear-gradient(90deg,rgba(98,159,134,.6) ${pct}%,rgba(255,255,255,.06) ${pct}%)` }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{ fontSize: 10, color: diff === 0 ? 'var(--beauty)' : diff > 0 ? 'rgba(220,140,60,.8)' : 'rgba(220,80,80,.7)', marginBottom: 16 }}>
                                        {fmt(total)} allocated of {fmt(form.spend)}{diff > 0 ? `  — ${fmt(diff)} unallocated` : diff < 0 ? `  — ${fmt(-diff)} over budget` : '  ✓ balanced'}
                                    </div>
                                    <div className="btn-row">
                                        <button className="btn-back-sim" onClick={() => setStep(2)}>← Back</button>
                                        <button className="btn-hero-sim" onClick={() => setStep(4)}>Continue →</button>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Step 4 — Cards */}
                        {step === 4 && (
                            <div className="ob-card-dash sim-step active">
                                <div className="step-eyebrow">Step 4 of 5 → Cards</div>
                                <h2 className="step-title-sim">Card <span className="accent">selection.</span></h2>
                                <div className="section-label" style={{ marginBottom: 12 }}>Select cards to include</div>
                                <div className="chip-grid">
                                    {CARDS_LIST.map(c => (
                                        <button key={c} className={`chip ${form.selectedCards.includes(c) ? 'selected' : ''}`} onClick={() => toggleCard(c)}>{c}</button>
                                    ))}
                                </div>
                                <div className="sdiv" />
                                <div className="section-label" style={{ marginBottom: 8, marginTop: 16 }}>Risk level</div>
                                <div className="chip-grid">
                                    {RISK_LEVELS.map(r => (
                                        <button key={r} className={`chip ${form.risk === r ? 'selected' : ''}`} onClick={() => upd('risk', r)}>{r}</button>
                                    ))}
                                </div>
                                <div className="btn-row">
                                    <button className="btn-back-sim" onClick={() => setStep(3)}>← Back</button>
                                    <button className="btn-hero-sim" onClick={() => setStep(5)}>Continue →</button>
                                </div>
                            </div>
                        )}

                        {/* Step 5 — Review */}
                        {step === 5 && (
                            <div className="ob-card-dash sim-step active">
                                <div className="step-eyebrow">Step 5 of 5 → Review</div>
                                <h2 className="step-title-sim">Review & <span className="accent">run.</span></h2>
                                <div className="sdiv" />
                                {[
                                    ['Goal', form.goal || '—'],
                                    ['Target Amount', fmt(form.amount)],
                                    ['Timeline', `${form.timeline} months`],
                                    ['Monthly Spend', `${fmt(form.spend)}/mo`],
                                    ['Top Category', Object.entries(spendBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'],
                                    ['Risk Level', form.risk],
                                    ['Cards', form.selectedCards.filter(c => c !== 'None of these').join(', ') || 'None selected'],
                                ].map(([k, v]) => (
                                    <div className="review-row" key={k}><span className="review-key">{k}</span><span className="review-val">{v}</span></div>
                                ))}
                                <div className="btn-row">
                                    <button className="btn-back-sim" onClick={() => setStep(4)}>← Back</button>
                                    <button className="btn-hero-sim" onClick={runSimulation}>Run Simulation →</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
