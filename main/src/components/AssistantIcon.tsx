import {
  BookOpen,
  Calculator,
  FlaskConical,
  Globe2,
  GraduationCap,
  Landmark,
  Languages,
  Leaf,
  Lightbulb,
} from 'lucide-react';

export function AssistantIcon({ subject, size = 22 }: { subject: string; size?: number }) {
  const Icon =
    subject === '数学'
      ? Calculator
      : subject === '语文'
        ? BookOpen
        : subject === '英语'
          ? Languages
          : subject === '物理'
            ? Lightbulb
            : subject === '化学'
              ? FlaskConical
              : subject === '生物'
                ? Leaf
                : subject === '历史'
                  ? Landmark
                  : subject === '地理'
                    ? Globe2
                    : GraduationCap;
  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" />;
}
