import { z } from 'zod';

export const detectionCaseSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), input: z.string().min(1).max(2000),
  expected: z.string().min(1).max(2000),
});
export const detectionSchema = z.object({
  revision: z.number().int().min(1), mode: z.literal('demo'), model: z.string().min(1),
  checkedAt: z.string(), contentSignature: z.string(),
  cases: z.array(detectionCaseSchema.extend({
    output: z.string().min(1), status: z.enum(['pass', 'review']), reason: z.string().min(1),
  })).min(1),
});
export type SkillDetection = z.infer<typeof detectionSchema>;
export type SkillDetectionCase = z.infer<typeof detectionCaseSchema>;
