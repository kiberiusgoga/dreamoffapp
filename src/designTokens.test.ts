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
