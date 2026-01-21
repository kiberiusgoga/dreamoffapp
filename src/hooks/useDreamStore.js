import { useSyncExternalStore } from 'react';

// 1. The Global State (Singleton)
const STORAGE_KEY = 'dream_diary_v1';

// Initial Load
let memoryState = {
    dreams: [],
    users: [], // Array of user objects { email, password, name }
    currentUser: null, // The currently logged in user
    language: 'en'
};

try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        memoryState = JSON.parse(stored);
        // Reset currentUser on load if persistence is disabled (default behavior requested by user earlier)
        // But for "Real" auth, we usually keep them logged in. 
        // User explicitly asked to NOT be logged in on refresh earlier. 
        // So we will keep currentUser as null initially unless we want to persist session separately.
        // Let's ensure structure integrity:
        if (!memoryState.users) memoryState.users = [];
        memoryState.currentUser = null; // Enforce login on refresh
    }
} catch (e) {
    console.error("Failed to load store", e);
}

// Ensure defaults if loaded state is partial
if (!memoryState.dreams) memoryState.dreams = [];
if (!memoryState.language) memoryState.language = 'en';
if (!memoryState.users) memoryState.users = [];


// 2. Listeners
const listeners = new Set();
const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

// 3. Actions
const persist = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryState));
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

    // --- AUTH ACTIONS ---
    registerUser: (name, email, password) => {
        // Simple validation
        if (memoryState.users.find(u => u.email === email)) {
            return { success: false, error: "User already exists" };
        }
        const newUser = { name, email, password };
        memoryState = {
            ...memoryState,
            users: [...memoryState.users, newUser],
            currentUser: newUser
        };
        notify();
        return { success: true };
    },

    loginUser: (email, password) => {
        const user = memoryState.users.find(u => u.email === email && u.password === password);
        if (user) {
            memoryState = { ...memoryState, currentUser: user };
            notify();
            return { success: true };
        }
        return { success: false, error: "Invalid credentials" };
    },

    logoutUser: () => {
        memoryState = { ...memoryState, currentUser: null };
        notify();
    },
    // --------------------

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


// 4. The Hook
export function useDreamStore() {
    const state = useSyncExternalStore(subscribe, store.getSnapshot);

    return {
        // State
        dreams: state.dreams,
        language: state.language,
        currentUser: state.currentUser,

        // Actions
        setLanguage: store.setLanguage,
        registerUser: store.registerUser,
        loginUser: store.loginUser,
        logoutUser: store.logoutUser,

        addDream: store.addDream,
        deleteDream: store.deleteDream,
        getDream: store.getDream
    };
}
