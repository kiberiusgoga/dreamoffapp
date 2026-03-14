import { getToken } from './authApi';

import { Dream } from '../types/index';

const API_BASE = '/api/dreams';

export async function fetchDreams(): Promise<Dream[]> {
    const token = getToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(API_BASE, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch dreams');
    }

    return res.json();
}

export async function createDream(dreamData: Partial<Dream>): Promise<Dream> {
    const token = getToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(API_BASE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dreamData)
    });

    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add dream');
    }

    return res.json();
}

export async function deleteDreamApi(id: string): Promise<{success: boolean; id: string}> {
    const token = getToken();
    if (!token) throw new Error('No token found');

    const res = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete dream');
    }

    return res.json();
}
