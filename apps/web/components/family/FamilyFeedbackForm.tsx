'use client';

import { useState, type FormEvent, type ReactElement } from 'react';

import {
  submitFamilyFeedback,
  type FamilyFeedbackCategory,
} from '../../lib/family/family-groups-client';
import { trackGrowthEvent } from '../../lib/growth/analytics';
import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';
import { getSupabaseBrowserClient } from '../../lib/supabase/browser-client';
import { Button } from '../Button';

/**
 * Founder-family feedback (Release Train 2, PR 15). A member picks a category —
 * idea, problem, or praise — and writes a short note in their own words. It goes
 * through the SECURITY DEFINER submit_family_feedback RPC (member-scoped); this
 * form never writes directly. Deliberately un-gamified: no rating, no score, no
 * reward — just a direct line to the people building the app.
 */

interface FamilyFeedbackFormProps {
  readonly groupId: string;
}

const CATEGORIES: readonly FamilyFeedbackCategory[] = ['idea', 'problem', 'praise'];

const CATEGORY_LABEL_KEYS = {
  idea: 'family.feedbackCategoryIdea',
  problem: 'family.feedbackCategoryProblem',
  praise: 'family.feedbackCategoryPraise',
} as const;

export function FamilyFeedbackForm({ groupId }: FamilyFeedbackFormProps): ReactElement {
  const { locale } = usePreferredLocale();
  const t = createTranslator(locale);

  const [category, setCategory] = useState<FamilyFeedbackCategory>('idea');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length === 0) return;
    setBusy(true);
    setError(false);
    try {
      await submitFamilyFeedback(getSupabaseBrowserClient(), groupId, {
        category,
        message: trimmed,
      });
      trackGrowthEvent({ name: 'family_feedback_submitted', category });
      setMessage('');
      setSent(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={onSubmit}>
      <h3 className="text-sm font-semibold text-text-primary">{t.t('family.feedbackHeading')}</h3>

      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">{t.t('family.feedbackCategoryLabel')}</legend>
        {CATEGORIES.map((option) => (
          <label
            key={option}
            className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold ${
              category === option
                ? 'border-action-primary bg-action-primary/10 text-action-primary'
                : 'border-action-primary/30 text-text-primary/70'
            }`}
          >
            <input
              type="radio"
              name="feedback-category"
              value={option}
              checked={category === option}
              onChange={() => {
                setCategory(option);
                setSent(false);
              }}
              className="sr-only"
            />
            {t.t(CATEGORY_LABEL_KEYS[option])}
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1 text-xs text-text-primary">
        {t.t('family.feedbackMessageLabel')}
        <textarea
          required
          maxLength={1000}
          rows={3}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setSent(false);
          }}
          placeholder={t.t('family.feedbackMessagePlaceholder')}
          className="rounded-md border border-action-primary/30 bg-background-canvas px-3 py-2 text-sm text-text-primary"
        />
      </label>

      {error ? <p className="text-xs text-status-error">{t.t('family.feedbackError')}</p> : null}
      {sent ? <p className="text-xs text-brand-accent">{t.t('family.feedbackThanks')}</p> : null}

      <Button type="submit" variant="secondary" disabled={busy || message.trim().length === 0}>
        {busy ? t.t('family.feedbackSending') : t.t('family.feedbackSubmit')}
      </Button>
    </form>
  );
}
