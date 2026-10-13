import { z } from 'zod';
import { skillSchema } from './assistant';
import { companionSchema } from './learning-companion';

const text = (max = 2000) => z.string().trim().min(1).max(max);
export const methodInputSchema = z.object({ entryId: text(160), skill: skillSchema });
export type MethodInput = z.infer<typeof methodInputSchema>;
export const testSituationSchema = z.object({
  title: text(100), scenario: text(1000), kind: z.enum(['trigger', 'nontrigger', 'step', 'principle', 'ending']),
  target: z.number().int().min(0).max(7), studentTurns: z.array(text(1200)).min(1).max(3), expected: text(1000),
});
export type TestSituation = z.infer<typeof testSituationSchema>;
export const evidenceSchema = z.object({ messageId: text(100), quote: text(2000) });
export type Evidence = z.infer<typeof evidenceSchema>;
export const dimensions = ['trigger', 'steps', 'principles', 'ending'] as const;
export const dimensionLabels = { trigger: '触发条件', steps: '教学步骤', principles: '教学原则', ending: '结束条件' };
export const verdictSchema = z.object({
  dimension: z.enum(dimensions), status: z.enum(['pass', 'fail', 'uncertain', 'not-applicable']),
  reason: text(1200), evidence: z.array(evidenceSchema).max(8),
});
export type Verdict = z.infer<typeof verdictSchema>;
export const activationSchema = z.object({
  entryId: text(160), step: z.number().int().min(0).max(7), ended: z.boolean(), reason: text(800),
  evidence: z.array(evidenceSchema).min(1).max(4),
});
export type Activation = z.infer<typeof activationSchema>;
export type RecordedMessage = { id: string; role: 'user' | 'assistant'; content: string; at: string; activations: Activation[] };
export type DetectionCase = TestSituation & { id: string; messages: RecordedMessage[]; verdicts: Verdict[] };
export type Detection = {
  id: string; ownerId: string; method: MethodInput; fingerprint: string; model: string;
  status: 'running' | 'review' | 'failed' | 'verified'; cases: DetectionCase[]; error: string;
  createdAt: string; confirmedAt?: string;
};
export type Verification = { entryId: string; detectionId: string; fingerprint: string; skill: MethodInput['skill'] };
export const trialInputSchema = z.object({
  companion: companionSchema, methods: z.array(methodInputSchema).min(1).max(8),
  hours: z.number().int().min(1).max(168), capacity: z.number().int().min(1).max(30),
});
export type Trial = {
  purpose?: 'run' | 'practice';
  id: string; ownerId: string; companion: z.infer<typeof companionSchema>; methods: MethodInput[];
  verifications: string[]; model: string; status: 'open' | 'closed' | 'revoked';
  createdAt: string; expiresAt: string; capacity: number;
};
export type TrialSession = {
  id: string; trialId: string; audience: 'teacher' | 'student'; name: string; messages: RecordedMessage[];
  pending: boolean; error: string; createdAt: string; requestId?: string;
  failures?: { messageId: string; at: string; error: string }[];
};
export const findingSchema = z.object({
  aspect: z.enum(['learning', 'skill', 'runtime']), severity: z.enum(['observation', 'concern']),
  description: text(1600), evidence: z.array(evidenceSchema).min(1).max(8),
});
export type Finding = z.infer<typeof findingSchema>;
export const reviewSchema = z.object({
  decision: z.enum(['meets-expectations', 'adjust-scene', 'modify-skill', 'expand-trial']), note: text(2000),
});
export type TrialReport = {
  id: string; trialId: string; createdAt: string; studentCount: number; turnCount: number;
  status: 'running' | 'failed' | 'ready'; error: string;
  findings: Finding[]; limitation: string; review?: z.infer<typeof reviewSchema> & { at: string };
};
export const reportLimitation = '本报告仅根据对话记录分析学生表现与教学行为，不能据此认定学习效果已经提升。';
export function methodSteps(skill: MethodInput['skill']) {
  return skill.steps?.length ? skill.steps : skill.behaviorSteps.map(action => ({ condition: skill.trigger, action }));
}
export function evidenceIssue(evidence: Evidence[], messages: RecordedMessage[]) {
  return evidence.some(item => !messages.some(message => message.id === item.messageId && message.content.includes(item.quote)));
}
export function detectionPassed(cases: DetectionCase[]) {
  return cases.length > 0 && cases.every(item => item.verdicts.length === 4 &&
    dimensions.every(dimension => item.verdicts.some(v => v.dimension === dimension && ['pass', 'not-applicable'].includes(v.status))));
}
