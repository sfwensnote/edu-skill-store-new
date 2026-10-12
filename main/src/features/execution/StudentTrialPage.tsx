import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CompanionAvatar } from '../companions/CompanionProfile';
import { newCompanion } from '../../../shared/learning-companion';
import type { Trial, TrialSession } from '../../../shared/execution';
import { executionApi, failureMessage, serviceConfigured, serviceIssue } from './api';
import { TrialChat } from './TrialChat';
import './execution.css';

type Joined = { session: TrialSession; token: string; companion: Pick<Trial['companion'], 'name' | 'introduction' | 'avatar' | 'avatarImage' | 'task'> };
export function StudentTrialPage({ invitation }: { invitation: string }) {
  const key = `teaching-workshop.trial:${invitation}`;
  const [joined, setJoined] = useState<Joined | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState(serviceConfigured ? '' : serviceIssue());
  const [busy, setBusy] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  useEffect(() => {
    let disposed = false;
    try {
      const token = sessionStorage.getItem(key);
      if (token && serviceConfigured) {
        setBusy(true);
        void executionApi<Omit<Joined, 'token'>>('/public/session', undefined, { public: true, token })
          .then(value => { if (!disposed) setJoined({ ...value, token }); }).catch(error => { if (!disposed) setError(failureMessage(error)); })
          .finally(() => { if (!disposed) setBusy(false); });
      }
    } catch { setError('浏览器无法保存试用凭据，请开启存储权限。'); }
    return () => { disposed = true; };
  }, [key]);
  if (!serviceConfigured) return <div className="application"><main className="page-frame execution-page student-trial">
    <header className="execution-heading"><h1>学伴试用</h1></header>
    <section className="market-panel execution-join"><p>学生试用链接暂未开放。教师可在“我的学伴”中试运行。</p>
      <Button onClick={() => { location.hash = '#/home'; }}>返回首页</Button></section>
  </main></div>;
  return <div className="application"><main className="page-frame execution-page student-trial">
    <header className="execution-heading"><h1>{joined?.companion.name || '学伴试用'}</h1>
      <p>这次对话会保存供教师核对。请使用昵称，不填写个人敏感信息。</p></header>
    {error && <p className="execution-error" role="alert">{error}</p>}
    {!joined ? <form className="market-panel execution-join" onSubmit={event => {
      event.preventDefault(); if (busy) return; setBusy(true); setError('');
      void executionApi<Joined>('/public/join', { invitation, name, requestId: requestId.current }, { public: true }).then(value => {
        sessionStorage.setItem(key, value.token); setJoined(value);
      }).catch(error => setError(failureMessage(error))).finally(() => setBusy(false));
    }}><label className="form-field">昵称<input required maxLength={30} value={name} disabled={busy} onChange={event => setName(event.target.value)} /></label>
      <Button disabled={!serviceConfigured || busy}>{busy ? '正在进入…' : '进入试用'}</Button></form> : <section className="market-panel execution-case">
      <div className="execution-companion"><CompanionAvatar value={{ ...newCompanion('preview'), ...joined.companion }} /><p>{joined.companion.introduction}</p></div>
      <p>{joined.companion.task.taskAndGoals}</p>
      <TrialChat key={joined.session.id} session={joined.session} onSend={(content, requestId) =>
        executionApi('/public/turn', { content, requestId }, { public: true, token: joined.token })} />
    </section>}
  </main></div>;
}
