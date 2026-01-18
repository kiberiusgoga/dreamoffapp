import React from 'react';
import { Search } from 'lucide-react';
import Card from '../components/Card';
import { useDreamStore } from '../hooks/useDreamStore';

export default function ArchiveScreen({ onNavigate }) {
    const { dreams } = useDreamStore();

    return (
        <div className="space-y-6 pb-20">
            <h2 className="text-3xl font-serif mb-4">Dream Archive</h2>

            <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-500 w-5 h-5" />
                <input
                    text="text"
                    placeholder="Search dreams..."
                    className="w-full bg-surface border border-border/30 rounded-lg pl-10 pr-4 py-3 placeholder-gray-600 focus:border-border"
                />
            </div>

            <div className="grid grid-cols-1 gap-4">
                {dreams.length === 0 && (
                    <div className="text-center text-gray-500 py-10 opacity-50">
                        No dreams recorded yet.
                    </div>
                )}

                {dreams.map(dream => (
                    <Card key={dream.id} onClick={() => onNavigate('detail', dream.id)} className="flex items-center space-x-4 cursor-pointer">
                        <img
                            src={dream.imageUrl}
                            alt="Dream thumbnail"
                            className="w-16 h-16 rounded-md object-cover border border-border/30"
                        />
                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-accent uppercase tracking-wider mb-1">
                                {new Date(dream.date).toLocaleDateString()}
                            </div>
                            <p className="font-serif truncate text-lg text-primary/90">
                                {dream.text}
                            </p>
                            <span className="text-xs text-gray-500 bg-black/30 px-2 py-1 rounded">
                                {dream.model}
                            </span>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
