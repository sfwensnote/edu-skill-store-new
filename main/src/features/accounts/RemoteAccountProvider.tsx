import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccountContext } from './AccountProvider';
import { LoginPage } from './LoginPage';
import type { AccountIdentity } from '../../../shared/local-accounts';
import { accountWorkspace } from '@/lib/account-workspace';
import { goTo } from '@/lib/routes';
import { api, failureMessage, serviceTokenKey } from '../execution/api';

export function RemoteAccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AccountIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState<AccountIdentity[]>([]);
  const failedWrites = useRef(new Set<string>());
  useEffect(() => {
    let disposed = false;
    async function refresh() {
      try {
        const result = await api<{ user: AccountIdentity | null }>('/auth/me');
        if (disposed) return;
        setAccount(result.user); setError('');
        if (!result.user) sessionStorage.removeItem(serviceTokenKey);
      } catch (error) { if (!disposed) setError(failureMessage(error)); }
      finally { if (!disposed) setLoading(false); }
    }
    void refresh(); window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => { disposed = true; window.removeEventListener('focus', refresh); window.clearInterval(timer); };
  }, []);
  const storage = useMemo(() => {
    if (!account) return null;
    const personal = accountWorkspace(localStorage, account.id);
    return { ...personal, get length() { return personal.length; }, setItem: (key: string, value: string) => {
      try { personal.setItem(key, value); failedWrites.current.delete(key); }
      catch (error) { failedWrites.current.add(key); throw error; }
    } };
  }, [account?.id]);
  async function refreshAccounts() { setAccounts(await api<AccountIdentity[]>('/auth/accounts')); }
  useEffect(() => { if (account?.role === 'admin') void refreshAccounts().catch(error => setError(failureMessage(error))); }, [account?.id]);
  async function authenticate(action: 'login' | 'register', login: string, password: string, name?: string) {
    const result = await api<{ user: AccountIdentity; token?: string }>(`/auth/${action}`, { login, password, name, transport: 'bearer' });
    if (!result.token) throw new Error('登录凭据未生成，请重试。');
    sessionStorage.setItem(serviceTokenKey, result.token);
    failedWrites.current.clear();
    setAccount(result.user); setError(''); goTo({ page: 'home' }, true);
  }
  if (loading) return <main className="page-frame"><p role="status">正在读取登录状态…</p></main>;
  if (!account || !storage) return <LoginPage initialError={error} onLogin={(login, password) => authenticate('login', login, password)}
    onRegister={(name, login, password) => authenticate('register', login, password, name)} />;
  return <AccountContext.Provider key={account.id} value={{ account, storage, accounts,
    logout: async () => {
      if (failedWrites.current.size) throw new Error('还有修改未保存，请保存成功后退出。');
      await api('/auth/logout', {}); sessionStorage.removeItem(serviceTokenKey); setAccount(null); goTo({ page: 'home' }, true);
    },
    setDisabled: async (id, disabled) => { await api(`/auth/accounts/${encodeURIComponent(id)}`, { disabled }, { method: 'PATCH' }); await refreshAccounts(); },
  }}>{children}</AccountContext.Provider>;
}
