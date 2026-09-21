import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import tailwind from '../tailwind.config.js';

const colors = (tailwind as { theme: { extend: { colors: Record<string, string> } } })
    .theme.extend.colors;

function sourceFiles(dir = 'src'): string[] {
    return readdirSync(dir).flatMap(entry => {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) return sourceFiles(path);
        if (!/\.tsx?$/.test(path) || /\.test\.tsx?$/.test(path)) return [];
        return [path];
    });
}

// ── Contrast, per WCAG 2.1 ──
const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

function luminance(hex: string): number {
    const n = parseInt(hex.replace('#', ''), 16);
    return (
        0.2126 * channel((n >> 16) & 255) +
        0.7152 * channel((n >> 8) & 255) +
        0.0722 * channel(n & 255)
    );
}

function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

describe('palette', () => {
    it('defines one semantic danger colour', () => {
        expect(colors.danger).toBe('#E0796B');
    });

    // The auth screen used red as its brand accent while the rest of the app
    // was gold, so "this is our brand" and "something went wrong" were the
    // same hue. Red now means exactly one thing, and it comes from the token.
    it('uses no raw Tailwind red utilities anywhere', () => {
        const offenders = sourceFiles()
            .map(file => ({ file, hits: readFileSync(file, 'utf8').match(/\bred-\d{2,3}\b/g) }))
            .filter(r => r.hits);

        expect(
            offenders.map(o => `${o.file}: ${o.hits!.join(', ')}`),
            'red must go through the danger token'
        ).toEqual([]);
    });

    it('keeps colours in tokens rather than hex literals', () => {
        // Google's and Facebook's marks must stay their own colours; every
        // other literal belongs in the palette.
        const brandMarks = ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#1877F2'];

        const offenders = sourceFiles()
            .map(file => {
                const hits = (readFileSync(file, 'utf8').match(/#[0-9a-fA-F]{6}\b/g) ?? []).filter(
                    hex => !brandMarks.includes(hex.toUpperCase())
                );
                return { file, hits };
            })
            .filter(r => r.hits.length > 0);

        expect(offenders.map(o => `${o.file}: ${o.hits.join(', ')}`)).toEqual([]);
    });
});

describe('contrast on the app surfaces', () => {
    const surfaces = {
        'authSurfaceDeep': colors.authSurfaceDeep,
        'surface': colors.surface,
        'background': colors.background
    };

    // Error text is small, so it needs the 4.5:1 threshold rather than 3:1.
    it.each(Object.entries(surfaces))('danger text reads on %s', (_name, surface) => {
        expect(contrast(colors.danger, surface)).toBeGreaterThanOrEqual(4.5);
    });

    it.each(Object.entries(surfaces))('the gold accent reads on %s', (_name, surface) => {
        expect(contrast(colors.accent, surface)).toBeGreaterThanOrEqual(4.5);
    });

    it.each(Object.entries(surfaces))('body text reads on %s', (_name, surface) => {
        expect(contrast(colors.primary, surface)).toBeGreaterThanOrEqual(4.5);
    });

    // Distinguishable at a glance is the whole point: if danger and the brand
    // accent were close in luminance and hue, the screen would read the way
    // the auth screen used to.
    it('keeps danger visually distinct from the gold accent', () => {
        expect(contrast(colors.danger, colors.accent)).toBeGreaterThan(1.2);
    });
});

describe('text contrast', () => {
    // Tailwind's grey ramp, as it is actually emitted.
    const GRAY: Record<string, string> = {
        '500': '#6b7280', '600': '#4b5563', '700': '#374151'
    };

    const surfaces = {
        surface: colors.surface,
        background: colors.background,
        authSurfaceDeep: colors.authSurfaceDeep,
        authSurface: colors.authSurface
    };

    it('has a muted colour that clears AA on every surface it is painted on', () => {
        for (const [name, surface] of Object.entries(surfaces)) {
            expect(contrast(colors.muted, surface), `muted on ${name}`).toBeGreaterThanOrEqual(4.5);
        }
    });

    // The shades it replaced. gray-500 reached 3.95 — large text only — and
    // the other two never passed at all.
    it('is an improvement on the greys it replaced', () => {
        for (const [shade, hex] of Object.entries(GRAY)) {
            expect(
                contrast(colors.muted, colors.surface),
                `muted should beat gray-${shade}`
            ).toBeGreaterThan(contrast(hex, colors.surface));
        }
    });

    // Colour is not the only signal, but it is the one that was failing.
    it('uses no grey shade below AA anywhere in the app', () => {
        const offenders = sourceFiles()
            .map(file => ({
                file,
                hits: readFileSync(file, 'utf8').match(/\b(?:text|placeholder)-gray-(?:500|600|700|800|900)\b/g)
            }))
            .filter(r => r.hits);

        expect(
            offenders.map(o => `${o.file}: ${o.hits!.join(', ')}`),
            'these shades do not reach 4.5:1 on this app’s surfaces'
        ).toEqual([]);
    });

    it('keeps a readable hierarchy rather than flattening everything', () => {
        // gray-300 and gray-400 already pass; muted is the dimmest rung.
        const rungs = ['#d1d5db', '#9ca3af', colors.muted]
            .map(c => contrast(c, colors.surface));

        expect(rungs[0]).toBeGreaterThan(rungs[1]);
        expect(rungs[1]).toBeGreaterThan(rungs[2]);
        expect(rungs[2]).toBeGreaterThanOrEqual(4.5);
    });
});
