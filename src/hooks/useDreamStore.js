import { useSyncExternalStore } from 'react';
import { apiRegister, apiLogin, apiGetMe, removeToken, getToken } from '../services/authApi';

// ============================================================
// 1. Global State (Singleton)
// ============================================================
const STORAGE_KEY = 'dream_diary_v1';

let memoryState = {
    dreams: [],
    currentUser: null,   // Set after token validation
    authLoading: true,   // True until initial token check completes
    language: 'en'
};

// Load persisted dreams and language only (NOT users/auth)
try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.dreams) memoryState.dreams = parsed.dreams;
        if (parsed.language) memoryState.language = parsed.language;
    }
} catch (e) {
    console.error('Failed to load store', e);
}

// ============================================================
// 2. Listeners
// ============================================================
const listeners = new Set();
const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

// ============================================================
// 3. Actions
// ============================================================

// Persist only dreams and language — auth is handled by JWT
const persist = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        dreams: memoryState.dreams,
        language: memoryState.language
    }));
};

const notify = () => {
    persist();
    listeners.forEach(l => l());
};

const store = {
    getSnapshot: () => memoryState,

    setLanguage: (lang) => {
        memoryState = { ...memoryState, language: lang };
        notify();
    },

    // ── Auth actions (async, calling backend API) ──

    registerUser: async (name, email, password) => {
        try {
            const user = await apiRegister(name, email, password);
            memoryState = { ...memoryState, currentUser: user };
            notify();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    loginUser: async (email, password) => {
        try {
            const user = await apiLogin(email, password);
            memoryState = { ...memoryState, currentUser: user };
            notify();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    logoutUser: () => {
        removeToken();
        memoryState = { ...memoryState, currentUser: null };
        notify();
    },

    // Validate JWT on app mount — keeps user logged in across refresh
    checkAuth: async () => {
        const token = getToken();
        if (!token) {
            memoryState = { ...memoryState, authLoading: false, currentUser: null };
            listeners.forEach(l => l());
            return;
        }
        try {
            const user = await apiGetMe();
            memoryState = { ...memoryState, currentUser: user, authLoading: false };
        } catch {
            removeToken();
            memoryState = { ...memoryState, currentUser: null, authLoading: false };
        }
        listeners.forEach(l => l());
    },

    // ── Dream actions (unchanged, still localStorage) ──

    addDream: (dream) => {
        const newDream = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            chatHistory: [],
            ...dream
        };
        memoryState = {
            ...memoryState,
            dreams: [newDream, ...memoryState.dreams]
        };
        notify();
        return newDream;
    },

    deleteDream: (id) => {
        memoryState = {
            ...memoryState,
            dreams: memoryState.dreams.filter(d => d.id !== id)
        };
        notify();
    },

    getDream: (id) => memoryState.dreams.find(d => d.id === id)
};

// ============================================================
// 4. The Hook
// ============================================================
export function useDreamStore() {
    const state = useSyncExternalStore(subscribe, store.getSnapshot);

    return {
        // State
        dreams: state.dreams,
        language: state.language,
        currentUser: state.currentUser,
        authLoading: state.authLoading,

        // Actions
        setLanguage: store.setLanguage,
        registerUser: store.registerUser,
        loginUser: store.loginUser,
        logoutUser: store.logoutUser,
        checkAuth: store.checkAuth,

        addDream: store.addDream,
        deleteDream: store.deleteDream,
        getDream: store.getDream
    };
}
