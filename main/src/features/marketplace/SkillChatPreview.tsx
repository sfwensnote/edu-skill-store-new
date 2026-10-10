import { useLayoutEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatComposer } from '@/components/ChatComposer';
import { MethodSituationSelect } from '@/components/MethodSituationSelect';
import { methodPreviewCases } from '../../../shared/method-preview';
import { demoSkillReply, skillPreviewSchema, type SkillPreviewRequest } from '../../../shared/skill-preview';
import type { EducationalSkill } from '../../../shared/assistant';

export function SkillChatPreview({ skill }: { skill: EducationalSkill }) {
  const cases = methodPreviewCases([skill]);
  const [caseId, setCaseId] = useState(cases[0]?.id || '');
  const [messages, setMessages] = useState<SkillPreviewRequest['messages']>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages.length]);
  function reset() { setMessages([]); setInput(''); setError(''); }
  function send() {
    if (!input.trim()) return;
    try {
      const next: SkillPreviewRequest['messages'] = [...messages, { role: 'user', content: input.trim() }];
      const request = skillPreviewSchema.safeParse({ skill, messages: next, caseId });
      if (!request.success) { setError('对话过长，请重新开始。当前输入仍保留。'); return; }
      const content = demoSkillReply(request.data);
      setMessages([...next, { role: 'assistant', content }]);
      setInput('');
      setError('');
    } catch {
      setError('回复未生成，请重新选择试用情况。输入仍保留。');
    }
  }
  return <section className="market-panel skill-experience">
    <h2>试用 SKILL</h2>
    <p className="subtle">当前 SKILL：{skill.name}</p>
    <MethodSituationSelect cases={cases} value={caseId} onChange={(id) => { reset(); setCaseId(id); }} />
    <div ref={chatRef} className="skill-preview-chat" role="log" aria-live="polite" aria-label="模型回复预览" tabIndex={0}>
      {!messages.length && <p className="subtle">以学生身份输入问题，查看模型会怎样回复。</p>}
      {messages.map((item, index) => <div className="experience-turn" key={index}>
        <strong>{item.role === 'user' ? '学生' : '模型回复'}</strong><p>{item.content}</p>
      </div>)}
    </div>
    {error && <p role="alert">{error}</p>}
    <ChatComposer id="market-student-input" label="学生输入" sendLabel="发送" value={input}
      onChange={setInput} onSend={send} maxLength={2000} placeholder="输入学生的问题或作答……" />
    <Button variant="ghost" size="sm" onClick={reset}><RotateCcw />重新开始</Button>
  </section>;
}
