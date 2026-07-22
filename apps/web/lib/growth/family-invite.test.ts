import { describe, expect, it, vi } from 'vitest';

import { createTranslator } from '../i18n';

import { familyInviteText, shareFamilyInvite, whatsAppShareUrl } from './family-invite';

describe('family invite sharing', () => {
  it('builds localized invite text without recipient data', () => {
    const text = familyInviteText(
      {
        roomCode: 'lp57ab',
        gameName: 'Gadha Chor',
        inviterName: 'Masi',
        occupiedSeats: 2,
        maxPlayers: 4,
      },
      createTranslator('en'),
    );
    expect(text).toContain('Masi');
    expect(text).toContain('Gadha Chor');
    expect(text).toContain('LP57AB');
    expect(text).toContain('/join/LP57AB');
  });

  it('encodes WhatsApp text safely', () => {
    const url = whatsAppShareUrl('Join us: https://lazypatta.com/join/LP57AB?game=gadha-chor');
    expect(url).toContain('wa.me');
    expect(url).toContain('%3Fgame%3Dgadha-chor');
  });

  it('reports cancelled native share without throwing', async () => {
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')),
      configurable: true,
    });
    await expect(shareFamilyInvite({ text: 'hello' })).resolves.toBe('cancelled');
  });
});
