import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RoomSharePanel } from './RoomSharePanel';

describe('RoomSharePanel', () => {
  it('shows the invite link, a WhatsApp share, and copies the link on click', async () => {
    // userEvent.setup installs its own clipboard stub, so override it afterwards.
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<RoomSharePanel code="BA2026" locale="en" />);

    expect(screen.getByText(/\/play\/online\/BA2026/)).toBeVisible();

    const whatsapp = screen.getByRole('link', { name: /Share on WhatsApp/i });
    const href = whatsapp.getAttribute('href') ?? '';
    expect(href).toContain('wa.me');
    expect(decodeURIComponent(href)).toContain('BA2026');

    await user.click(screen.getByRole('button', { name: /Copy invite link/i }));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0]?.[0]).toContain('/play/online/BA2026');
    expect(await screen.findByText(/Link copied!/i)).toBeVisible();
  });

  it('omits the native share button when Web Share is unavailable', () => {
    render(<RoomSharePanel code="BA2026" locale="en" />);
    expect(screen.queryByRole('button', { name: /Share…/i })).toBeNull();
  });
});
