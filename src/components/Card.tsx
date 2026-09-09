import { KeyboardEvent, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface CardProps {
    children?: ReactNode;
    className?: string;
    onClick?: () => void;
    active?: boolean;
    /** Overrides the accessible name when the card's own text is not enough. */
    label?: string;
}

export default function Card({ children, className, onClick, active, label }: CardProps) {
    const interactive = Boolean(onClick);

    // A div with an onClick is invisible to the keyboard and to assistive
    // technology. Most of this app's navigation goes through Card — the home
    // menu, the archive rows, every setting — so without this none of it can
    // be reached without a mouse.
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!onClick) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;

        // Space would otherwise scroll the page out from under the press.
        event.preventDefault();
        onClick();
    };

    return (
        <div
            onClick={onClick}
            onKeyDown={interactive ? handleKeyDown : undefined}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={label}
            className={twMerge(
                "bg-surface border border-border/30 rounded-xl p-4 transition-all duration-300 relative overflow-hidden",
                "hover:shadow-glow hover:border-border/60",
                // Only for keyboard focus: a visible ring on every mouse click
                // would be noise.
                interactive &&
                    "focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active && "border-border shadow-glow bg-surfaceLight",
                className
            )}
        >
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/30 pointer-events-none" />

            <div className="relative z-10 h-full flex flex-col">
                {children}
            </div>
        </div>
    );
}
