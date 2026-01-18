import { useState, useEffect } from 'react';

const STORAGE_KEY = 'dream_diary_v1';

export function useDreamStore() {
    const [dreams, setDreams] = useState([]);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setDreams(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to load dreams", e);
            }
        }
    }, []);

    const addDream = (dream) => {
        const newDream = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            chatHistory: [],
            ...dream
        };
        const updated = [newDream, ...dreams];
        setDreams(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return newDream;
    };

    const getDream = (id) => dreams.find(d => d.id === id);

    return { dreams, addDream, getDream };
}
