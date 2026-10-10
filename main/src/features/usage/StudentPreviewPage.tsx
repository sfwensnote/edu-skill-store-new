import { ChatComposer } from '@/components/ChatComposer';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import type { TeachingAssistant } from '../../../shared/assistant';
import { Button } from '@/components/ui/button';
import { MethodSituationSelect } from '@/components/MethodSituationSelect';
import { methodPreviewCases, methodPreviewReply, type MethodPreviewCase } from '../../../shared/method-preview';
import { ViewTabs } from '@/components/ViewTabs';
import { MethodSteps } from './MethodSteps';
import './preview-workspace.css';

type PreviewMessage = { role: 'student' | 'assistant'; content: string };

function isEquationDemo(assistant: TeachingAssistant) {
  return (
    !assistant.revision &&
    assistant.subject === '数学' &&
    /方程/.test(`${assistant.activity} ${assistant.goal}`) &&
    assistant.skills.every((skill) =>
      ['reflect', 'progressive-hint', 'understanding-check'].includes(skill.id),
    )
  );
}

function initialMessages(equationDemo: boolean): PreviewMessage[] {
  return equationDemo
    ? [
        { role: 'assistant', content: '我们一起看看这道题：3x + 6 = 12。你已经算到哪一步了？' },
        { role: 'student', content: '我算出来 x = 9，但老师说不对。' },
        { role: 'assistant', content: '先不急着改答案。你能说说从 3x + 6 = 12 到 x = 9，你是怎样计算的吗？' },
      ]
    : [{ role: 'assistant', content: '请说说你正在处理的问题，以及你已经尝试过什么。' }];
}

function fixedReply(input: string, equationDemo: boolean, example?: MethodPreviewCase): string {
  if (!equationDemo) {
    return methodPreviewReply(example);
  }
  if (/12\s*\+\s*6|移到右边|移项/.test(input))
    return '你已经说出了关键一步。为了消去左边的 +6，等式两边应该同时做加法还是减法？先试着写出这一步。';
  if (/两边.*减|减去\s*6|减\s*6/.test(input))
    return '对，等式两边同时减去 6，仍能保持相等。现在请你写出新的等式，再试着求出 x。';
  if (/不会|提示|不知道|卡住/.test(input))
    return '先看等式左边的 +6。你想让它消失时，等式两边可以同时做什么操作？';
  return '先不急着看答案。请把你目前的计算过程写出来，我们从你不确定的那一步开始。';
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
  const [equationDemo, setEquationDemo] = useState(() => isEquationDemo(assistant) && !initialCaseId);
  const cases = methodPreviewCases(assistant.skills);
  const [caseId, setCaseId] = useState(initialCaseId || cases[0]?.id || '');
  const selected = cases.find((item) => item.id === caseId) || cases[0];
  const activeSkill = assistant.skills.find((skill) => skill.id === selected?.skillId) || assistant.skills[0];
  const shared = sharedSkillIds.includes(activeSkill?.id || '');
  const [view, setView] = useState<'chat' | 'method'>('chat');
  const [messages, setMessages] = useState<PreviewMessage[]>(() => initialMessages(equationDemo));
  const [value, setValue] = useState('');
  const chatRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const chat = chatRef.current;
    if (chat) chat.scrollTop = chat.scrollHeight;
  }, [messages.length]);
  function send() {
    const input = value.trim();
    if (!input) return;
    setMessages((items) => [
      ...items,
      { role: 'student', content: input },
      { role: 'assistant', content: fixedReply(input, equationDemo, selected) },
    ]);
    setValue('');
  }
  function reset() {
    setMessages(initialMessages(equationDemo));
    setValue('');
  }
  function selectCase(id: string) {
    setEquationDemo(false);
    setCaseId(id);
    setMessages(initialMessages(false));
    setValue('');
  }
  const backText = backLabel;
  return (
    <main className="student-preview-page page-frame">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft />
        {backText}
      </button>
      <header className="student-preview-heading">
        <h1>学生视角预览</h1>
        <p>{assistant.name}</p>
      </header>
      <div className="preview-notice">固定对话示例，不判断真实触发条件，不作为执行证据。</div>
      <ViewTabs className="preview-view-tabs" label="学生预览视图" value={view} onChange={setView} items={[
        { value: 'chat', label: '体验引导', panelId: 'preview-experience' },
        { value: 'method', label: '方法步骤', panelId: 'preview-method' },
      ]} />
      <div id="preview-experience" role="tabpanel" aria-labelledby="preview-experience-tab" hidden={view !== 'chat'}>
      {!equationDemo && <MethodSituationSelect cases={cases} value={caseId} onChange={selectCase} />}
      <section
        ref={chatRef}
        className="student-chat preview-chat"
        role="log"
        aria-live="polite"
        aria-label="学生视角对话"
      >
        {messages.map((message, index) => (
          <div className={`student-message ${message.role === 'student' ? 'user' : 'assistant'}`} key={index}>
            <span>{message.role === 'student' ? '学生' : '教学助手'}</span>
            <p>{message.content}</p>
          </div>
        ))}
      </section>
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
          {(equationDemo
            ? [
                '我把左边的 6 移到右边，算成了 12 + 6。',
                '我还是不知道下一步怎么做。',
                '应该两边都减去 6 吗？',
              ]
            : ['我遇到了困难，想请你帮我看看。']
          ).map((sample) => (
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
          <select aria-label="选择教学方法" value={activeSkill?.id} onChange={(event) => setCaseId(`${event.target.value}:0`)}>
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
        <p>v{assistant.revision || 1}.0 · {checked ? '教师已核对方法内容' : '方法内容待核对'}</p>
        {assistant.skills.map((skill) => <p key={skill.id}>{skill.name}</p>)}
      </details>
      <footer className="preview-next-step">
        {!checked ? <Button onClick={onContinue}>先核对教学方法</Button> : <>
          {!shared && activeSkill && <Button variant="outline" onClick={() => onShare(activeSkill.id)}>分享到集市</Button>}
          {shared && <span className="preview-shared-status">已在集市展示</span>}
          <Button onClick={onDone}>完成，返回我的作品</Button>
        </>}
      </footer>
      {checked && !shared && <p className="preview-share-scope">分享当前方法，仅在本机工作区可见。</p>}
    </main>
  );
}
