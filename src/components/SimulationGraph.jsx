import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { fetchStrategyGraph } from '../lib/api';

/* ── Colour palette ──────────────────────────────────────────────────────── */
const COLOURS = {
    goal:         { bg: '#C9A84C', border: '#F0D060', font: '#090708' },
    card_optimal: { bg: '#97C6B1', border: '#C9A84C', font: '#090708' },
    card:         { bg: '#1a2e28', border: '#629F86', font: '#97C6B1' },
    cat_optimal:  { bg: '#203020', border: '#C9A84C', font: '#C9A84C' },
    category:     { bg: '#141a14', border: '#3a6050', font: '#629F86' },
    recommended:  { bg: '#1e1a28', border: '#7B6EA0', font: '#A090D0' },
    month:        { bg: '#0b131a', border: '#244557', font: '#49849e' },
};

const EDGE_OPTIMAL   = { color: '#C9A84C', highlight: '#F0D060' };
const EDGE_NORMAL    = { color: 'rgba(98,159,134,.35)', highlight: '#97C6B1' };
const EDGE_RECOMMENDED = { color: 'rgba(123,110,160,.5)', highlight: '#A090D0' };

/* ── Helper: map raw node → vis node ─────────────────────────────────────── */
function toVisNode(n) {
    const g = n.group || 'category';
    const c = COLOURS[g] || COLOURS.category;
    return {
        id: n.id,
        label: n.label,
        x: n.x,
        y: n.y,
        fixed: n.fixed,
        title: n.title || n.label,
        shape: g === 'goal' ? 'star' : g.startsWith('card') ? 'ellipse' : 'dot',
        size: n.size || 14,
        color: { background: c.bg, border: c.border, highlight: { background: c.border, border: '#fff' } },
        font: {
            color: c.font,
            size: g === 'goal' ? 14 : g.startsWith('card') ? 11 : 9,
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
            size: 9,
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
    { color: '#C9A84C', label: 'Goal/Start', shape: 'star', border: '#F0D060' },
    { color: '#1a2e28', label: 'Card usage', shape: 'ellipse', border: '#629F86' },
];

/* ── Component ───────────────────────────────────────────────────────────── */
export default function SimulationGraph({ sessionId }) {
    const containerRef = useRef(null);
    const networkRef   = useRef(null);
    const [state, setState] = useState('idle'); // idle | loading | ready | error | no_data
    const [meta, setMeta] = useState(null);     // { nodeCount, edgeCount, bestCard }

    useEffect(() => {
        if (!sessionId || !containerRef.current) return;

        let alive = true;
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

                // Best card name for header
                const bestNode = rawNodes.find(n => n.id === `card_${best_card_id}`);
                setMeta({
                    nodeCount: rawNodes.length,
                    edgeCount: rawEdges.length,
                    bestCard: bestNode?.label || 'Unknown',
                });
            })
            .catch(err => {
                if (!alive) return;
                console.error('[SimulationGraph]', err);
                setState('error');
            });

        return () => {
            alive = false;
            networkRef.current?.destroy();
            networkRef.current = null;
        };
    }, [sessionId]);

    return (
        <div style={{ position: 'relative', width: '100%', fontFamily: "'IBM Plex Mono', monospace" }}>

            {/* ── Graph canvas ─────────────────────────────────────────── */}
            <div style={{
                position: 'relative',
                width: '100%',
                height: 560,
                background: 'radial-gradient(ellipse at center, #0d1810 0%, #080c08 100%)',
                borderRadius: 12,
                border: '1px solid rgba(151,198,177,.10)',
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
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
