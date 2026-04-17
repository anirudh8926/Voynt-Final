import React from 'react';
import { Link } from 'react-router-dom';
import { useVoynt } from '../context/VoyntContext';
import Ticker from '../components/Ticker';
import '../styles/hiw.css';
import '../styles/landing.css';

const STEPS = [
    {
        num: '01 / 03', tag: 'Input', title: ['Set your ', 'goal'],
        desc: 'Tell Voynt what you\'re working toward — a flight to Tokyo, a MacBook, ₹50k cashback. Plain language, no jargon.',
        details: ['Type your goal in natural language', 'Voynt extracts target amount, timeline & category', 'Add your monthly spending across categories', 'Select which cards you already hold'],
        visual: (
            <div className="mock-input">
                <div className="mock-input-label">What's your goal?</div>
                <div className="mock-input-field">Flight to Tokyo for 2 in December<span className="mock-cursor" /></div>
                <div className="mock-tags"><span className="mock-tag">✈ Travel</span><span className="mock-tag">₹1.2L target</span><span className="mock-tag">~5 months</span></div>
            </div>
        ),
    },
    {
        num: '02 / 03', tag: 'Simulate', title: ['Run the ', 'simulation'],
        desc: 'Voynt runs 10,000 Monte Carlo simulations across your spending patterns, card reward cycles, bonus windows, and expiry dates.',
        details: ['10,000 simulations across variable spending paths', 'Models bonus windows, tier changes & expiry', 'Returns confidence score based on real probability', 'Ranks cards by expected reward yield for your goal'],
        visual: (
            <div className="mock-sim">
                <div className="sim-header"><span className="sim-title">Monte Carlo Engine</span><span className="sim-badge">● Running</span></div>
                <div className="sim-bar-row">
                    {[['HDFC Regalia', '5x travel pts', 82], ['Axis Atlas', '5 EDGE Miles', 71], ['Amex MRCC', '4x MR pts', 58]].map(([n, r, w]) => (
                        <div key={n}><div className="sim-bar-label"><span>{n}</span><span>{r}</span></div><div className="sim-bar-track"><div className="sim-bar-fill" style={{ width: w + '%' }} /></div></div>
                    ))}
                </div>
                <div className="sim-count">9,847</div><div className="sim-count-label">Simulations complete</div>
            </div>
        ),
        reverse: true,
    },
    {
        num: '03 / 03', tag: 'Optimise', title: ['Fine-tune in ', 'the sandbox'],
        desc: 'Drag sliders, swap cards, toggle spend categories. The reward total and confidence score update live.',
        details: ['Adjust monthly spend per category in real time', 'Swap cards and see the impact instantly', 'Confidence score recalculates on every change', 'Export your final plan or set reminders'],
        visual: (
            <div className="mock-sandbox">
                <div className="sandbox-header"><span className="sandbox-title">Reward Sandbox</span><span className="sandbox-total">₹1,18,400</span></div>
                {[['Dining', '₹8,000/mo', 65], ['Travel', '₹22,000/mo', 80], ['Online', '₹12,000/mo', 48]].map(([label, val, w]) => (
                    <div className="slider-row" key={label}><div className="slider-meta"><span>{label}</span><span>{val}</span></div><div className="slider-track"><div className="slider-fill" style={{ width: w + '%' }} /><div className="slider-thumb" style={{ left: `calc(${w}% - 6px)` }} /></div></div>
                ))}
                <div className="confidence-row"><span className="conf-label">Confidence score</span><span className="conf-val">78%</span></div>
            </div>
        ),
    },
];

export default function HowItWorksPage() {
    const { user } = useVoynt();
    return (
        <div style={{ background: '#FFFFFF', color: '#090708' }}>
            <Ticker />

            {/* NAV */}
            <nav className="light">
                <Link className="logo" to="/">Voy<span className="ln">n</span>t</Link>
                <div className="nav-links">
                    <Link className="nav-link active" to="/how-it-works">How it works</Link>
                    <a className="nav-link" href="#">Cards</a>
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
            <section className="hiw-page-hero">
                <div className="hiw-page-eyebrow">How it works</div>
                <h1 className="hiw-page-title">From goal to <span>reward strategy</span><br />in three steps</h1>
                <p className="hiw-page-sub">Voynt uses Monte Carlo simulation to turn your spending profile into a precision credit card reward plan.</p>
            </section>

            {/* STEPS */}
            <section className="hiw-section">
                <div className="steps-container">
                    {STEPS.map((step, i) => (
                        <div className="step-row" key={i} style={{ direction: step.reverse ? 'rtl' : 'ltr' }}>
                            <div className="step-content" style={{ direction: 'ltr', paddingRight: step.reverse ? 0 : 64, paddingLeft: step.reverse ? 64 : 0 }}>
                                <div className="step-label"><span className="step-num">{step.num}</span><span className="step-line" /><span className="step-tag">{step.tag}</span></div>
                                <h2 className="step-title">{step.title[0]}<span>{step.title[1]}</span></h2>
                                <p className="step-desc">{step.desc}</p>
                                <div className="step-detail">{step.details.map(d => <div className="detail-item" key={d}>{d}</div>)}</div>
                            </div>
                            <div className="step-visual" style={{ direction: 'ltr' }}>{step.visual}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="cta-section">
                <h2>Ready to earn <span>smarter</span>?</h2>
                <p>Takes about 2 minutes. No credit card required.</p>
                {user ? (
                    <Link className="btn-hero" to="/dashboard">Go to Dashboard <span className="arrow">→</span></Link>
                ) : (
                    <Link className="btn-hero" to="/auth#signup">Start Planning <span className="arrow">→</span></Link>
                )}
                <div style={{ marginTop: 16, fontSize: 11, color: 'var(--storm)', fontFamily: "'IBM Plex Mono',monospace" }}>Free to use &nbsp;·&nbsp; No card required</div>
            </section>

            {/* FOOTER */}
            <footer>
                <div className="footer-logo">Voy<span className="ln">n</span>t</div>
                <div className="footer-note">Built for people who take their rewards seriously.</div>
            </footer>
        </div>
    );
}
