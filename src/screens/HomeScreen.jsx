import React from 'react';
import { Mic, PenTool, BookOpen, Brain } from 'lucide-react';
import Card from '../components/Card';

export default function HomeScreen({ onNavigate }) {
    const menuItems = [
        {
            id: 'record',
            label: 'Record Dream',
            icon: Mic,
            action: () => onNavigate('add')
        },
        {
            id: 'write',
            label: 'Write Dream',
            icon: PenTool,
            action: () => onNavigate('add')
        },
        {
            id: 'archive',
            label: 'Dream Archive',
            icon: BookOpen,
            action: () => onNavigate('archive')
        },
        {
            id: 'models',
            label: 'Psych. Models',
            icon: Brain,
            action: () => onNavigate('add')
        }
    ];

    return (
        <div className="flex flex-col h-full w-full justify-center py-2 px-2 overflow-hidden">

            {/* 1. Header (Compact) */}
            <div className="text-center space-y-1 sm:space-y-3 mb-2 flex-none">
                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-serif text-primary drop-shadow-[0_0_10px_rgba(212,175,55,0.3)] tracking-wide">
                    DreamOff
                </h1>
                <p className="font-serif italic text-gray-500 text-xs sm:text-sm lg:text-lg max-w-[90%] mx-auto leading-tight">
                    “Dreams are the royal road to the unconscious.” — Freud
                </p>
                {/* Desktop Divider */}
                <div className="hidden lg:block w-32 h-[1px] bg-gradient-to-r from-transparent via-border to-transparent mx-auto mt-6 opacity-60"></div>
            </div>

            {/* 2. Grid Container - Flex Grow to fill space without scrolling */}
            <div className="flex-1 w-full max-w-screen-xl mx-auto flex flex-col justify-center min-h-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8 h-full max-h-[65vh] sm:max-h-none content-center">
                    {menuItems.map((item, index) => (
                        <Card
                            key={item.id}
                            onClick={item.action}
                            className={`
                   cursor-pointer group flex flex-col items-center justify-center text-center
                   aspect-square sm:aspect-[4/3] lg:aspect-[3/4]
                   p-2 sm:p-6 lg:p-8
                   border-border/20 hover:border-border hover:shadow-glow
                   transition-all duration-300
                   active:scale-95
                `}
                        >
                            <div className="p-3 sm:p-4 rounded-full bg-surfaceLight/40 border border-border/10 group-hover:bg-surfaceLight group-hover:scale-110 transition-transform duration-300 mb-2 sm:mb-4">
                                <item.icon strokeWidth={1.5} className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-primary group-hover:text-border" />
                            </div>
                            <span className="font-serif text-sm sm:text-base lg:text-xl text-gray-300 group-hover:text-border transition-colors leading-tight">
                                {item.label}
                            </span>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
