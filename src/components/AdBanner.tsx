import AdSlot from './AdSlot';
import { AD_SLOTS, isAdsenseConfigured } from '../services/adsense';

const HEIGHT = 90;

/**
 * Outline of the reserved space, shown only while developing so the layout is
 * visible without an AdSense account. It never ships: in a production build
 * with no publisher id the banner renders nothing at all, rather than a
 * decorative box that looks like an advert nobody bought.
 */
function DevPreview() {
    return (
        <div
            className="w-full rounded-2xl border border-dashed border-border/25 bg-surface/30 flex flex-col items-center justify-center gap-1 text-center px-4"
            style={{ minHeight: HEIGHT }}
        >
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted font-bold">
                Ad slot &middot; not configured
            </span>
            <span className="text-[9px] text-muted max-w-[240px] leading-snug">
                Set VITE_ADSENSE_CLIENT and VITE_ADSENSE_SLOT_HOME to serve a real ad here.
            </span>
        </div>
    );
}

export default function AdBanner() {
    const configured = isAdsenseConfigured() && Boolean(AD_SLOTS.home);

    if (!configured) {
        return import.meta.env.DEV ? (
            <div className="w-full mb-3">
                <DevPreview />
            </div>
        ) : null;
    }

    return (
        <div className="w-full mb-3 animate-fade-in">
            <AdSlot
                slot={AD_SLOTS.home}
                height={HEIGHT}
                label="Advertisement"
                className="w-full overflow-hidden rounded-2xl border border-border/15 bg-surface/40"
            />
        </div>
    );
}
