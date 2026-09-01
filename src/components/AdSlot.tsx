import { useEffect, useRef, useState } from 'react';
import { ADSENSE_CLIENT, isAdsenseConfigured, loadAdsenseScript } from '../services/adsense';

interface AdSlotProps {
    /** AdSense slot id from the publisher dashboard. */
    slot: string;
    /**
     * Reserved height in pixels. The box occupies this much space from first
     * paint whether or not an ad ever arrives, so nothing below it moves when
     * one does. Layout shift is the usual way ad slots ruin a page.
     */
    height?: number;
    /** Rendered when there is no ad: unconfigured, blocked, or empty. */
    fallback?: React.ReactNode;
    className?: string;
    label?: string;
}

type SlotState = 'idle' | 'loading' | 'filled' | 'unavailable';

export default function AdSlot({
    slot,
    height = 90,
    fallback = null,
    className = '',
    label = 'Advertisement'
}: AdSlotProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const insRef = useRef<HTMLModElement>(null);
    const pushedRef = useRef(false);
    const [state, setState] = useState<SlotState>('idle');

    const configured = isAdsenseConfigured() && Boolean(slot);

    // Only start loading once the slot is near the viewport. An ad that is
    // never scrolled to costs nothing.
    const [inView, setInView] = useState(false);

    useEffect(() => {
        if (!configured || inView) return;

        const node = containerRef.current;
        if (!node) return;

        // Environments without IntersectionObserver (jsdom, older browsers)
        // simply treat the slot as visible rather than never loading.
        if (typeof IntersectionObserver === 'undefined') {
            setInView(true);
            return;
        }

        const observer = new IntersectionObserver(
            entries => {
                if (entries.some(entry => entry.isIntersecting)) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '200px' }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [configured, inView]);

    useEffect(() => {
        if (!configured || !inView || pushedRef.current) return;

        let cancelled = false;
        setState('loading');

        loadAdsenseScript()
            .then(() => {
                if (cancelled) return;

                const ins = insRef.current;
                // AdSense throws if the same <ins> is pushed twice, which
                // StrictMode's double mount would otherwise cause. The status
                // attribute is written by the script itself.
                if (!ins || ins.getAttribute('data-adsbygoogle-status')) return;

                pushedRef.current = true;
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                setState('filled');
            })
            .catch(() => {
                if (!cancelled) setState('unavailable');
            });

        return () => { cancelled = true; };
    }, [configured, inView]);

    // Nothing configured: render the caller's fallback, or nothing at all.
    // Never a fake ad -- a placeholder that looks like an advert misleads the
    // reader and, on a live site, misrepresents the page to advertisers.
    if (!configured) {
        return <>{fallback}</>;
    }

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ minHeight: height }}
            role="complementary"
            aria-label={label}
        >
            {/* Labelling the slot is required by advertising standards in
                several markets and is simply honest everywhere else. */}
            <span className="sr-only">{label}</span>

            <ins
                ref={insRef}
                className="adsbygoogle"
                style={{ display: 'block', minHeight: height }}
                data-ad-client={ADSENSE_CLIENT}
                data-ad-slot={slot}
                data-ad-format="auto"
                data-full-width-responsive="true"
            />

            {state === 'unavailable' && fallback}
        </div>
    );
}
