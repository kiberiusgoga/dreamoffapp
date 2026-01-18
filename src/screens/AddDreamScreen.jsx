import React, { useState, useRef } from 'react';
import { Mic, Send, Loader2 } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { interpretDream } from '../services/interpretationAgent';
import { generateDreamImage } from '../services/imageAgent';
import { useDreamStore } from '../hooks/useDreamStore';

const MODELS = [
    { id: 'jung', name: 'Jungian Archetypes' },
    { id: 'freud', name: 'Freudian Psychoanalysis' },
    { id: 'cbt', name: 'Modern Cognitive (CBT)' },
    { id: 'balkan', name: 'Traditional Balkan' },
    { id: 'spiritual', name: 'Spiritual / New Age' }
];

export default function AddDreamScreen({ onNavigate }) {
    const [text, setText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [selectedModel, setSelectedModel] = useState('jung');
    const [isProcessing, setIsProcessing] = useState(false);

    const { addDream } = useDreamStore();
    const recognitionRef = useRef(null);

    const toggleRecording = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
        } else {
            if (!('webkitSpeechRecognition' in window)) {
                alert("Speech recognition not supported in this browser.");
                return;
            }
            const recognition = new window.webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US'; // Defaulting to English, could be dynamic

            recognition.onresult = (event) => {
                let final = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) final += event.results[i][0].transcript;
                }
                if (final) setText(prev => prev + ' ' + final);
            };

            recognition.start();
            recognitionRef.current = recognition;
            setIsRecording(true);
        }
    };

    const handleInterpret = async () => {
        if (!text.trim()) return;
        setIsProcessing(true);

        try {
            // Parallel Execution of Agents
            const [interpResult, imageUrl] = await Promise.all([
                interpretDream(text, selectedModel),
                generateDreamImage(text)
            ]);

            const newDream = addDream({
                text,
                model: selectedModel,
                transcription: interpResult.transcription,
                interpretation: interpResult.interpretation,
                imageUrl: imageUrl
            });

            onNavigate('detail', newDream.id);
        } catch (e) {
            alert("Failed to process dream.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (isProcessing) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <h2 className="text-xl font-serif animate-pulse">Consulting the Oracle...</h2>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-6 pb-20">
            <h2 className="text-3xl font-serif text-center text-primary">Record Dream</h2>

            {/* Mic Button */}
            <div className="flex justify-center">
                <button
                    onClick={toggleRecording}
                    className={`w-20 h-20 rounded-full flex items-center justify-center border-2 border-border shadow-glow transition-all ${isRecording ? 'bg-accent animate-pulse' : 'bg-surface'}`}
                >
                    <Mic className={`w-8 h-8 ${isRecording ? 'text-white' : 'text-primary'}`} />
                </button>
            </div>

            {/* Editor */}
            <Card className="flex-1 min-h-[200px] flex flex-col">
                <textarea
                    className="w-full h-full bg-transparent border-none resize-none focus:ring-0 text-lg placeholder-gray-600 font-serif"
                    placeholder="Describe your dream here..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
            </Card>

            {/* Models */}
            <div className="space-y-2">
                <label className="text-sm text-gray-400 uppercase tracking-widest pl-1">Interpretation Model</label>
                <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-surface border border-border/50 rounded-lg p-3 text-primary appearance-none focus:border-border"
                >
                    {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>

            <Button onClick={handleInterpret} disabled={!text}>
                Interpret Dream <Send className="w-4 h-4 ml-2" />
            </Button>
        </div>
    );
}
