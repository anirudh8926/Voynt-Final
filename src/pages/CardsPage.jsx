import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useVoynt } from '../context/VoyntContext';
import * as THREE from 'three';
import Ticker from '../components/Ticker';
import '../styles/cards.css';

import { TOP_PICKS, HDFC_CARDS, SBI_CARDS, AXIS_CARDS, ICICI_CARDS, AMEX_CARDS, KOTAK_CARDS } from '../data/cards';

/* ── Three.js Card Data ──────────────────────────────────────────────────── */
const CARDS_3D = [
    { issuer: 'HDFC', name: 'Infinia Metal', last4: '3758', colors: ['#0c0c0c', '#1e1e1e', '#0c0c0c'], textColor: '#c9a84c' },
    { issuer: 'Axis', name: 'Atlas', last4: '6215', colors: ['#001030', '#002070', '#001030'], textColor: '#6ab3e8' },
    { issuer: 'SBI', name: 'Elite', last4: '0458', colors: ['#001e40', '#004080', '#001e40'], textColor: '#5ba8ff' },
    { issuer: 'Amex', name: 'Platinum', last4: '1001', colors: ['#0a1a2a', '#163452', '#0c1e36'], textColor: '#6ecff6' },
    { issuer: 'ICICI', name: 'Emeralde', last4: '3317', colors: ['#1a0030', '#3a0070', '#1a0030'], textColor: '#aaaaff' }
];
/* ── Small card visual (CSS 3D tilt) ─────────────────────────────────────── */
function CardVisual({ style, issuer, issuerColor, pan, cardName }) {
    return (
        <div className="cv-wrap">
            <div className="cv" style={style}>
                <div className="cv-face" style={style}></div>
                <div className="cv-emboss"></div>
                <span className="cv-issuer" style={{ color: issuerColor }}>{issuer}</span>
                <div className="cv-chip"></div>
                <span className="cv-pan" style={{ color: 'rgba(255,255,255,.35)' }}>•••• •••• •••• {pan}</span>
                <span className="cv-name" style={{ color: issuerColor }}>{cardName}</span>
                <div className="cv-net">
                    <div className="cv-dot" style={{ background: '#eb001b' }}></div>
                    <div className="cv-dot" style={{ background: '#f79e1b' }}></div>
                </div>
            </div>
        </div>
    );
}

/* ── Generic card item ───────────────────────────────────────────────────── */
function CardItem({ card, delay }) {
    return (
        <div className="citem" data-c={card.cats} style={{ animationDelay: `${delay || 0.04}s` }}>
            <CardVisual style={card.cardStyle} issuer={card.issuer} issuerColor={card.issuerColor} pan={card.pan} cardName={card.cardName} />
            <div className="cinfo">
                <div className="ctitle">{card.title}</div>
                <div className="cbank">{card.bank}</div>
                <div className="chighlights">
                    {card.highlights.map((h, i) => <div className="chi" key={i}>{h}</div>)}
                </div>
                <div className="ctags">{card.tags.map(t => <span className="ctag" key={t}>{t}</span>)}</div>
                <div className="cmeta">
                    <span className="cfee">Annual Fee <strong>{card.fee}</strong></span>
                    <button className="clink">View →</button>
                </div>
            </div>
        </div>
    );
}

/* ── Featured card ───────────────────────────────────────────────────────── */
function FeatCard({ card }) {
    return (
        <div className="citem feat" data-c={card.cats}>
            <div className="feat-inner">
                <div className="feat-left">
                    <CardVisual style={{ ...card.cardStyle, height: 168 }} issuer={card.issuer} issuerColor={card.issuerColor} pan={card.pan} cardName={card.cardName} />
                    <div className="cinfo">
                        <div className="best-pill">{card.best}</div>
                        <div className="ctitle">{card.title}</div>
                        <div className="cbank">{card.bank}</div>
                        <div className="chighlights">
                            {card.highlights.map((h, i) => <div className="chi" key={i}>{h}</div>)}
                        </div>
                        <div className="ctags">{card.tags.map(t => <span className="ctag" key={t}>{t}</span>)}</div>
                        <div className="cmeta">
                            <span className="cfee">Annual Fee <strong>{card.fee}</strong></span>
                            <button className="clink">View Details →</button>
                        </div>
                    </div>
                </div>
                <div className="feat-right">
                    {card.stats.map(([val, lbl], i) => (
                        <React.Fragment key={lbl}>
                            <div><div className="fstat-val">{val}</div><div className="fstat-lbl">{lbl}</div></div>
                            {i < card.stats.length - 1 && <div className="fdash"></div>}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ── Section helpers ─────────────────────────────────────────────────────── */
function Section({ title, count, children }) {
    return (
        <>
            <div className="sec-head" style={{ marginTop: 60 }}>
                <h2>{title}</h2><span className="sh-n">{count}</span><div className="sec-line"></div>
            </div>
            <div className="cgrid">{children}</div>
        </>
    );
}

/* ── Helper: build card items for a bank ────────────────────────────────── */
function bankItems(cards, bankLabel, issuerColor, bgGradient, issuerKey) {
    return cards.map((c, i) => ({
        ...c,
        bank: c.bank || `${bankLabel} ·`,
        cardStyle: { background: bgGradient },
        issuer: c.issuer || issuerKey || bankLabel.split(' ')[0],
        issuerColor,
        delay: (i + 1) * 0.04,
    }));
}

const HDFC_BG = 'linear-gradient(135deg,#0c0c0c 0%,#1e1e1e 50%,#0c0c0c 100%)';
const SBI_BG = 'linear-gradient(135deg,#001e40 0%,#004080 50%,#001e40 100%)';
const AXIS_BG = 'linear-gradient(135deg,#001030 0%,#002070 50%,#001030 100%)';
const ICICI_BG = 'linear-gradient(135deg,#1a0030 0%,#3a0070 50%,#1a0030 100%)';
const AMEX_BG = 'linear-gradient(135deg,#0a1a2a 0%,#163452 50%,#0c1e36 100%)';
const KOTAK_BG = 'linear-gradient(135deg,#1a1000 0%,#3a2800 50%,#1a1200 100%)';

/* ── Main Page ─────────────────────────────────────────────────────────── */
export default function CardsPage() {
    const { user } = useVoynt();
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const navRef = useRef(null);

    const [activeFilter, setActiveFilter] = useState('all');
    const [query, setQuery] = useState('');

    /* Three.js hero */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const W = () => window.innerWidth;
        const H = () => canvas.parentElement.clientHeight || window.innerHeight;

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(W(), H());
        renderer.setClearColor(0x080a0d, 1);
        renderer.shadowMap.enabled = true;

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x080a0d, 0.04);

        const camera = new THREE.PerspectiveCamera(45, W() / H(), 0.1, 100);
        camera.position.set(0, 0.5, 7);

        const ambient = new THREE.AmbientLight(0x97C6B1, 0.35); scene.add(ambient);
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
        keyLight.position.set(3, 6, 5); keyLight.castShadow = true; scene.add(keyLight);
        const fillLight = new THREE.PointLight(0x629F86, 1.8, 20);
        fillLight.position.set(-4, 2, 3); scene.add(fillLight);
        const rimLight = new THREE.PointLight(0xCAE9D9, 1.2, 16);
        rimLight.position.set(2, -2, -2); scene.add(rimLight);

        // Particle field
        const ptGeo = new THREE.BufferGeometry();
        const ptCount = 320, ptPos = new Float32Array(ptCount * 3);
        for (let i = 0; i < ptCount * 3; i++) ptPos[i] = (Math.random() - 0.5) * 30;
        ptGeo.setAttribute('position', new THREE.BufferAttribute(ptPos, 3));
        scene.add(new THREE.Points(ptGeo, new THREE.PointsMaterial({ color: 0x629F86, size: 0.04, transparent: true, opacity: 0.5 })));

        // Card texture builder
        function makeCardTexture(cfg) {
            const cw = 512, ch = 320;
            const oc = document.createElement('canvas');
            oc.width = cw; oc.height = ch;
            const ctx = oc.getContext('2d');
            const grd = ctx.createLinearGradient(0, 0, cw, ch);
            cfg.colors.forEach((c, i) => grd.addColorStop(i / (cfg.colors.length - 1), c));
            ctx.fillStyle = grd;
            const r = 24;
            ctx.beginPath();
            ctx.moveTo(r, 0); ctx.lineTo(cw - r, 0); ctx.quadraticCurveTo(cw, 0, cw, r);
            ctx.lineTo(cw, ch - r); ctx.quadraticCurveTo(cw, ch, cw - r, ch);
            ctx.lineTo(r, ch); ctx.quadraticCurveTo(0, ch, 0, ch - r);
            ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
            ctx.closePath(); ctx.fill();
            const gloss = ctx.createLinearGradient(0, 0, 0, ch * 0.5);
            gloss.addColorStop(0, 'rgba(255,255,255,0.12)'); gloss.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gloss; ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 0.5;
            for (let x = 0; x < cw; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke(); }
            for (let y = 0; y < ch; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke(); }
            const chipX = cw - 80, chipY = 36;
            const chipGrd = ctx.createLinearGradient(chipX, chipY, chipX + 44, chipY + 30);
            chipGrd.addColorStop(0, '#d4b483'); chipGrd.addColorStop(1, '#a07830');
            ctx.fillStyle = chipGrd;
            ctx.beginPath(); ctx.moveTo(chipX + 5, chipY); ctx.lineTo(chipX + 39, chipY);
            ctx.quadraticCurveTo(chipX + 44, chipY, chipX + 44, chipY + 5);
            ctx.lineTo(chipX + 44, chipY + 25); ctx.quadraticCurveTo(chipX + 44, chipY + 30, chipX + 39, chipY + 30);
            ctx.lineTo(chipX + 5, chipY + 30); ctx.quadraticCurveTo(chipX, chipY + 30, chipX, chipY + 25);
            ctx.lineTo(chipX, chipY + 5); ctx.quadraticCurveTo(chipX, chipY, chipX + 5, chipY);
            ctx.closePath(); ctx.fill();
            ctx.font = 'bold 28px Arial,sans-serif'; ctx.fillStyle = cfg.textColor; ctx.fillText(cfg.issuer, 28, 54);
            ctx.font = '18px "Courier New",monospace'; ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillText('•••• •••• •••• ' + cfg.last4, 28, ch - 72);
            ctx.font = 'bold 20px Arial,sans-serif'; ctx.fillStyle = cfg.textColor; ctx.globalAlpha = 0.8;
            ctx.fillText(cfg.name, 28, ch - 38); ctx.globalAlpha = 1;
            ctx.fillStyle = 'rgba(235,0,27,0.7)'; ctx.beginPath(); ctx.arc(cw - 54, ch - 32, 14, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(247,158,27,0.65)'; ctx.beginPath(); ctx.arc(cw - 40, ch - 32, 14, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(r, 0); ctx.lineTo(cw - r, 0); ctx.quadraticCurveTo(cw, 0, cw, r);
            ctx.lineTo(cw, ch - r); ctx.quadraticCurveTo(cw, ch, cw - r, ch);
            ctx.lineTo(r, ch); ctx.quadraticCurveTo(0, ch, 0, ch - r);
            ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
            ctx.closePath(); ctx.stroke();
            return new THREE.CanvasTexture(oc);
        }

        // Build card meshes
        const cardW = 3.2, cardH = 2.0, cardDepth = 0.04;
        const cards = [];
        const group = new THREE.Group();
        scene.add(group);
        CARDS_3D.forEach((data, i) => {
            const geo = new THREE.BoxGeometry(cardW, cardH, cardDepth);
            const tex = makeCardTexture(data);
            const mat = [
                new THREE.MeshPhongMaterial({ color: 0x111111 }),
                new THREE.MeshPhongMaterial({ color: 0x111111 }),
                new THREE.MeshPhongMaterial({ color: 0x111111 }),
                new THREE.MeshPhongMaterial({ color: 0x111111 }),
                new THREE.MeshPhongMaterial({ map: tex, shininess: 120, specular: new THREE.Color(0x444444) }),
                new THREE.MeshPhongMaterial({ color: 0x0a0a0a, shininess: 40 }),
            ];
            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true;
            mesh.renderOrder = i;
            const spread = i - (CARDS_3D.length - 1) / 2;
            mesh.userData = { baseX: spread * 0.28, baseY: -spread * 0.16, baseZ: -i * 0.5, baseRotY: spread * 0.14, baseRotZ: -spread * 0.08 };
            mesh.position.set(mesh.userData.baseX, mesh.userData.baseY, mesh.userData.baseZ);
            mesh.rotation.y = mesh.userData.baseRotY;
            mesh.rotation.z = mesh.userData.baseRotZ;
            group.add(mesh); cards.push(mesh);
        });

        let scrollY = 0, mouseX = 0, mouseY = 0, camX = 0, camY = 0.5;
        let targetGroupRotY = 0, targetSpread = 0, targetGroupY = 0;

        const onScroll = () => { scrollY = window.scrollY; };
        const onMouse = e => {
            mouseX = (e.clientX / W() - 0.5) * 2;
            mouseY = (e.clientY / H() - 0.5) * 2;
        };
        window.addEventListener('scroll', onScroll);
        document.addEventListener('mousemove', onMouse);

        const clock = new THREE.Clock();
        let rafId;
        function animate() {
            rafId = requestAnimationFrame(animate);
            const t = clock.getElapsedTime();
            const scrollFrac = Math.min(scrollY / (H() * 0.3), 1);
            targetGroupRotY = scrollFrac * Math.PI * 0.9 - Math.PI * 0.08;
            targetSpread = scrollFrac * 3.2;
            targetGroupY = -scrollFrac * 1.2;
            const tcx = mouseX * 0.25, tcy = 0.5 - mouseY * 0.2;
            camX += (tcx - camX) * 0.06; camY += (tcy - camY) * 0.06;
            camera.position.x = camX; camera.position.y = camY; camera.lookAt(0, 0, 0);
            group.rotation.y += (targetGroupRotY - group.rotation.y) * 0.07;
            group.position.y += (targetGroupY - group.position.y) * 0.07;
            cards.forEach((card, i) => {
                const ud = card.userData;
                const s = i - (CARDS_3D.length - 1) / 2;
                const tx = ud.baseX + s * targetSpread * 0.42;
                const ty = ud.baseY + Math.sin(t * 0.6 + i * 0.8) * 0.07;
                const tz = ud.baseZ + Math.abs(s) * targetSpread * 0.18;
                const trz = ud.baseRotZ - s * targetSpread * 0.04;
                card.position.x += (tx - card.position.x) * 0.07;
                card.position.y += (ty - card.position.y) * 0.07;
                card.position.z += (tz - card.position.z) * 0.07;
                card.rotation.z += (trz - card.rotation.z) * 0.07;
                card.rotation.x = Math.sin(t * 0.3 + i) * 0.025;
            });
            fillLight.intensity = 1.6 + Math.sin(t * 0.7) * 0.3;
            rimLight.position.x = 2 + Math.sin(t * 0.4) * 1;
            renderer.render(scene, camera);
        }
        animate();

        const onResize = () => { camera.aspect = W() / H(); camera.updateProjectionMatrix(); renderer.setSize(W(), H()); };
        window.addEventListener('resize', onResize);

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('scroll', onScroll);
            document.removeEventListener('mousemove', onMouse);
            window.removeEventListener('resize', onResize);
            renderer.dispose();
        };
    }, []);

    /* Nav scroll */
    useEffect(() => {
        const nav = navRef.current;
        const onScroll = () => nav?.classList.toggle('lit', window.scrollY > window.innerHeight * 0.6);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    /* Filter logic */
    const FILTERS = ['all', 'travel', 'cashback', 'lifestyle', 'fuel', 'premium', 'entry', 'hdfc', 'sbi', 'axis', 'icici', 'amex'];

    const hdfcItems = bankItems(HDFC_CARDS, 'HDFC Bank', '#c9a84c', HDFC_BG, 'HDFC');
    const sbiItems = bankItems(SBI_CARDS, 'SBI Cards', '#5ba8ff', SBI_BG, 'SBI');
    const axisItems = bankItems(AXIS_CARDS, 'Axis Bank', '#6ab3e8', AXIS_BG, 'Axis');
    const iciciItems = bankItems(ICICI_CARDS, 'ICICI Bank', '#aaaaff', ICICI_BG, 'ICICI');
    const amexItems = bankItems(AMEX_CARDS, 'Amex', '#6ecff6', AMEX_BG, 'Amex');
    const kotakItems = bankItems(KOTAK_CARDS, 'Kotak Bank', '#d4a44c', KOTAK_BG, 'Kotak');

    function visible(card) {
        const cats = card.cats || '';
        const text = card.title.toLowerCase() + ' ' + cats;
        const fm = activeFilter === 'all' || cats.includes(activeFilter);
        const qm = !query || text.includes(query.toLowerCase());
        return fm && qm;
    }

    const totalCount = [...TOP_PICKS, ...hdfcItems, ...sbiItems, ...axisItems, ...iciciItems, ...amexItems, ...kotakItems].filter(visible).length;

    function renderSection(label, items) {
        const vis = items.filter(visible);
        if (!vis.length) return null;
        return (
            <Section key={label} title={label} count={vis.length}>
                {vis.map((c, i) => <CardItem key={c.title} card={c} delay={(i + 1) * 0.04} />)}
            </Section>
        );
    }

    return (
        <div style={{ background: '#080a0d', color: '#e4ede8', fontFamily: "'IBM Plex Mono',monospace", cursor: 'none' }}>
            <Ticker />

            {/* NAV */}
            <nav id="cards-nav" ref={navRef} className="cards-nav">
                <Link className="logo" to="/">Voy<span className="ln">n</span>t</Link>
                <div className="nav-links">
                    <Link className="nav-link" to="/how-it-works">How it works</Link>
                    <Link className="nav-link active" to="/cards">Cards</Link>
                    <Link className="nav-link" to="/dashboard">Dashboard</Link>
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

            {/* HERO — Three.js */}
            <section id="hero" style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#080a0d' }}>
                <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
                {/* Grid overlay */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(151,198,177,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(151,198,177,.04) 1px,transparent 1px)', backgroundSize: '52px 52px' }} />
                {/* Vignette */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', background: 'radial-gradient(ellipse 75% 75% at 50% 50%,transparent 30%,rgba(6,8,10,.55) 80%,rgba(6,8,10,.9) 100%)' }} />
                <div className="hero-ui" style={{ position: 'absolute', inset: 0, zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
                    <div className="cards-hero-eyebrow">Card Directory</div>
                    <h1 className="cards-hero-h1">Every card.<br /><span className="ln">Every reward.</span></h1>
                    <p className="cards-hero-sub">The complete database of Indian credit cards — rewards, fees, and best-use scenarios.<br />Built for Voynt's simulation engine.</p>
                </div>
                <div className="scroll-hint-cards">
                    <div className="scroll-line-cards"></div>
                    <span>Scroll</span>
                </div>
            </section>

            {/* CARDS BODY */}
            <div style={{ background: '#080a0d', position: 'relative', overflow: 'hidden' }}>
                <div style={{ height: 60, background: '#080a0d' }} />
                <div className="cards-section">

                    {/* FILTER BAR */}
                    <div className="filter-bar">
                        {['All Cards', 'Travel', 'Cashback', 'Lifestyle', 'Fuel', 'Premium', 'Entry-Level', 'HDFC', 'SBI', 'Axis', 'ICICI', 'Amex'].map((label, i) => {
                            const f = FILTERS[i];
                            return (
                                <React.Fragment key={f}>
                                    {(i === 1 || i === 7) && <div className="fdivider" />}
                                    <button className={`ftab${activeFilter === f ? ' active' : ''}`} onClick={() => setActiveFilter(f)}>{label}</button>
                                </React.Fragment>
                            );
                        })}
                        <div className="fright">
                            <div className="search-wrap">
                                <span style={{ fontSize: 13, color: '#636364' }}>⌕</span>
                                <input type="text" placeholder="Search cards…" value={query} onChange={e => setQuery(e.target.value)} />
                            </div>
                            <span className="count-label"><strong>{totalCount}</strong> cards</span>
                        </div>
                    </div>

                    {/* TOP PICKS */}
                    {TOP_PICKS.filter(visible).length > 0 && (
                        <>
                            <div className="sec-head"><h2>Top Picks</h2><span className="sh-n">0{TOP_PICKS.filter(visible).length}</span><div className="sec-line"></div></div>
                            <div className="cgrid" id="g-feat">
                                {TOP_PICKS.filter(visible).map(c => <FeatCard key={c.title} card={c} />)}
                            </div>
                        </>
                    )}

                    {renderSection('HDFC Bank', hdfcItems)}
                    {renderSection('SBI Cards', sbiItems)}
                    {renderSection('Axis Bank', axisItems)}
                    {renderSection('ICICI Bank', iciciItems)}
                    {renderSection('American Express', amexItems)}
                    {renderSection('Kotak Bank', kotakItems)}

                    {totalCount === 0 && (
                        <div style={{ textAlign: 'center', padding: '80px 0', fontSize: 12, color: 'rgba(151,198,177,.4)' }}>
                            No cards match your search.
                        </div>
                    )}
                </div>
            </div>

            {/* FOOTER */}
            <footer>
                <div className="footer-logo">Voy<span className="ln">n</span>t</div>
                <div className="footer-note">Data sourced from public issuer information · Updated Feb 2026</div>
            </footer>
        </div>
    );
}
