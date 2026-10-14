import type { SkillEntry } from '../../../shared/marketplace';
import type { TeachingMethod } from '../../../shared/teaching-method';
import { MethodModelChatPage } from './MethodModelChatPage';

export type MethodDetectionProps = {
  entries: SkillEntry[];
  onBack: () => void;
  onAdjust?: () => void;
  onConfirmed?: (entry: SkillEntry) => Promise<{ pendingIds: string[] }>;
  onRevise?: (entry: SkillEntry, method: TeachingMethod) => boolean;
  onPublish?: (entry: SkillEntry) => void;
  onFinish?: () => void;
  canPublish?: (entry: SkillEntry) => boolean;
};
export function MethodDetectionPage(props: MethodDetectionProps) {
  return <MethodModelChatPage {...props} />;
}
