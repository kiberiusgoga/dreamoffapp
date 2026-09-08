import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AppRoutes } from '../App';

vi.mock('../hooks/useDreamStore', () => ({
    useDreamStore: () => ({
        language: 'en',
        currentUser: null,
        authLoading: false,
        dreams: [],
        checkAuth: vi.fn(),
        loginUser: vi.fn(),
        registerUser: vi.fn()
    })
}));

function Probe() {
    return <span data-testid="pathname">{useLocation().pathname}</span>;
}

const renderAt = (path: string) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <AppRoutes />
            <Probe />
        </MemoryRouter>
    );

describe('the privacy notice', () => {
    // A notice behind a login is not a notice, and AdSense requires a
    // publicly reachable one.
    it('is reachable without an account', () => {
        renderAt('/privacy');

        expect(screen.getByTestId('pathname').textContent).toBe('/privacy');
        expect(screen.getByRole('heading', { name: /^privacy$/i })).toBeInTheDocument();
    });

    it('is not redirected to the login screen', () => {
        renderAt('/privacy');
        expect(screen.queryByText(/join dreamoff/i)).not.toBeInTheDocument();
    });

    // The part a reader would most want to know, and the part a template
    // policy would never say.
    it('names the services dreams are sent to', () => {
        renderAt('/privacy');

        expect(screen.getByText(/the Gemini/i)).toBeInTheDocument();
        expect(screen.getByText(/Hugging Face/)).toBeInTheDocument();
        expect(screen.getByText(/never asks? to have interpreted is never sent|never sent anywhere/i)).toBeInTheDocument();
    });

    it('says the password cannot be read back', () => {
        renderAt('/privacy');
        expect(screen.getByText(/bcrypt/i)).toBeInTheDocument();
    });

    it('tells the reader how to leave with their data', () => {
        renderAt('/privacy');

        expect(screen.getByText(/Export my data/i)).toBeInTheDocument();
        expect(screen.getByText(/Delete account/i)).toBeInTheDocument();
    });

    // The placeholders must be obvious rather than quietly shipped as if the
    // document were finished.
    it('flags that it still needs the operator’s details', () => {
        renderAt('/privacy');

        expect(screen.getByText(/before launch/i)).toBeInTheDocument();
        expect(screen.getByText(/\[operator legal name\]/)).toBeInTheDocument();
    });

    it('is linked from the sign-in screen', () => {
        renderAt('/login');

        const link = screen.getByRole('link', { name: /how your data is handled/i });
        expect(link).toHaveAttribute('href', '/privacy');
    });
});
