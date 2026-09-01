// AdSense configuration and script loading.
//
// Everything here is deliberately inert unless VITE_ADSENSE_CLIENT is set, so
// a local checkout, a fork and the test suite never contact Google.

const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT?.trim() ?? '';

export const ADSENSE_CLIENT = CLIENT;

export const AD_SLOTS = {
    home: import.meta.env.VITE_ADSENSE_SLOT_HOME?.trim() ?? ''
} as const;

/** A publisher id looks like "ca-pub-" followed by 16 digits. */
export function isValidClientId(client: string): boolean {
    return /^ca-pub-\d{16}$/.test(client);
}

export function isAdsenseConfigured(): boolean {
    return isValidClientId(CLIENT);
}

const SCRIPT_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

let scriptPromise: Promise<void> | null = null;

/**
 * Injects the AdSense script once per page, on demand.
 *
 * Loading it lazily rather than from index.html keeps roughly 100 kB of
 * third-party JavaScript and a connection to Google off the critical path for
 * everyone who never scrolls an ad into view -- including every signed-out
 * visitor, who sees no ads at all.
 */
export function loadAdsenseScript(): Promise<void> {
    if (!isAdsenseConfigured()) {
        return Promise.reject(new Error('AdSense is not configured.'));
    }
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[src^="${SCRIPT_SRC}"]`);
        if (existing) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = `${SCRIPT_SRC}?client=${encodeURIComponent(CLIENT)}`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve();
        script.onerror = () => {
            // A blocked script is the normal case, not an exception: ad
            // blockers are common. Reset so a later slot can retry.
            scriptPromise = null;
            reject(new Error('The AdSense script failed to load.'));
        };
        document.head.appendChild(script);
    });

    return scriptPromise;
}

/** Test seam: forget that the script was requested. */
export function resetAdsenseScriptForTests(): void {
    scriptPromise = null;
}
