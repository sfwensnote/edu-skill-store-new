import { ChatComposer } from '@/components/ChatComposer';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import type { TeachingAssistant } from '../../../shared/assistant';
import { Button } from '@/components/ui/button';
import { MethodSituationSelect } from '@/components/MethodSituationSelect';
import { methodPreviewCases, type MethodPreviewCase } from '../../../shared/method-preview';
import { demoSkillReply, skillPreviewSchema } from '../../../shared/skill-preview';
import { ViewTabs } from '@/components/ViewTabs';
import { MethodSteps } from './MethodSteps';
import './preview-workspace.css';

type PreviewMessage = { role: 'student' | 'assistant'; content: string };

function initialMessages(skill?: TeachingAssistant['skills'][number], example?: MethodPreviewCase): PreviewMessage[] {
  if (!skill || !example) return [];
  return [
    { role: 'student', content: example.studentInput },
    { role: 'assistant', content: demoSkillReply({ skill, caseId: example.id,
      messages: [{ role: 'user', content: example.studentInput }] }) },
  ];
}

function fixedReply(input: string, example: MethodPreviewCase | undefined, skill: TeachingAssistant['skills'][number], history: PreviewMessage[]): string {
  return demoSkillReply({ skill, caseId: example?.id, messages: [
    ...history.map(item => ({ role: item.role === 'student' ? 'user' as const : 'assistant' as const, content: item.content })),
    { role: 'user', content: input },
  ] });
}

export function StudentPreviewPage({
  assistant,
  onBack,
  initialCaseId,
  onContinue,
  checked,
  backLabel,
  onDone,
  onShare,
  sharedSkillIds,
}: {
  assistant: TeachingAssistant;
  onBack: () => void;
  initialCaseId?: string;
  onContinue: () => void;
  checked: boolean;
  backLabel: string;
  onDone: () => void;
  onShare: (skillId: string) => void;
  sharedSkillIds: string[];
}) {
  const cases = methodPreviewCases(assistant.skills);
  const [caseId, setCaseId] = useState(initialCaseId || cases[0]?.id || '');
  const selected = cases.find((item) => item.id === caseId) || cases[0];
  const activeSkill = assistant.skills.find((skill) => skill.id === selected?.skillId) || assistant.skills[0];
  const shared = sharedSkillIds.includes(activeSkill?.id || '');
  const [view, setView] = useState<'chat' | 'method'>('chat');
  const [messages, setMessages] = useState<PreviewMessage[]>(() => initialMessages(activeSkill, selected));
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const chatRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const chat = chatRef.current;
    if (chat) chat.scrollTop = chat.scrollHeight;
  }, [messages.length]);
  function send() {
    const input = value.trim();
    if (!input) return;
    if (!activeSkill || !skillPreviewSchema.safeParse({ skill: activeSkill, caseId: selected?.id, messages: [
      ...messages.map((item) => ({ role: item.role === 'student' ? 'user' : 'assistant', content: item.content })),
      { role: 'user', content: input },
    ] }).success) { setError('对话过长，请重新开始。当前输入仍保留。'); return; }
    setMessages((items) => [
      ...items,
      { role: 'student', content: input },
      { role: 'assistant', content: fixedReply(input, selected, activeSkill,
        messages) },
    ]);
    setValue('');
    setError('');
  }
  function reset() {
    setError('');
    setMessages(initialMessages(activeSkill, selected));
    setValue('');
  }
  function selectCase(id: string) {
    setError('');
    setCaseId(id);
    const example = cases.find(item => item.id === id);
    setMessages(initialMessages(assistant.skills.find(skill => skill.id === example?.skillId), example));
    setValue('');
  }
  const backText = backLabel;
  if (!activeSkill) return <main className="page-frame not-found"><h1>还没有可试用的 SKILL</h1>
    <Button onClick={onContinue}>返回方法编辑</Button></main>;
  return (
    <main className="student-preview-page page-frame">
      <header className="student-preview-heading page-heading">
        <button className="back-link" onClick={onBack}>
          <ArrowLeft />
          {backText}
        </button>
        <div><h1>学生视角预览</h1>
        <p>{activeSkill.name}</p></div>
      </header>
      <ViewTabs className="preview-view-tabs" label="学生预览视图" value={view} onChange={setView} items={[
        { value: 'chat', label: '体验引导', panelId: 'preview-experience' },
        { value: 'method', label: '方法步骤', panelId: 'preview-method' },
      ]} />
      <div id="preview-experience" role="tabpanel" aria-labelledby="preview-experience-tab" hidden={view !== 'chat'}>
      <MethodSituationSelect cases={cases} value={caseId} onChange={selectCase} />
      <section
        ref={chatRef}
        className="student-chat preview-chat"
        role="log"
        aria-live="polite"
        aria-label="学生视角对话"
      >
        {messages.map((message, index) => (
          <div className={`student-message ${message.role === 'student' ? 'user' : 'assistant'}`} key={index}>
            <span>{message.role === 'student' ? '学生' : '模型回复'}</span>
            <p>{message.content}</p>
          </div>
        ))}
      </section>
      {error && <p role="alert">{error}</p>}
      <ChatComposer
        id="preview-student-input"
        value={value}
        onChange={setValue}
        onSend={send}
        label="以学生身份输入"
        sendLabel="发送学生问题"
        maxLength={500}
        placeholder="以学生身份输入题目或解题过程……"
      />
      <div className="preview-under-chat">
        <div className="preview-suggestions">
          {[selected?.studentInput || ''].map((sample) => (
            <button
              key={sample}
              onClick={() => {
                setValue(sample);
                document.getElementById('preview-student-input')?.focus();
              }}
            >
              {sample}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw data-icon="inline-start" />
          重新开始
        </Button>
      </div>
      </div>
      <div id="preview-method" role="tabpanel" aria-labelledby="preview-method-tab" hidden={view !== 'method'}>
        {assistant.skills.length > 1 && <label className="form-field">选择教学方法
          <select aria-label="选择教学方法" value={activeSkill?.id} onChange={(event) => selectCase(`${event.target.value}:0`)}>
            {assistant.skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
          </select>
        </label>}
        {activeSkill && <MethodSteps skill={activeSkill} onPreview={(index) => {
          selectCase(`${activeSkill.id}:${index}`);
          setView('chat');
          document.getElementById('preview-experience-tab')?.focus();
        }} />}
      </div>
      <details className="preview-review-record">
        <summary>核对记录</summary>
        <p>{checked ? '教师已核对方法内容' : '方法内容待核对'}</p>
        {assistant.skills.map((skill) => <p key={skill.id}>{skill.name}</p>)}
      </details>
      <footer className="preview-next-step">
        {!checked ? <Button onClick={onContinue}>先核对教学方法</Button> : <>
          {!shared && activeSkill && <Button variant="outline" onClick={() => onShare(activeSkill.id)}>发布到集市</Button>}
          {shared && <span className="preview-shared-status">已发布到集市</span>}
          <Button onClick={onDone}>完成，返回我的 SKILL</Button>
        </>}
      </footer>
    </main>
  );
}
