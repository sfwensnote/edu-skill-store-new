import type { TeachingActivityDraft } from '../../shared/legacy-activity';

export function legacyActivityDraft(id: string): Extract<TeachingActivityDraft, { path: 'learning' }> {
  return {
    id, step: 1, updatedAt: '2026-09-09T14:40:00.000Z', path: 'learning', resourceKey: '', supportSkillId: '',
    settings: {
      title: '', instructions: '', audience: 'controlled', audienceLabel: '', startsAt: '', endsAt: '',
      allowRetry: true, submission: 'text', feedbackTiming: 'after-submit', feedback: '学习记录已保存。',
    },
  };
}
