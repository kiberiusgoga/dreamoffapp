// Authentication API client
// Handles token storage and API calls to the Express backend
// All /api/* requests go through Vite's proxy in dev (-> localhost:3001)

const API_BASE = '/api/auth';
const TOKEN_KEY = 'dreamoff_token';

// ── Token management ──

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
}

// ── Fetch helper with auto Bearer header ──

async function apiFetch(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data;
}

// ── API functions ──

export async function apiRegister(name, email, password) {
    const data = await apiFetch(`${API_BASE}/register`, {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
    });
    setToken(data.token);
    return data.user;
}

export async function apiLogin(email, password) {
    const data = await apiFetch(`${API_BASE}/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    return data.user;
}

export async function apiGetMe() {
    const data = await apiFetch(`${API_BASE}/me`);
    return data.user;
}
