import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { TeachingAssistant } from '../../../shared/assistant';
import { AssistantIcon } from '@/components/AssistantIcon';
import { Button } from '@/components/ui/button';

export function LibraryDetailPage({
  assistant,
  onBack,
  onUse,
  backLabel,
}: {
  assistant: TeachingAssistant;
  onBack: () => void;
  onUse: () => void;
  backLabel: string;
}) {
  return (
    <main className="library-detail-page page-frame narrow-frame">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft />
        {backLabel}
      </button>
      <section className="library-detail-hero">
        <span className="detail-icon">
          <AssistantIcon subject={assistant.subject} size={30} />
        </span>
        <div>
          <span className="detail-meta">
            {assistant.grade} · {assistant.subject} · {assistant.activity}
          </span>
          <h1>{assistant.name}</h1>
          <p>{assistant.goal}</p>
          <Button size="lg" onClick={onUse}>
            开始使用
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </section>
      <section className="detail-skills">
        <h2>教学方法</h2>
        {assistant.skills.map((skill) => (
          <article key={skill.id}>
            <span>
              <Check />
            </span>
            <div>
              <h3>{skill.name}</h3>
              <p>{skill.summary}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
