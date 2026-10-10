import { ArrowRight, BookOpen, Check, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { TeachingAssistant } from '../../../shared/assistant';
import { SkillSection } from './SkillSection';
import { Button } from '@/components/ui/button';

export function AssistantDraft({
  assistant,
  recentlyAdjustedSkill,
  onAdjust,
  onGenerated,
  onStartTest,
  isIncluded,
  onToggleIncluded,
}: {
  assistant: TeachingAssistant;
  recentlyAdjustedSkill: string;
  onAdjust: (skillName: string) => void;
  onGenerated: () => void;
  onStartTest: () => void;
  isIncluded: (skillId: string) => boolean;
  onToggleIncluded: (skillId: string) => void;
}) {
  const [expanded, setExpanded] = useState(assistant.skills[0]?.id || '');
  const [generating, setGenerating] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);
  const previousSkillIds = useRef(assistant.skills.map((skill) => skill.id));
  const hasDraft = Boolean(assistant.name && assistant.goal && assistant.skills.length);
  const generated = assistant.status !== 'DRAFT';
  const includedCount = assistant.skills.filter((skill) => isIncluded(skill.id)).length;
  useEffect(() => {
    const currentIds = assistant.skills.map((skill) => skill.id);
    const addedSkillId = currentIds.find((id) => !previousSkillIds.current.includes(id));
    if (addedSkillId) {
      setExpanded(addedSkillId);
      window.requestAnimationFrame(() => {
        if (documentRef.current) documentRef.current.scrollTop = documentRef.current.scrollHeight;
      });
    } else if (expanded && !currentIds.includes(expanded)) {
      setExpanded('');
    }
    previousSkillIds.current = currentIds;
  }, [assistant.skills, expanded]);
  useEffect(() => {
    if (!recentlyAdjustedSkill) return;
    const adjusted = assistant.skills.find((skill) => skill.name === recentlyAdjustedSkill);
    if (adjusted) setExpanded(adjusted.id);
  }, [assistant.skills, recentlyAdjustedSkill]);
  function generate() {
    if (!hasDraft || generating) return;
    setGenerating(true);
    window.setTimeout(() => {
      setGenerating(false);
      onGenerated();
    }, 950);
  }
  return (
    <section className="assistant-draft" aria-label="助手设计稿">
      <header className="draft-panel-head">
        <h2>助手设计稿</h2>
      </header>
      {!hasDraft ? (
        <div className="draft-empty">
          <span className="draft-empty-symbol">
            <BookOpen />
          </span>
          <h1>从左侧描述你的教学想法</h1>
        </div>
      ) : (
        <div className="draft-document" ref={documentRef}>
          <div className="draft-intro">
            <h1>{assistant.name}</h1>
            <p>{assistant.goal}</p>
          </div>
          <div className="skills-heading">
            <h2>教学技能</h2>
            <span>{assistant.skills.length} 项</span>
          </div>
          <div className="skill-stack">
            {assistant.skills.map((skill) => (
              <SkillSection
                key={skill.id}
                skill={skill}
                expanded={expanded === skill.id}
                onToggle={() => setExpanded((current) => (current === skill.id ? '' : skill.id))}
                onAdjust={() => onAdjust(skill.name)}
                included={isIncluded(skill.id)}
                onToggleIncluded={() => onToggleIncluded(skill.id)}
                recentlyUpdated={recentlyAdjustedSkill === skill.name}
              />
            ))}
          </div>
          <div className={`generation-panel ${generating || generated ? 'visible' : ''}`}>
            {generating ? (
              <>
                <div className="generation-title">
                  <LoaderCircle className="spin" />
                  <strong>正在生成助手</strong>
                </div>
                <div className="generation-steps">
                  <span>
                    <Check />
                    整理教学目标
                  </span>
                  <span>
                    <Check />
                    加载教学技能
                  </span>
                  <span>
                    <Check />
                    建立教学行为规则
                  </span>
                </div>
              </>
            ) : generated ? (
              <>
                <div className="generation-title success">
                  <Check />
                  <strong>助手已生成</strong>
                </div>
                <Button size="lg" onClick={onStartTest}>
                  开始检测
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" className="generate-button" onClick={generate} disabled={!includedCount}>
                  生成助手
                  <ArrowRight data-icon="inline-end" />
                </Button>
                {!includedCount && <p className="selection-warning">请至少选择一项教学技能加入助手。</p>}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
