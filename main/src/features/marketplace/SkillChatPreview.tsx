import { useLayoutEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { skillTrialCases, type SkillTrialCase, type SkillTrialTurn } from '@/data/skill-trial-cases';
import type { EducationalSkill } from '../../../shared/assistant';

export function SkillChatPreview({ skill }: { skill: EducationalSkill }) {
  const cases = skillTrialCases(skill);
  const [caseId, setCaseId] = useState(cases[0]?.id || '');
  const selected = cases.find((item) => item.id === caseId) || cases[0];
  return (
    <section className="market-panel skill-experience skill-case-trial" aria-label="试用教学方法">
      <h2>试用教学方法</h2>
      {selected ? <>
        <p className="subtle">选择学生的回答，看模型采用这项教学方法后如何引导。</p>
        {cases.length > 1 ? <label className="form-field">
          试用案例
          <select aria-label="试用案例" value={selected.id} onChange={(event) => setCaseId(event.target.value)}>
            {cases.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </label> : <h3 className="skill-trial-title">{selected.title}</h3>}
        <p className="skill-trial-material">{selected.material}</p>
        <CaseDialogue key={selected.id} trial={selected} />
      </> : <p className="subtle skill-trial-empty">暂无试用案例</p>}
    </section>
  );
}

function CaseDialogue({ trial }: { trial: SkillTrialCase }) {
  const [turns, setTurns] = useState<SkillTrialTurn[]>([trial.start]);
  const [started, setStarted] = useState(false);
  const replyRef = useRef<HTMLParagraphElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const resetFocus = useRef(false);
  const current = turns[turns.length - 1];
  useLayoutEffect(() => {
    if (started) replyRef.current?.focus();
    else if (resetFocus.current) {
      startRef.current?.focus();
      resetFocus.current = false;
    }
  }, [started, turns.length]);
  function reset() {
    resetFocus.current = true;
    setTurns([trial.start]);
    setStarted(false);
  }
  return <>
    <div className="skill-trial-dialogue" role="log" aria-live="polite" aria-label="试用对话">
      {turns.map((turn, index) => <div key={index}>
        <div className="experience-turn"><strong>学生</strong><p>{turn.student}</p></div>
        {started && <div className="experience-turn">
          <strong>模型回复</strong>
          <p ref={index === turns.length - 1 ? replyRef : undefined} tabIndex={-1}>{turn.reply}</p>
        </div>}
      </div>)}
    </div>
    {!started ? <Button ref={startRef} onClick={() => setStarted(true)}>查看模型回复</Button> : <>
      {current.choices?.length ? <div className="skill-trial-choices" role="group" aria-label="选择学生接下来的回答">
        <p>学生接下来怎样回答？</p>
        {current.choices.map((choice) => <Button key={choice.student} variant="outline"
          onClick={() => setTurns((previous) => previous.at(-1) === current ? [...previous, choice] : previous)}>{choice.student}</Button>)}
      </div> : <p className="subtle skill-trial-end" role="status">已看完这个案例。</p>}
      <Button variant="ghost" size="sm" onClick={reset}><RotateCcw data-icon="inline-start" />重新试用</Button>
    </>}
  </>;
}
