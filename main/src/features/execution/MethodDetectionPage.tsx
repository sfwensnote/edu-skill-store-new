import type { SkillEntry } from '../../../shared/marketplace';
import type { TeachingMethod } from '../../../shared/teaching-method';
import { serviceConfigured } from './api';
import { RemoteMethodDetectionPage } from './RemoteMethodDetectionPage';
import { MethodReviewPage } from './MethodReviewPage';

export type MethodDetectionProps = {
  entries: SkillEntry[];
  onBack: () => void;
  onAdjust?: () => void;
  onConfirmed?: () => void;
  onRevise?: (entry: SkillEntry, method: TeachingMethod) => boolean;
};
export function MethodDetectionPage(props: MethodDetectionProps) {
  return serviceConfigured ? <RemoteMethodDetectionPage {...props} /> : <MethodReviewPage {...props} />;
}
