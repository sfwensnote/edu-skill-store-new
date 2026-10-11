import { z } from 'zod';

export const skillIconMaxBytes = 1024 * 1024;
export const skillIconColors = ['#25634f', '#3b6d9a', '#8064a2', '#a46c28', '#b35d65'] as const;
export const skillIconSchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  image: z.string().max(Math.ceil(skillIconMaxBytes / 3) * 4 + 40)
    .regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/).optional(),
});
export type SkillIconStyle = z.infer<typeof skillIconSchema>;

export function validSkillIcon(value: unknown): SkillIconStyle | undefined {
  const result = skillIconSchema.safeParse(value);
  return result.success ? result.data : undefined;
}
