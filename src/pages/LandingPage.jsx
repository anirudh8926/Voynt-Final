import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useVoynt } from '../context/VoyntContext';
import Spline from '@splinetool/react-spline';
import Ticker from '../components/Ticker';
import '../styles/landing.css';

const SPLINE_URL = 'https://prod.spline.design/0ZvQ3aEzR6eD7jDg/scene.splinecode';

export default function LandingPage() {
    const { user } = useVoynt();
    const navRef = useRef(null);

    useEffect(() => {
        const nav = navRef.current;
        const onScroll = () => {
            if (nav) nav.classList.toggle('scrolled', window.scrollY > window.innerHeight * 0.85);
        };
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div style={{ background: '#080a0d', color: '#090708', cursor: 'none' }}>
            <Ticker />

            {/* NAV */}
            <nav ref={navRef}>
                <Link className="logo" to="/">Voy<span className="ln">n</span>t</Link>
                <div className="nav-links">
                    <Link className="nav-link" to="/how-it-works">How it works</Link>
                    <Link className="nav-link" to="/cards">Cards</Link>
                    <a className="nav-link" href="#">Sandbox</a>
                </div>
                <div className="nav-right">
                    {user ? (
                        <Link className="btn-primary" to="/dashboard">Go to Dashboard →</Link>
                    ) : (
                        <>
                            <Link className="btn-ghost" to="/auth">Log in</Link>
                            <Link className="btn-primary" to="/auth#signup">Sign up free</Link>
                        </>
                    )}
                </div>
            </nav>

            {/* HERO */}
            <section className="hero">
                {/* Spline 3D background */}
                <div className="hero-spline">
                    <Spline scene={SPLINE_URL} />
                </div>

                {/* Dark vignette overlay */}
                <div className="hero-overlay" />

                {/* Text content */}
                <div className="hero-content">
                    <span className="hero-logo">Voy<span className="ln">n</span>t</span>
                    <p className="hero-headline">Turn your spending into a<br /><span className="accent">reward strategy.</span></p>
                    <div className="hero-cta">
                        {user ? (
                            <Link className="btn-hero" to="/dashboard">Go to Dashboard <span className="arrow">→</span></Link>
                        ) : (
                            <Link className="btn-hero" to="/auth#signup">Start Planning <span className="arrow">→</span></Link>
                        )}
                        <Link className="btn-outline" to="/how-it-works">See how it works</Link>
                    </div>
                </div>
            </section>

            {/* GRADIENT BRIDGE: dark → grey */}
            <div className="hero-bridge" />

            {/* PAGE 2 — CARDS */}
            <section className="page-2">
                <div className="page2-left">
                    <div className="eyebrow">Credit card intelligence</div>
                    <p className="subline">Tell Voynt your goal — a trip, a purchase, a target.<br />Get a <strong>precision credit card plan</strong> with a real confidence score, built on Monte Carlo simulation.</p>
                    <div className="page2-cta">
                        {user ? (
                            <Link className="btn-hero" to="/dashboard">Go to Dashboard <span className="arrow">→</span></Link>
                        ) : (
                            <Link className="btn-hero" to="/auth#signup">Start Planning <span className="arrow">→</span></Link>
                        )}
                        <span className="cta-note">No card required &nbsp;·&nbsp; 2 min setup</span>
                    </div>
                </div>
                <div className="page2-right">
                    <div className="cards-stage">
                        {[
                            { cls: 'cc-1', bank: 'HDFC', bankColor: '#97C6B1', num: '4821', name: 'Regalia Gold', reward: '5x pts' },
                            { cls: 'cc-2', bank: 'Amex', bankColor: '#CAE9D9', num: '7304', name: 'MRCC', reward: '4x MR pts' },
                            { cls: 'cc-3', bank: 'Axis', bankColor: '#090708', num: '9152', name: 'Atlas', reward: '5 EDGE Miles' },
                            { cls: 'cc-4', bank: 'SBI', bankColor: '#629F86', num: '6631', name: 'SimplyCLICK', reward: '10x online' },
                            { cls: 'cc-5', bank: 'ICICI', bankColor: '#090708', num: '2089', name: 'Amazon Pay', reward: '5% cashback' },
                        ].map(c => (
                            <div className={`cc ${c.cls}`} key={c.cls}>
                                <div className="cc-top"><div className="cc-bank" style={{ color: c.bankColor }}>{c.bank}</div><div className="cc-chip" /></div>
                                <div className="cc-number">•••• •••• •••• {c.num}</div>
                                <div className="cc-bottom"><div className="cc-name">{c.name}</div><div className="cc-reward">{c.reward}</div></div>
                                <div className="cc-network"><span /><span /></div>
                            </div>
                        ))}
                        <div className="float-badge">
                            <div className="badge-icon">◈</div>
                            <div className="badge-text"><strong>₹18,400</strong><span>Est. rewards · 4 months</span></div>
                        </div>
                        <div className="gauge-badge">
                            <div className="gauge-mini">
                                <svg viewBox="0 0 72 36">
                                    <path d="M6,34 A28,28 0 0,1 66,34" fill="none" stroke="#CAE9D9" strokeWidth="6" strokeLinecap="round" />
                                    <path d="M6,34 A28,28 0 0,1 66,34" fill="none" stroke="#629F86" strokeWidth="6" strokeLinecap="round" strokeDasharray="88" strokeDashoffset="21" />
                                </svg>
                            </div>
                            <div className="gauge-pct">76%</div>
                            <div className="gauge-label">Confidence</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* PAGE 3 — STATS */}
            <section className="page-3">
                <div className="stats-row">
                    {[['10', '+', 'Indian credit cards'], ['10', 'k', 'Simulations per plan'], ['₹2', 'L', 'Avg annual rewards'], ['78', '%', 'Avg confidence score']].map(([n, s, l]) => (
                        <div className="stat-block" key={l}>
                            <div className="stat-num">{n}<span>{s}</span></div>
                            <div className="stat-label-landing">{l}</div>
                        </div>
                    ))}
                </div>
                <div className="features-row">
                    {[
                        ['01 — Goal', 'Goal-first planning', "Describe your goal in plain language. Voynt parses intent and builds a reward strategy around it — not the other way around."],
                        ['02 — Simulate', 'Monte Carlo engine', "10,000 simulations model variable spending, offer windows, and bonus cycles to give you a real probability — not a guess."],
                        ['03 — Optimize', 'Live reward sandbox', "Adjust sliders, swap cards, and watch the reward total update in real time. Your strategy, continuously optimized."],
                    ].map(([num, title, desc]) => (
                        <div className="feat-card" key={num}>
                            <div className="feat-num">{num}</div>
                            <div className="feat-title">{title}</div>
                            <div className="feat-desc">{desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section className="hiw" id="how-it-works">
                <div className="hiw-header">
                    <div className="hiw-eyebrow">How it works</div>
                    <h2 className="hiw-title">From goal to <span>reward strategy</span><br />in three steps</h2>
                </div>
                <div className="steps-container">
                    <div className="step-row">
                        <div className="step-content">
                            <div className="step-label"><span className="step-num">01 / 03</span><span className="step-line" /><span className="step-tag">Input</span></div>
                            <h2 className="step-title">Set your <span>goal</span></h2>
                            <p className="step-desc">Tell Voynt what you're working toward — a flight to Tokyo, a MacBook, ₹50k cashback. Plain language, no jargon.</p>
                            <div className="step-detail">
                                {['Type your goal in natural language', 'Voynt extracts target amount, timeline & category', 'Add your monthly spending across categories', 'Select which cards you already hold'].map(t => (
                                    <div className="detail-item" key={t}>{t}</div>
                                ))}
                            </div>
                        </div>
                        <div className="step-visual">
                            <div className="mock-input">
                                <div className="mock-input-label">What's your goal?</div>
                                <div className="mock-input-field">Flight to Tokyo for 2 in December<span className="mock-cursor" /></div>
                                <div className="mock-tags">
                                    <span className="mock-tag">✈ Travel</span>
                                    <span className="mock-tag">₹1.2L target</span>
                                    <span className="mock-tag">~5 months</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="step-row reverse">
                        <div className="step-content">
                            <div className="step-label"><span className="step-num">02 / 03</span><span className="step-line" /><span className="step-tag">Simulate</span></div>
                            <h2 className="step-title">Run the <span>simulation</span></h2>
                            <p className="step-desc">Voynt runs 10,000 Monte Carlo simulations across your spending patterns, card reward cycles, bonus windows, and expiry dates.</p>
                            <div className="step-detail">
                                {['10,000 simulations across variable spending paths', 'Models bonus windows, tier changes & expiry', 'Returns confidence score based on real probability', 'Ranks cards by expected reward yield for your goal'].map(t => (
                                    <div className="detail-item" key={t}>{t}</div>
                                ))}
                            </div>
                        </div>
                        <div className="step-visual">
                            <div className="mock-sim">
                                <div className="sim-header"><span className="sim-title">Monte Carlo Engine</span><span className="sim-badge">● Running</span></div>
                                <div className="sim-bar-row">
                                    {[['HDFC Regalia', '5x travel pts', 82], ['Axis Atlas', '5 EDGE Miles', 71], ['Amex MRCC', '4x MR pts', 58]].map(([n, r, w]) => (
                                        <div key={n}><div className="sim-bar-label"><span>{n}</span><span>{r}</span></div><div className="sim-bar-track"><div className="sim-bar-fill" style={{ width: w + '%' }} /></div></div>
                                    ))}
                                </div>
                                <div className="sim-count">9,847</div>
                                <div className="sim-count-label">Simulations complete</div>
                            </div>
                        </div>
                    </div>

                    <div className="step-row">
                        <div className="step-content">
                            <div className="step-label"><span className="step-num">03 / 03</span><span className="step-line" /><span className="step-tag">Optimise</span></div>
                            <h2 className="step-title">Fine-tune in <span>the sandbox</span></h2>
                            <p className="step-desc">Drag sliders, swap cards, toggle spend categories. The reward total and confidence score update live.</p>
                            <div className="step-detail">
                                {['Adjust monthly spend per category in real time', 'Swap cards and see the impact instantly', 'Confidence score recalculates on every change', 'Export your final plan or set reminders'].map(t => (
                                    <div className="detail-item" key={t}>{t}</div>
                                ))}
                            </div>
                        </div>
                        <div className="step-visual">
                            <div className="mock-sandbox">
                                <div className="sandbox-header"><span className="sandbox-title">Reward Sandbox</span><span className="sandbox-total">₹1,18,400</span></div>
                                {[['Dining', '₹8,000 / mo', 65], ['Travel', '₹22,000 / mo', 80], ['Online shopping', '₹12,000 / mo', 48]].map(([label, val, w]) => (
                                    <div className="slider-row" key={label}><div className="slider-meta"><span>{label}</span><span>{val}</span></div><div className="slider-track"><div className="slider-fill" style={{ width: w + '%' }} /><div className="slider-thumb" style={{ left: `calc(${w}% - 6px)` }} /></div></div>
                                ))}
                                <div className="confidence-row"><span className="conf-label">Confidence score</span><span className="conf-val">78%</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA STRIP */}
            <div className="cta-strip">
                <h2>Ready to earn <span>smarter</span>?</h2>
                <p>Start with your goal. Voynt does the rest — in about 2 minutes.</p>
                {user ? (
                    <Link className="btn-hero" to="/dashboard">Go to Dashboard <span className="arrow">→</span></Link>
                ) : (
                    <Link className="btn-hero" to="/auth#signup">Start Planning <span className="arrow">→</span></Link>
                )}
                <span className="cta-strip-note">No credit card required &nbsp;·&nbsp; Free to use</span>
            </div>

            {/* FOOTER */}
            <footer>
                <div className="footer-logo">Voy<span className="ln">n</span>t</div>
                <div className="footer-note">Built for people who take their rewards seriously.</div>
            </footer>
        </div>
    );
}
