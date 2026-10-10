import type { TeachingAssistant } from '../../../shared/assistant';
import type { SkillEntry } from '../../../shared/marketplace';

export type WorkshopProps = {
  tab?: string;
  onTab: (tab: string) => void;
  skills: SkillEntry[];
  allEntries: SkillEntry[];
  favorites: string[];
  shared: string[];
  assistants: TeachingAssistant[];
  onEditSkill: (entry: SkillEntry) => void;
  onOpenSkill: (id: string) => void;
  onCopySkill: (entry: SkillEntry) => void;
  onDeleteSkill: (entry: SkillEntry) => boolean;
  onMount: (assistantId: string, entry: SkillEntry) => boolean;
  onFavorite: (id: string) => void;
  onShare: (id: string) => boolean;
  onTrialSkill: (entry: SkillEntry) => void;
  onCreate: () => void;
  onMarket: () => void;
  onOpenAssistant: (id: string) => void;
  onDeleteAssistant: (id: string) => boolean;
};
