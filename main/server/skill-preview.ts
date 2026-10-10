import { compileSkillInstructions, demoSkillReply, skillPreviewSchema } from '../shared/skill-preview';
import { complete, modelStatus } from './models';

export async function previewSkill(input: unknown) {
  const request = skillPreviewSchema.parse(input);
  if (!modelStatus().teachingReady) return { content: demoSkillReply(request), mode: 'demo' as const };
  return {
    content: await complete('TEACHING', compileSkillInstructions(request.skill), request.messages),
    mode: 'live' as const,
  };
}
