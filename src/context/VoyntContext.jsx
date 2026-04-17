import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const VoyntContext = createContext(null);

const SS_KEYS = {
    profile: 'voynt_profile',
    results: 'voynt_last_results',
    sessionId: 'voynt_session_id',
    firstName: 'voynt_firstName',
    lastName: 'voynt_lastName',
};

function loadFromStorage() {
    try {
        const fName = sessionStorage.getItem(SS_KEYS.firstName);
        const lName = sessionStorage.getItem(SS_KEYS.lastName);
        const user = fName || lName ? { firstName: fName || '', lastName: lName || '' } : null;

        return {
            profile: JSON.parse(sessionStorage.getItem(SS_KEYS.profile) || 'null'),
            results: JSON.parse(sessionStorage.getItem(SS_KEYS.results) || 'null'),
            sessionId: sessionStorage.getItem(SS_KEYS.sessionId) || null,
            user,
        };
    } catch {
        return { profile: null, results: null, sessionId: null, user: null };
    }
}

export function VoyntProvider({ children }) {
    // sessionId is initialized directly from sessionStorage so it is available
    // on the very first render, before any effects run.
    const [state, setState] = useState(() => ({
        ...loadFromStorage(),
        sessionId: sessionStorage.getItem(SS_KEYS.sessionId) || null,
    }));

    // Persist to sessionStorage whenever state changes
    useEffect(() => {
        if (state.profile) sessionStorage.setItem(SS_KEYS.profile, JSON.stringify(state.profile));
        if (state.results) sessionStorage.setItem(SS_KEYS.results, JSON.stringify(state.results));
        if (state.sessionId) sessionStorage.setItem(SS_KEYS.sessionId, state.sessionId);
        if (state.user?.firstName) sessionStorage.setItem(SS_KEYS.firstName, state.user.firstName);
        if (state.user?.lastName) sessionStorage.setItem(SS_KEYS.lastName, state.user.lastName);
    }, [state.profile, state.results, state.sessionId, state.user]);

    // Sync user state with Supabase Auth
    const [sessionChecked, setSessionChecked] = useState(false);
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user?.user_metadata) {
                setState(s => ({ ...s, user: { firstName: session.user.user_metadata.first_name || '', lastName: session.user.user_metadata.last_name || '' } }));
            } else {
                setState(s => ({ ...s, user: null }));
            }
            setSessionChecked(true);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user?.user_metadata) {
                setState(s => ({ ...s, user: { firstName: session.user.user_metadata.first_name || '', lastName: session.user.user_metadata.last_name || '' } }));
            } else {
                setState(s => ({ ...s, user: null }));
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const setProfile = (profile) => setState((s) => ({ ...s, profile }));
    const setResults = (results) => setState((s) => ({ ...s, results }));
    const setSessionId = (sessionId) => setState((s) => ({ ...s, sessionId }));
    const setUser = (user) => setState((s) => ({ ...s, user: user ? { ...(s.user || {}), ...user } : null }));

    return (
        <VoyntContext.Provider value={{ ...state, sessionChecked, setProfile, setResults, setSessionId, setUser }}>
            {children}
        </VoyntContext.Provider>
    );
}

export function useVoynt() {
    const ctx = useContext(VoyntContext);
    if (!ctx) throw new Error('useVoynt must be used within VoyntProvider');
    return ctx;
}
