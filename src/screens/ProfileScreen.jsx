import React from 'react';

export default function ProfileScreen() {
    return (
        <div className="flex flex-col items-center pt-10 space-y-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-border to-accent p-[2px]">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                    <span className="font-serif text-3xl">D</span>
                </div>
            </div>
            <h2 className="text-2xl font-serif">Dreamer</h2>

            <div className="w-full max-w-sm space-y-4">
                <div className="bg-surface p-4 rounded-lg border border-border/30 flex justify-between items-center">
                    <span>Language</span>
                    <span className="text-gray-400">English</span>
                </div>
                <div className="bg-surface p-4 rounded-lg border border-border/30 flex justify-between items-center">
                    <span>Theme</span>
                    <span className="text-border">Baroque AI</span>
                </div>
                <div className="bg-surface p-4 rounded-lg border border-border/30 flex justify-between items-center">
                    <span>Version</span>
                    <span className="text-gray-500">1.0.0</span>
                </div>
            </div>
        </div>
    )
}
