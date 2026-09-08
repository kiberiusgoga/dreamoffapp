// Security headers.
//
// The policy is written from what the app actually loads rather than from a
// template: self-hosted fonts (no external font host), images from this origin
// plus data: URIs for dreams stored before images moved to disk, and the
// AdSense hosts — which are only ever contacted when a publisher id is
// configured, but listing them unconditionally costs nothing.

import helmet from 'helmet';
import { IS_PRODUCTION } from '../config.js';

/** Everything AdSense needs in order to render an ad. */
const ADSENSE = {
    scripts: [
        'https://pagead2.googlesyndication.com',
        'https://partner.googleadservices.com',
        'https://tpc.googlesyndication.com',
        'https://www.googletagservices.com'
    ],
    frames: [
        'https://googleads.g.doubleclick.net',
        'https://tpc.googlesyndication.com',
        'https://www.google.com'
    ],
    images: [
        'https://pagead2.googlesyndication.com',
        'https://googleads.g.doubleclick.net',
        'https://www.google.com',
        'https://www.google-analytics.com'
    ],
    connect: [
        'https://pagead2.googlesyndication.com',
        'https://googleads.g.doubleclick.net'
    ]
};

export function securityHeaders() {
    return helmet({
        contentSecurityPolicy: {
            useDefaults: false,
            directives: {
                defaultSrc: ["'self'"],

                // Vite emits a hashed module bundle, so no inline script is
                // needed from the app itself. The AdSense loader is external.
                scriptSrc: ["'self'", ...ADSENSE.scripts],
                scriptSrcAttr: ["'none'"],

                // React writes the style attribute for the reserved ad height
                // and a handful of computed widths, so inline styles have to
                // be allowed. Nonces do not cover attribute styles.
                styleSrc: ["'self'", "'unsafe-inline'"],

                // data: covers dreams whose image predates on-disk storage.
                imgSrc: ["'self'", 'data:', 'blob:', ...ADSENSE.images],

                fontSrc: ["'self'"],
                connectSrc: ["'self'", ...ADSENSE.connect],
                frameSrc: [...ADSENSE.frames],

                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],

                // Only meaningful over HTTPS, and it would break the plain
                // http://localhost the dev server runs on.
                ...(IS_PRODUCTION ? { upgradeInsecureRequests: [] } : {})
            }
        },

        // Ad iframes are cross-origin by nature; isolating the document would
        // stop them loading.
        crossOriginEmbedderPolicy: false,

        // The uploads directory is served from this origin only.
        crossOriginResourcePolicy: { policy: 'same-origin' },

        // A year, with subdomains. Only sent over HTTPS, so it is inert
        // locally, but preload is deliberately left off: it is very hard to
        // undo and should be a conscious choice once the domain is settled.
        hsts: IS_PRODUCTION
            ? { maxAge: 31536000, includeSubDomains: true, preload: false }
            : false,

        referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    });
}
