export interface DreamInterpretation {
    summary?: string;
    overview?: string;
    archetypes?: string;
    scientific?: string;
    symbols?: any[];
    reflections?: any[];
    actions?: any[];
}

export interface Dream {
    id: string;
    date: string;
    title: string;
    content: string;
    lucid: boolean;
    themes: string[];
    mood: string;
    chatHistory: { role: 'user' | 'assistant'; content: string }[];
    text?: string;
    imageUrl?: string;
    model?: string;
    language?: string;
    layout?: string;
    interpretation?: string | DreamInterpretation;
    transcription?: string;
}

export interface User {
    email: string;
    name: string;
    createdAt: string;
}
