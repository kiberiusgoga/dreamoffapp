import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const VALID_CLIENT = 'ca-pub-1234567890123456';

/** Loads AdSlot with a chosen env, since the config is read at module load. */
async function loadWith(env: Record<string, string | undefined>) {
    vi.resetModules();
    vi.stubEnv('VITE_ADSENSE_CLIENT', env.VITE_ADSENSE_CLIENT ?? '');
    vi.stubEnv('VITE_ADSENSE_SLOT_HOME', env.VITE_ADSENSE_SLOT_HOME ?? '');
    return {
        AdSlot: (await import('./AdSlot')).default,
        adsense: await import('../services/adsense')
    };
}

const scriptTags = () =>
    Array.from(document.querySelectorAll('script')).filter(s =>
        s.src.includes('adsbygoogle')
    );

beforeEach(() => {
    document.head.innerHTML = '';
    delete (window as { adsbygoogle?: unknown[] }).adsbygoogle;
    // jsdom has no IntersectionObserver; AdSlot treats that as "visible".
    vi.stubGlobal('IntersectionObserver', undefined);
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe('configuration', () => {
    it('accepts a well-formed publisher id', async () => {
        const { adsense } = await loadWith({ VITE_ADSENSE_CLIENT: VALID_CLIENT });
        expect(adsense.isValidClientId(VALID_CLIENT)).toBe(true);
        expect(adsense.isAdsenseConfigured()).toBe(true);
    });

    it.each([
        ['empty', ''],
        ['not a publisher id', 'pub-1234567890123456'],
        ['too few digits', 'ca-pub-123'],
        ['a slot id by mistake', '1234567890'],
        ['a whole script tag', '<script src="evil"></script>']
    ])('rejects %s', async (_label, value) => {
        const { adsense } = await loadWith({ VITE_ADSENSE_CLIENT: value });
        expect(adsense.isValidClientId(value)).toBe(false);
    });
});

describe('when AdSense is not configured', () => {
    // This is the default for a local checkout, a fork and CI. Contacting
    // Google from any of them would be wrong.
    it('renders no ad markup', async () => {
        const { AdSlot } = await loadWith({});
        const { container } = render(<AdSlot slot="123" />);
        expect(container.querySelector('ins.adsbygoogle')).toBeNull();
    });

    it('loads no third-party script', async () => {
        const { AdSlot } = await loadWith({});
        render(<AdSlot slot="123" />);
        await waitFor(() => expect(scriptTags()).toHaveLength(0));
    });

    it('renders the fallback instead', async () => {
        const { AdSlot } = await loadWith({});
        render(<AdSlot slot="123" fallback={<p>house promo</p>} />);
        expect(screen.getByText('house promo')).toBeInTheDocument();
    });

    it('stays inert when the client is set but the slot id is not', async () => {
        const { AdSlot } = await loadWith({ VITE_ADSENSE_CLIENT: VALID_CLIENT });
        const { container } = render(<AdSlot slot="" />);
        expect(container.querySelector('ins.adsbygoogle')).toBeNull();
        await waitFor(() => expect(scriptTags()).toHaveLength(0));
    });
});

describe('when AdSense is configured', () => {
    async function renderConfigured(props: Record<string, unknown> = {}) {
        const { AdSlot } = await loadWith({
            VITE_ADSENSE_CLIENT: VALID_CLIENT,
            VITE_ADSENSE_SLOT_HOME: '9999'
        });
        return render(<AdSlot slot="9999" {...props} />);
    }

    it('renders an ins element carrying the client and slot', async () => {
        const { container } = await renderConfigured();
        const ins = container.querySelector('ins.adsbygoogle');

        expect(ins).not.toBeNull();
        expect(ins).toHaveAttribute('data-ad-client', VALID_CLIENT);
        expect(ins).toHaveAttribute('data-ad-slot', '9999');
    });

    // Layout shift is the usual way ad slots ruin a page: the box must hold
    // its space before anything arrives.
    it('reserves its height from first paint', async () => {
        const { container } = await renderConfigured({ height: 250 });
        const slot = container.firstElementChild as HTMLElement;
        expect(slot.style.minHeight).toBe('250px');
    });

    it('labels itself as advertising for screen readers', async () => {
        await renderConfigured();
        expect(screen.getByRole('complementary', { name: /advertisement/i })).toBeInTheDocument();
    });

    it('requests the script once, with the client id', async () => {
        await renderConfigured();
        await waitFor(() => expect(scriptTags()).toHaveLength(1));
        expect(scriptTags()[0].src).toContain(encodeURIComponent(VALID_CLIENT));
        expect(scriptTags()[0].async).toBe(true);
    });

    it('does not add a second script tag for a second slot', async () => {
        const { AdSlot } = await loadWith({
            VITE_ADSENSE_CLIENT: VALID_CLIENT,
            VITE_ADSENSE_SLOT_HOME: '9999'
        });
        render(
            <>
                <AdSlot slot="1" />
                <AdSlot slot="2" />
            </>
        );
        await waitFor(() => expect(scriptTags().length).toBeGreaterThan(0));
        expect(scriptTags()).toHaveLength(1);
    });
});

describe('when the script cannot load', () => {
    it('shows the fallback rather than an empty gap', async () => {
        const { AdSlot } = await loadWith({
            VITE_ADSENSE_CLIENT: VALID_CLIENT,
            VITE_ADSENSE_SLOT_HOME: '9999'
        });

        render(<AdSlot slot="9999" fallback={<p>ad unavailable</p>} />);

        // Ad blockers are common; a failed script is an ordinary outcome.
        await waitFor(() => expect(scriptTags()).toHaveLength(1));
        scriptTags()[0].onerror?.(new Event('error'));

        expect(await screen.findByText('ad unavailable')).toBeInTheDocument();
    });
});
