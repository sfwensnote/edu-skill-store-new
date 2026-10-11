import { BookOpen, ChartNoAxesColumnIncreasing, CircleHelp, Compass, MessageCircle } from 'lucide-react';
import type { CatalogCategory } from '../../shared/teaching-tags';
import { validSkillIcon, type SkillIconStyle } from '../../shared/skill-icon';
import './skill-icon.css';

export const skillCategoryIcons = {
  课堂提问: CircleHelp,
  错因辅导: MessageCircle,
  智能练习: ChartNoAxesColumnIncreasing,
  知识讲解: BookOpen,
  未分类: Compass,
};
export function SkillIcon({ category, icon, className = '' }: { category: CatalogCategory; icon?: SkillIconStyle; className?: string }) {
  const appearance = validSkillIcon(icon);
  const Icon = skillCategoryIcons[category];
  return <span className={`skill-icon ${className}`} data-category={category} data-custom={!!appearance?.image}
    style={appearance?.color ? { color: appearance.color, backgroundColor: `${appearance.color}14` } : undefined} aria-hidden="true">
    {appearance?.image ? <img src={appearance.image} alt="" /> : <Icon />}
  </span>;
}
