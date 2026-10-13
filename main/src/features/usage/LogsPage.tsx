import { ChevronRight, FileText, Play } from 'lucide-react';
import type { TeachingAssistant } from '../../../shared/assistant';
import { Button } from '@/components/ui/button';
import './review.css';

export function LogsPage({
  assistant,
  onOpen,
  onReport,
  onUse,
  onBack,
  backLabel,
}: {
  assistant: TeachingAssistant;
  onOpen: (id: string) => void;
  onReport: () => void;
  onUse: () => void;
  onBack: () => void;
  backLabel: string;
}) {
  return (
    <main className="logs-page page-frame wide-frame">
      <button className="back-link" onClick={onBack}>
        ← {backLabel}
      </button>
      <div className="logs-hero">
        <div>
          <div className="logs-title-row">
            <h1>{assistant.name}</h1>
          </div>
        </div>
        <div className="logs-hero-actions">
          <Button onClick={onUse}>
            <Play data-icon="inline-start" />
            学生视角预览
          </Button>
          <Button variant="outline" onClick={onReport}>
            <FileText data-icon="inline-start" />
            查看核对摘要
          </Button>
        </div>
      </div>
      <div className="method-overview-content">
        <div className="logs-main-column">
          <section className="run-records">
            <header className="records-head">
              <h2>教学方法</h2>
            </header>
            <div className="session-list">
              {assistant.skills.map((skill) => (
                <button
                  className="session-row method-preview-row"
                  key={skill.id}
                  onClick={() => onOpen(skill.id)}
                >
                  <span className="session-detail">
                    <strong>{skill.name}</strong>
                    <small>当{skill.trigger}</small>
                  </span>
                  <span>查看方法步骤</span>
                  <ChevronRight />
                </button>
              ))}
              {!assistant.skills.length && <p>尚未形成教学方法，请先整理教学方法。</p>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
