/// <reference types="vite/client" />

interface ImportMetaEnv {
    /**
     * AdSense publisher id, e.g. "ca-pub-1234567890123456".
     * When absent, no ad script is loaded and no slot renders. Ads are
     * therefore off by default: a fork or a local checkout shows none.
     */
    readonly VITE_ADSENSE_CLIENT?: string;

    /** Slot id for the banner on the home screen. */
    readonly VITE_ADSENSE_SLOT_HOME?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

/** Injected by the AdSense script once it loads. */
interface Window {
    adsbygoogle?: unknown[];
}
