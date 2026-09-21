import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import AddDreamScreen from './AddDreamScreen';

// vi.mock factories are hoisted above the module scope, and this file imports
// the screen statically — so the doubles have to be created in a hoisted block
// rather than as ordinary consts.
const { interpretDream, generateDreamImage, addDream } = vi.hoisted(() => ({
    interpretDream: vi.fn(),
    generateDreamImage: vi.fn(),
    addDream: vi.fn()
}));

const onNavigate = vi.fn();

vi.mock('../services/interpretationAgent', () => ({ interpretDream }));
vi.mock('../services/imageAgent', () => ({ generateDreamImage }));
vi.mock('../hooks/useDreamStore', () => ({
    useDreamStore: () => ({ addDream, language: 'en' })
}));

const INTERPRETATION = {
    transcription: 'I was flying over a red ocean',
    interpretation: { summary: 'A dream of release' },
    layout: 'mobile',
    modelUsed: 'jung',
    language: 'en'
};

/** Writes a dream and asks for an interpretation. */
async function submit(text = 'I was flying over a red ocean') {
    render(<AddDreamScreen onNavigate={onNavigate} initialMode="write" />);

    fireEvent.change(screen.getByPlaceholderText(/describe your dream/i), { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: /interpret dream/i }));

    // Let the mocked promises settle.
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });
}

beforeEach(() => {
    vi.clearAllMocks();
    interpretDream.mockResolvedValue(INTERPRETATION);
    generateDreamImage.mockResolvedValue('/uploads/abc.png');
    addDream.mockImplementation(async (d: Record<string, unknown>) => ({ ...d, id: 'new-dream' }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('interpreting a dream', () => {
    // There was a five second ad gate here. Interpretation now starts on the
    // click, which is what the button has always claimed to do.
    it('asks for the interpretation immediately', async () => {
        await submit();
        expect(interpretDream).toHaveBeenCalledOnce();
    });

    it('saves the interpretation and the image, then opens the dream', async () => {
        await submit();

        expect(addDream.mock.calls[0][0]).toMatchObject({
            text: 'I was flying over a red ocean',
            model: 'jung',
            interpretation: { summary: 'A dream of release' },
            imageUrl: '/uploads/abc.png'
        });
        expect(onNavigate).toHaveBeenCalledWith('detail', 'new-dream');
    });

    it('trims the dream before sending it', async () => {
        await submit('   spaced out   ');

        expect(interpretDream.mock.calls[0][0]).toBe('spaced out');
    });
});

describe('when only the image fails', () => {
    // The interpretation is what the user came for, and by this point it has
    // already been paid for. Promise.all used to discard it because the
    // decoration failed.
    it('still saves the dream, without an image', async () => {
        generateDreamImage.mockRejectedValue(new Error('Hugging Face is down'));

        await submit();

        expect(addDream.mock.calls[0][0]).toMatchObject({
            interpretation: { summary: 'A dream of release' }
        });
        expect(addDream.mock.calls[0][0].imageUrl).toBeUndefined();
    });

    it('still opens the dream rather than showing an error', async () => {
        generateDreamImage.mockRejectedValue(new Error('Hugging Face is down'));

        await submit();

        expect(onNavigate).toHaveBeenCalledWith('detail', 'new-dream');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('records why, without interrupting', async () => {
        generateDreamImage.mockRejectedValue(new Error('Hugging Face is down'));

        await submit();

        expect(console.warn).toHaveBeenCalledWith(
            expect.stringMatching(/image could not be generated/i),
            expect.any(Error)
        );
    });
});

describe('when the interpretation fails', () => {
    it('reports it inline rather than in a browser dialog', async () => {
        interpretDream.mockRejectedValue(new Error('Failed to interpret dream using AI.'));

        await submit();

        expect(screen.getByRole('alert')).toHaveTextContent(/failed to interpret/i);
        expect(addDream).not.toHaveBeenCalled();
        expect(onNavigate).not.toHaveBeenCalled();
    });

    it('keeps the dream on screen so it can be retried', async () => {
        interpretDream.mockRejectedValue(new Error('network'));

        await submit();

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/describe your dream/i)).toHaveValue(
            'I was flying over a red ocean'
        );
    });

    it('surfaces the rate limiter message as the server wrote it', async () => {
        interpretDream.mockRejectedValue(
            new Error('You have reached the limit for AI requests. Please try again later.')
        );

        await submit();

        expect(screen.getByRole('alert')).toHaveTextContent(/limit for ai requests/i);
    });

    it('recovers when the retry succeeds', async () => {
        interpretDream.mockRejectedValueOnce(new Error('network'));

        await submit();
        expect(screen.getByRole('alert')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /interpret dream/i }));
        await act(async () => { await Promise.resolve(); });
        await act(async () => { await Promise.resolve(); });

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(onNavigate).toHaveBeenCalledWith('detail', 'new-dream');
    });
});

describe('when saving fails', () => {
    it('does not navigate to a dream that was never stored', async () => {
        addDream.mockRejectedValue(new Error('Internal server error'));

        await submit();

        expect(screen.getByRole('alert')).toHaveTextContent(/internal server error/i);
        expect(onNavigate).not.toHaveBeenCalled();
    });
});

describe('dictation', () => {
    it('explains inline when the browser cannot record', async () => {
        render(<AddDreamScreen onNavigate={onNavigate} initialMode="record" />);

        // jsdom has no webkitSpeechRecognition, which is the case being tested.
        // The mic is the only unlabelled button on the record screen.
        const mic = screen.getAllByRole('button').find(b => !b.textContent?.trim());
        fireEvent.click(mic!);

        expect(screen.getByRole('alert')).toHaveTextContent(/cannot record speech/i);
    });
});
