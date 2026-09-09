import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Card from './Card';

describe('a card that does nothing', () => {
    it('is not announced as a control', () => {
        render(<Card>just content</Card>);

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(screen.getByText('just content')).toBeInTheDocument();
    });

    it('is not in the tab order', () => {
        const { container } = render(<Card>just content</Card>);
        expect(container.firstElementChild).not.toHaveAttribute('tabindex');
    });
});

describe('a card that navigates', () => {
    // Most of this app's navigation goes through Card: the home menu, the
    // archive rows, every setting, log out, delete account. As a bare div with
    // an onClick, none of it could be reached without a mouse.
    it('is announced as a button', () => {
        render(<Card onClick={vi.fn()}>Open the archive</Card>);
        expect(screen.getByRole('button', { name: /open the archive/i })).toBeInTheDocument();
    });

    it('can be reached with Tab', async () => {
        render(<Card onClick={vi.fn()}>Open the archive</Card>);

        await userEvent.tab();
        expect(screen.getByRole('button')).toHaveFocus();
    });

    it('activates with Enter', async () => {
        const onClick = vi.fn();
        render(<Card onClick={onClick}>Open</Card>);

        await userEvent.tab();
        await userEvent.keyboard('{Enter}');

        expect(onClick).toHaveBeenCalledOnce();
    });

    it('activates with Space', async () => {
        const onClick = vi.fn();
        render(<Card onClick={onClick}>Open</Card>);

        await userEvent.tab();
        await userEvent.keyboard(' ');

        expect(onClick).toHaveBeenCalledOnce();
    });

    it('still works with a mouse', async () => {
        const onClick = vi.fn();
        render(<Card onClick={onClick}>Open</Card>);

        await userEvent.click(screen.getByRole('button'));
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('ignores keys that are not Enter or Space', async () => {
        const onClick = vi.fn();
        render(<Card onClick={onClick}>Open</Card>);

        await userEvent.tab();
        await userEvent.keyboard('{ArrowDown}{Escape}a');

        expect(onClick).not.toHaveBeenCalled();
    });

    it('takes an explicit label when the content is not descriptive', () => {
        render(<Card onClick={vi.fn()} label="Delete account"><span>×</span></Card>);
        expect(screen.getByRole('button', { name: 'Delete account' })).toBeInTheDocument();
    });

    it('shows a focus ring for keyboard users only', () => {
        const { container } = render(<Card onClick={vi.fn()}>Open</Card>);
        const card = container.firstElementChild as HTMLElement;

        expect(card.className).toContain('focus-visible:ring-2');
        // Not plain `focus:ring`, which would fire on every mouse press too.
        expect(card.className).not.toMatch(/(^|\s)focus:ring-2/);
    });
});
