import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileScreen from './ProfileScreen';

const exportData = vi.fn();
const deleteAccount = vi.fn();
const onNavigate = vi.fn();

vi.mock('../hooks/useDreamStore', () => ({
    useDreamStore: () => ({
        language: 'en',
        setLanguage: vi.fn(),
        currentUser: { email: 'a@b.c', name: 'Dreamer', createdAt: '2026-01-01' },
        logoutUser: vi.fn(),
        exportData,
        deleteAccount
    })
}));

const openDialog = async () => {
    await userEvent.click(screen.getByText('Delete account'));
    return screen.getByLabelText(/confirm your password/i);
};

beforeEach(() => {
    exportData.mockReset().mockResolvedValue(undefined);
    deleteAccount.mockReset().mockResolvedValue(undefined);
    onNavigate.mockReset();
});

describe('export', () => {
    it('offers a download', async () => {
        render(<ProfileScreen onNavigate={onNavigate} />);
        await userEvent.click(screen.getByText(/download my data/i));
        expect(exportData).toHaveBeenCalledOnce();
    });

    it('shows progress while preparing', async () => {
        let resolve!: () => void;
        exportData.mockReturnValue(new Promise<void>(r => { resolve = r; }));

        render(<ProfileScreen onNavigate={onNavigate} />);
        await userEvent.click(screen.getByText(/download my data/i));

        expect(screen.getByText(/preparing/i)).toBeInTheDocument();
        resolve();
        await waitFor(() => expect(screen.getByText(/download my data/i)).toBeInTheDocument());
    });

    it('reports a failure instead of doing nothing visible', async () => {
        exportData.mockRejectedValue(new Error('Request failed (500)'));

        render(<ProfileScreen onNavigate={onNavigate} />);
        await userEvent.click(screen.getByText(/download my data/i));

        expect(await screen.findByRole('alert')).toHaveTextContent(/request failed/i);
    });
});

describe('privacy', () => {
    it('links to the notice', async () => {
        render(<ProfileScreen onNavigate={onNavigate} />);
        await userEvent.click(screen.getByText(/how your data is handled/i));
        expect(onNavigate).toHaveBeenCalledWith('privacy');
    });
});

describe('delete account', () => {
    it('does not delete on the first click', async () => {
        render(<ProfileScreen onNavigate={onNavigate} />);
        await userEvent.click(screen.getByText('Delete account'));
        expect(deleteAccount).not.toHaveBeenCalled();
    });

    it('explains what is about to be lost', async () => {
        render(<ProfileScreen onNavigate={onNavigate} />);
        await openDialog();

        expect(screen.getByText(/every dream you have recorded/i)).toBeInTheDocument();
        expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });

    it('points at the export before the point of no return', async () => {
        render(<ProfileScreen onNavigate={onNavigate} />);
        await openDialog();
        expect(screen.getByText(/want a copy first/i)).toBeInTheDocument();
    });

    // A stolen session should not be enough; the password is the confirmation.
    it('will not delete without a password', async () => {
        render(<ProfileScreen onNavigate={onNavigate} />);
        await openDialog();

        expect(screen.getByRole('button', { name: /^delete$/i })).toBeDisabled();
        expect(deleteAccount).not.toHaveBeenCalled();
    });

    it('deletes once the password is given', async () => {
        render(<ProfileScreen onNavigate={onNavigate} />);
        const input = await openDialog();

        await userEvent.type(input, 'secret123');
        await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

        expect(deleteAccount).toHaveBeenCalledWith('secret123');
    });

    it('can be backed out of', async () => {
        render(<ProfileScreen onNavigate={onNavigate} />);
        const input = await openDialog();
        await userEvent.type(input, 'secret123');

        await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

        expect(screen.queryByLabelText(/confirm your password/i)).not.toBeInTheDocument();
        expect(deleteAccount).not.toHaveBeenCalled();
    });

    it('keeps the dialog open and explains a wrong password', async () => {
        deleteAccount.mockRejectedValue(new Error('Invalid credentials.'));

        render(<ProfileScreen onNavigate={onNavigate} />);
        const input = await openDialog();
        await userEvent.type(input, 'wrong');
        await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

        expect(await screen.findByRole('alert')).toHaveTextContent(/invalid credentials/i);
        expect(screen.getByLabelText(/confirm your password/i)).toBeInTheDocument();
    });

    it('does not fire twice while the first request is in flight', async () => {
        deleteAccount.mockReturnValue(new Promise(() => {}));

        render(<ProfileScreen onNavigate={onNavigate} />);
        const input = await openDialog();
        await userEvent.type(input, 'secret123');

        const button = screen.getByRole('button', { name: /^delete$/i });
        await userEvent.click(button);
        await userEvent.click(button);

        expect(deleteAccount).toHaveBeenCalledTimes(1);
    });
});
