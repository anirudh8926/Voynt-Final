import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { fetchStrategyGraph } from '../lib/api';
import { getCardConfig } from '../data/cards';

/* ── Colour palette ──────────────────────────────────────────────────────── */
const COLOURS = {
    goal: { bg: '#9c27b0', border: '#e1bee7', font: '#ffffff' },
    card_optimal: { bg: '#7b1fa2', border: '#e1bee7', font: '#ffffff' },
    card: { bg: '#4a148c', border: '#ce93d8', font: '#ffffff' },
    cat_optimal: { bg: '#7b1fa2', border: '#e1bee7', font: '#ffffff' },
    category: { bg: '#311b92', border: '#b39ddb', font: '#ffffff' },
    recommended: { bg: '#512da8', border: '#d1c4e9', font: '#ffffff' },
    month: { bg: '#4527a0', border: '#b39ddb', font: '#ffffff' },
};

const EDGE_OPTIMAL = { color: '#ffffff', highlight: '#ffffff' };
const EDGE_NORMAL = { color: 'rgba(255,255,255,0.4)', highlight: '#ffffff' };
const EDGE_RECOMMENDED = { color: 'rgba(255,255,255,0.6)', highlight: '#ffffff' };

/* ── Helper: map raw node → vis node ─────────────────────────────────────── */
const MONTH_PALETTE = [
    { bg: '#ff5252', border: '#ff8a80' }, { bg: '#ff4081', border: '#ff80ab' },
    { bg: '#e040fb', border: '#ea80fc' }, { bg: '#7c4dff', border: '#b388ff' },
    { bg: '#536dfe', border: '#8c9eff' }, { bg: '#448aff', border: '#82b1ff' },
    { bg: '#40c4ff', border: '#84ffff' }, { bg: '#18ffff', border: '#84ffff' },
    { bg: '#64ffda', border: '#a7ffeb' }, { bg: '#69f0ae', border: '#b9f6ca' },
    { bg: '#b2ff59', border: '#ccff90' }, { bg: '#eeff41', border: '#f4ff81' },
];

function toVisNode(n) {
    const g = n.group || 'category';
    let c = COLOURS[g] || COLOURS.category;

    let tooltip = n.title || n.label;
    let cfg = null;
    if (g.startsWith('card')) {
        const str = n.label || n.id || '';
        const match = str.match(/^M(\d+):/);
        if (match) {
            const num = parseInt(match[1], 10);
            const idx = (num - 1) % MONTH_PALETTE.length;
            c = { bg: MONTH_PALETTE[idx].bg, border: MONTH_PALETTE[idx].border, font: '#ffffff' };
        }

        cfg = getCardConfig(n.label);
        if (cfg && cfg.highlights) {
            tooltip += '\n\nHighlights:\n' + cfg.highlights.map(h => '• ' + h).join('\n');
        }
    }

    return {
        id: n.id,
        label: n.label,
        x: n.x !== undefined ? n.x * 1.8 : undefined,
        y: n.y !== undefined ? n.y * 1.8 : undefined,
        customTooltip: { 
            title: n.title || n.label, 
            highlights: cfg?.highlights || null 
        },
        shape: g === 'goal' ? 'star' : g.startsWith('card') ? 'circle' : 'dot',
        size: n.size ? n.size * 2.5 : 35,
        margin: { top: 12, right: 20, bottom: 12, left: 20 },
        color: { background: c.bg, border: c.border, highlight: { background: c.border, border: '#fff' } },
        font: {
            color: c.font,
            size: g === 'goal' ? 24 : g.startsWith('card') ? 20 : 16,
            face: "'IBM Plex Mono', monospace",
            multi: false,
            strokeWidth: 0,
        },
        borderWidth: n.is_optimal ? 3 : 1,
        shadow: n.is_optimal
            ? { enabled: true, color: '#C9A84C66', size: 12, x: 0, y: 0 }
            : false,
        mass: g === 'goal' ? 10 : g === 'month' ? 6 : g.startsWith('card') ? 4 : 1,
    };
}

/* ── Helper: map raw edge → vis edge ─────────────────────────────────────── */
function toVisEdge(e, idx) {
    const col = e.color || (e.dashes ? EDGE_RECOMMENDED : e.is_optimal ? EDGE_OPTIMAL : EDGE_NORMAL);
    return {
        id: `e_${idx}`,
        from: e.from,
        to: e.to,
        label: e.label || '',
        title: e.title || '',
        width: e.width || 1,
        dashes: e.dashes || false,
        color: col,
        font: {
            color: 'rgba(151,198,177,.7)',
            size: 22,
            face: "'IBM Plex Mono', monospace",
            align: 'horizontal',
            strokeWidth: 3,
            strokeColor: '#090708',
            vadjust: -8,
        },
        smooth: { type: 'dynamic' },
        arrows: e.arrows || { to: { enabled: true, scaleFactor: 0.5 } },
    };
}

/* ── Network options ─────────────────────────────────────────────────────── */
const NETWORK_OPTIONS = {
    nodes: { borderWidth: 1, borderWidthSelected: 2 },
    edges: { smooth: { type: 'cubicBezier', forceDirection: 'horizontal', roundness: 0.4 } },
    physics: false,
    interaction: {
        hover: true,
        tooltipDelay: 150,
        zoomView: true,
        dragView: true,
        navigationButtons: false,
        keyboard: { enabled: false },
    },
};

/* ── Legend items ─────────────────────────────────────────────────────────── */
const LEGEND = [
    { color: '#9c27b0', label: 'Goal/Start', shape: 'star', border: '#e1bee7' },
    { color: '#4a148c', label: 'Card usage', shape: 'circle', border: '#ce93d8' },
];

/* ── Component ───────────────────────────────────────────────────────────── */
export default function SimulationGraph({ sessionId }) {
    const containerRef = useRef(null);
    const networkRef = useRef(null);
    const [state, setState] = useState('idle'); // idle | loading | ready | error | no_data
    const [meta, setMeta] = useState(null);     // { nodeCount, edgeCount, bestCard }
    const [tooltipData, setTooltipData] = useState(null);

    useEffect(() => {
        if (!sessionId || !containerRef.current) return;

        let alive = true;
        let animId;
        setState('loading');

        fetchStrategyGraph(sessionId)
            .then(data => {
                if (!alive) return;
                const { nodes: rawNodes, edges: rawEdges, best_card_id } = data;

                if (!rawNodes?.length) {
                    setState('no_data');
                    return;
                }

                const visNodes = new DataSet(rawNodes.map(toVisNode));
                const visEdges = new DataSet(rawEdges.map(toVisEdge));

                if (networkRef.current) {
                    networkRef.current.destroy();
                    networkRef.current = null;
                }

                networkRef.current = new Network(
                    containerRef.current,
                    { nodes: visNodes, edges: visEdges },
                    NETWORK_OPTIONS,
                );

                networkRef.current.once('afterDrawing', () => {
                    networkRef.current?.fit({ animation: { duration: 600, easingFunction: 'easeInOutQuad' } });
                    setState('ready');
                });

                // Particle animation on edges
                networkRef.current.on('afterDrawing', (ctx) => {
                    const time = Date.now() / 1000;
                    ctx.save();
                    rawEdges.forEach(edge => {
                        const pFrom = networkRef.current.getPositions([edge.from])[edge.from];
                        const pTo = networkRef.current.getPositions([edge.to])[edge.to];
                        if (!pFrom || !pTo) return;
                        
                        const dist = Math.hypot(pTo.x - pFrom.x, pTo.y - pFrom.y);
                        const speed = 120; // px per second
                        const duration = dist / speed;
                        if (duration === 0) return;
                        
                        // Create 2 particles per edge offset in time
                        [0, 0.5].forEach(offset => {
                            const progress = ((time + offset * duration) % duration) / duration;
                            
                            // Follow a rough bezier curve for smoother look, or just straight line if physics is off
                            // Since roundness is 0.4 and forceDirection is horizontal:
                            // We can approximate or just use linear since it's fast
                            const px = pFrom.x + (pTo.x - pFrom.x) * progress;
                            const py = pFrom.y + (pTo.y - pFrom.y) * progress;
                            
                            ctx.beginPath();
                            ctx.arc(px, py, edge.is_optimal ? 3 : 2, 0, 2 * Math.PI);
                            ctx.fillStyle = edge.is_optimal ? '#ffffff' : 'rgba(255,255,255,0.5)';
                            ctx.shadowColor = edge.is_optimal ? '#fff' : '#e1bee7';
                            ctx.shadowBlur = edge.is_optimal ? 12 : 6;
                            ctx.fill();
                        });
                    });
                    ctx.restore();
                });

                // Tooltip events
                networkRef.current.on('hoverNode', (params) => {
                    const node = visNodes.get(params.node);
                    if (node && node.customTooltip) {
                        const pos = networkRef.current.canvasToDOM(networkRef.current.getPositions([node.id])[node.id]);
                        setTooltipData({ x: pos.x, y: pos.y, ...node.customTooltip });
                    }
                });
                networkRef.current.on('blurNode', () => {
                    setTooltipData(null);
                });

                // Force 60fps redraw for particles
                let animId;
                const renderLoop = () => {
                    if (networkRef.current) networkRef.current.redraw();
                    animId = requestAnimationFrame(renderLoop);
                };
                renderLoop();

                // Best card name for header
                const bestNode = rawNodes.find(n => n.id === `card_${best_card_id}`);
                setMeta({
                    nodeCount: rawNodes.length,
                    edgeCount: rawEdges.length,
                    bestCard: bestNode?.label || 'Unknown',
                    animId,
                });
            })
            .catch(err => {
                if (!alive) return;
                console.error('[SimulationGraph]', err);
                setState('error');
            });

        return () => {
            alive = false;
            if (animId) cancelAnimationFrame(animId);
            networkRef.current?.destroy();
            networkRef.current = null;
        };
    }, [sessionId]);

    return (
        <div style={{ position: 'relative', width: '100%', fontFamily: "'IBM Plex Mono', monospace" }}>

            {/* ── Graph canvas ─────────────────────────────────────────── */}
            <div className="graph-container" style={{
                position: 'relative',
                width: '100%',
                height: 720,
                borderRadius: 12,
                border: '1px solid rgba(156, 39, 176, 0.2)',
                overflow: 'hidden',
            }}>
                {/* Loading overlay */}
                {state === 'loading' && (
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex',
                        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(8,12,8,.85)', zIndex: 10,
                    }}>
                        <div style={{
                            width: 36, height: 36, border: '2px solid rgba(151,198,177,.1)',
                            borderTop: '2px solid #C9A84C', borderRadius: '50%',
                            animation: 'spin 1s linear infinite', marginBottom: 16,
                        }} />
                        <div style={{ fontSize: 11, color: 'rgba(151,198,177,.5)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                            Mapping strategy graph…
                        </div>
                    </div>
                )}

                {/* No-data overlay */}
                {state === 'no_data' && (
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex',
                        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <div style={{ fontSize: 24, marginBottom: 12, opacity: .4 }}>◈</div>
                        <div style={{ fontSize: 11, color: 'rgba(151,198,177,.3)', letterSpacing: 1 }}>
                            Run a simulation to see the strategy graph.
                        </div>
                    </div>
                )}

                {/* Error overlay */}
                {state === 'error' && (
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex',
                        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <div style={{ fontSize: 24, marginBottom: 12 }}>⚠</div>
                        <div style={{ fontSize: 11, color: 'rgba(220,80,80,.5)', letterSpacing: 1 }}>
                            Could not load graph — backend may be warming up.
                        </div>
                    </div>
                )}

                {/* vis-network mount point */}
                <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

                {/* Watermark grid */}
                {state === 'ready' && (
                    <div style={{
                        position: 'absolute', bottom: 10, right: 14, fontSize: 8,
                        color: 'rgba(151,198,177,.15)', letterSpacing: '1.5px', textTransform: 'uppercase',
                        pointerEvents: 'none',
                    }}>
                        voynt · strategy graph
                    </div>
                )}
            </div>

            {/* ── Meta bar ─────────────────────────────────────────────── */}
            {state === 'ready' && meta && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginTop: 12, padding: '8px 14px',
                    background: 'rgba(9,7,8,.6)', border: '1px solid rgba(151,198,177,.06)',
                    borderRadius: 8, fontSize: 9, letterSpacing: '1px',
                }}>
                    <div style={{ color: 'rgba(151,198,177,.4)', textTransform: 'uppercase' }}>
                        {meta.nodeCount} nodes · {meta.edgeCount} edges
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'rgba(151,198,177,.35)', textTransform: 'uppercase' }}>Optimal path →</span>
                        <span style={{
                            padding: '2px 8px', borderRadius: 4,
                            background: 'rgba(201,168,76,.15)', border: '1px solid rgba(201,168,76,.35)',
                            color: '#C9A84C', letterSpacing: 1,
                        }}>{meta.bestCard}</span>
                    </div>
                </div>
            )}

            {/* ── Legend ───────────────────────────────────────────────── */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '8px 18px',
                marginTop: 12, padding: '10px 14px',
                background: 'rgba(9,7,8,.5)', border: '1px solid rgba(151,198,177,.05)',
                borderRadius: 8,
            }}>
                {LEGEND.map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{
                            width: 10, height: 10, borderRadius: item.shape === 'dot' || item.shape === 'star' ? '50%' : item.shape === 'hexagon' ? '20%' : 3,
                            background: item.color,
                            border: `1.5px ${item.dashed ? 'dashed' : 'solid'} ${item.border}`,
                            flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 9, color: 'rgba(151,198,177,.45)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* ── Spin keyframes ───────────────────────────────────────── */}
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes moveGrid { to { background-position: 40px 40px; } }
                .graph-container {
                    background-color: #060508;
                    background-image: 
                        linear-gradient(rgba(156, 39, 176, 0.08) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(156, 39, 176, 0.08) 1px, transparent 1px);
                    background-size: 40px 40px;
                    animation: moveGrid 3s linear infinite;
                    box-shadow: 0 0 40px rgba(156, 39, 176, 0.05) inset;
                }
                .glass-tooltip {
                    position: absolute;
                    background: rgba(15, 10, 20, 0.75);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(156, 39, 176, 0.3);
                    border-radius: 8px;
                    padding: 12px 16px;
                    color: #fff;
                    font-size: 11px;
                    pointer-events: none;
                    z-index: 100;
                    transform: translate(-50%, -120%);
                    box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 16px rgba(156, 39, 176, 0.2);
                    width: max-content;
                    max-width: 280px;
                    transition: opacity 0.15s ease;
                }
                .glass-tooltip h4 {
                    margin: 0 0 8px 0;
                    font-size: 13px;
                    color: #e1bee7;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    border-bottom: 1px solid rgba(156, 39, 176, 0.3);
                    padding-bottom: 4px;
                }
                .glass-tooltip ul {
                    margin: 0;
                    padding-left: 16px;
                    color: rgba(255,255,255,0.85);
                }
                .glass-tooltip li {
                    margin-bottom: 4px;
                    line-height: 1.4;
                }
            `}</style>

            {/* Custom Tooltip */}
            {tooltipData && (
                <div className="glass-tooltip" style={{ left: tooltipData.x, top: tooltipData.y }}>
                    <h4>{tooltipData.title}</h4>
                    {tooltipData.highlights ? (
                        <ul>
                            {tooltipData.highlights.map((h, i) => <li key={i}>{h}</li>)}
                        </ul>
                    ) : null}
                </div>
            )}
        </div>
    );
}
