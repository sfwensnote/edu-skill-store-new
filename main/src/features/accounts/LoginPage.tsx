import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';

export function LoginPage({ onLogin, onRegister, initialError }: {
  initialError: string;
  onLogin: (login: string, password: string) => Promise<void>;
  onRegister: (name: string, login: string, password: string) => Promise<void>;
}) {
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { if (register) await onRegister(name, login, password); else await onLogin(login, password); }
    catch (failure) { setError(failure instanceof Error && /[\u4e00-\u9fff]/.test(failure.message)
      ? failure.message : '登录资料未保存，请检查浏览器存储权限后重试。'); }
    finally { setBusy(false); }
  }
  return <div className="application">
    <header className="app-header"><div className="header-inner"><span className="brand"><span className="brand-logo"><img src={`${import.meta.env.BASE_URL}shishuo-logo.png`} alt="" aria-hidden="true" /><span className="sr-only">师说</span></span></span></div></header>
    <main className="account-login page-frame">
      <section className="account-login-intro">
        <h1 id="account-heading">
          <span>让教学智慧，</span>
          <span>形成可复用的教学方法。</span>
        </h1>
        <p>把日常教学中的方法与经验，整理成清晰、可复用的教学方法。</p>
        <p>登录后可以在一个工作区里创建、检验并发布你的教学方法。</p>
      </section>
      <section className="account-login-panel" aria-labelledby="login-form-heading">
        <h2 id="login-form-heading">{register ? '注册教师账号' : '欢迎登录'}</h2>
        <form className="account-form" onSubmit={submit}>
          {register && <label className="account-field"><span>姓名</span><input autoComplete="name" value={name} onChange={e => setName(e.target.value)} required maxLength={30} disabled={busy} /></label>}
          <label className="account-field"><span>账号</span><input autoComplete="username" value={login} onChange={e => setLogin(e.target.value)} required minLength={3} maxLength={40} autoCapitalize="none" spellCheck={false} disabled={busy} aria-describedby={register ? 'account-format' : undefined} /></label>
          {register && <p id="account-format" className="account-hint">3–40 位字母、数字或 _ . @ -</p>}
          <label className="account-field"><span>密码</span><input type="password" autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} maxLength={128} disabled={busy} aria-describedby={register ? 'password-format' : undefined} /></label>
          {register && <p id="password-format" className="account-hint">至少 8 位</p>}
          {(error || initialError) && <p className="account-error" role="alert">{error || initialError}</p>}
          <Button type="submit" size="lg" disabled={busy}>{busy ? '正在处理…' : register ? '注册并登录' : '登录'}</Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => { setRegister(value => !value); setError(''); setPassword(''); }}>{register ? '返回登录' : '注册教师账号'}</Button>
        </form>
      </section>
    </main>
  </div>;
}
