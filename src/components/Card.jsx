import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export default function Card({ children, className, onClick, active }) {
    return (
        <div
            onClick={onClick}
            className={twMerge(
                "bg-surface border border-border/30 rounded-xl p-4 transition-all duration-300 relative overflow-hidden",
                "hover:shadow-glow hover:border-border/60",
                active && "border-border shadow-glow bg-surfaceLight",
                className
            )}
        >
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/30 pointer-events-none" />

            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
