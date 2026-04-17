import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { fetchExpenditureGraph } from '../lib/api';

export default function FeatureGraph({ spend, cards }) {
    const containerRef = useRef(null);
    const networkRef = useRef(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!containerRef.current) return;
        
        let active = true;
        setLoading(true);
        fetchExpenditureGraph(spend, cards).then(data => {
            if (!active) return;
            const nodes = new DataSet(data.nodes);
            const edges = new DataSet(data.edges);
            
            const options = {
                nodes: {
                    borderWidth: 1,
                    shape: 'dot',
                    font: { color: 'rgba(151,198,177,.8)', size: 10, face: "'IBM Plex Mono', monospace", multi: 'html' }
                },
                edges: {
                    color: { color: 'rgba(98,159,134,.3)', highlight: '#97C6B1' },
                    smooth: { type: 'continuous' },
                    width: 1
                },
                physics: {
                    forceAtlas2Based: {
                        gravitationalConstant: -180,
                        centralGravity: 0.02,
                        springLength: 120,
                        springConstant: 0.08
                    },
                    maxVelocity: 50,
                    solver: 'forceAtlas2Based',
                    timestep: 0.35,
                    stabilization: { iterations: 150 }
                },
                interaction: { hover: true, tooltipDelay: 200 }
            };
            
            networkRef.current = new Network(containerRef.current, { nodes, edges }, options);
            setLoading(false);
        }).catch(err => {
             if (!active) return;
            console.error('Graph fetch error:', err);
            setLoading(false);
        });

        return () => {
            active = false;
            if (networkRef.current) {
                networkRef.current.destroy();
                networkRef.current = null;
            }
        };
    }, [spend, cards]);

    return (
        <div style={{ position: 'relative', width: '100%', height: 480, background: '#0a0b0a', borderRadius: 10, border: '1px solid rgba(151,198,177,.08)', overflow: 'hidden' }}>
            {loading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'rgba(151,198,177,.4)', fontSize: 11, letterSpacing: 1 }}>Computing Topology...</div>}
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
}
