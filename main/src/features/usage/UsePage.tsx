import { ChatComposer } from '@/components/ChatComposer';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import type { TeachingAssistant } from '../../../shared/assistant';

export function UsePage({
  assistant,
  onBack,
  backLabel,
}: {
  assistant: TeachingAssistant;
  onBack: () => void;
  backLabel: string;
}) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '把你正在思考的题目和步骤发给我，我们一起找到下一步。',
    },
  ]);
  const [value, setValue] = useState('');
  function send() {
    if (!value.trim()) return;
    const skill = assistant.skills[0];
    setMessages((items) => [
      ...items,
      { role: 'user', content: value },
      {
        role: 'assistant',
        content: skill
          ? `当${skill.trigger}，教师会：${skill.steps?.[0]?.action || skill.behaviorSteps[0]}`
          : '尚未配置教学方法，请返回我的 SKILL补充。',
      },
    ]);
    setValue('');
  }
  return (
    <main className="use-page page-frame narrow-frame">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft />
        {backLabel}
      </button>
      <div className="use-heading">
        <h1>{assistant.name}</h1>
        <p>{assistant.goal}</p>
      </div>
      <section className="student-chat">
        {messages.map((message, index) => (
          <div className={`student-message ${message.role}`} key={`${message.role}-${index}`}>
            <span>{message.role === 'user' ? '学生' : '教学助手'}</span>
            <p>{message.content}</p>
          </div>
        ))}
      </section>
      <ChatComposer
        value={value}
        onChange={setValue}
        onSend={send}
        label="学生问题"
        sendLabel="发送问题"
        placeholder="输入题目或你的解题过程……"
      />
    </main>
  );
}
