import React, { useState } from 'react';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useDreamStore } from '../hooks/useDreamStore';
import Card from '../components/Card';

export default function DreamDetailScreen({ dreamId, onBack }) {
    const { getDream } = useDreamStore();
    const dream = getDream(dreamId);
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState([
        { role: 'ai', text: `I have interpreted this dream using the ${dream?.model} framework. Do you have specific questions?` }
    ]);

    if (!dream) return <div>Dream not found</div>;

    const handleChat = () => {
        if (!chatInput.trim()) return;
        const userMsg = { role: 'user', text: chatInput };
        setMessages(prev => [...prev, userMsg]);
        setChatInput('');

        // Simulate AI Reply
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'ai', text: "That is an interesting observation. The symbol suggests a deeper layer of meaning regarding your inner self." }]);
        }, 1000);
    };

    return (
        <div className="pb-20 animate-fade-in">
            {/* Header */}
            <button onClick={onBack} className="flex items-center text-gray-400 mb-4 hover:text-primary">
                <ArrowLeft className="w-5 h-5 mr-1" /> Back
            </button>

            {/* Image */}
            <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-border shadow-glow mb-6 group">
                <img src={dream.imageUrl} alt="Dream Visualization" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                    <h2 className="text-white font-serif text-xl opacity-90">Visual Manifestation</h2>
                </div>
            </div>

            {/* Interpretation */}
            <div className="space-y-6">
                <section>
                    <h3 className="text-accent text-sm uppercase tracking-widest mb-2 font-bold">Analysis ({dream.model})</h3>
                    <Card className="prose prose-invert max-w-none">
                        <p className="text-lg leading-relaxed text-gray-300">
                            {dream.interpretation}
                        </p>
                    </Card>
                </section>

                <section>
                    <h3 className="text-accent text-sm uppercase tracking-widest mb-2 font-bold">Transcription</h3>
                    <div className="bg-surfaceLight/50 p-4 rounded-lg italic text-gray-400 border-l-2 border-border">
                        "{dream.transcription}"
                    </div>
                </section>

                {/* Chat */}
                <section className="pt-4 border-t border-border/20">
                    <h3 className="text-accent text-sm uppercase tracking-widest mb-4 font-bold flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2" /> Oracle Chat
                    </h3>

                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg text-sm ${m.role === 'user' ? 'bg-border text-black' : 'bg-surfaceLight text-gray-300'}`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <input
                            className="flex-1 bg-surface border border-border/30 rounded-lg px-3"
                            placeholder="Ask a question..."
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                        />
                        <button onClick={handleChat} className="p-2 bg-border rounded-lg text-black">
                            <ArrowLeft className="w-5 h-5 rotate-180" />
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
